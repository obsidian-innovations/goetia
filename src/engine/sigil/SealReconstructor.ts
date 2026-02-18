import type { NodeId, Point, StrokeResult, ConnectionResult, NodeConnection, SealGeometry } from './Types';
import { getDemon } from '@engine/demons';

// ── Typed error ──────────────────────────────────────────────────────

export class UnknownDemonError extends Error {
  readonly demonId: string;

  constructor(demonId: string) {
    super(`Unknown demon: "${demonId}"`);
    this.name = 'UnknownDemonError';
    this.demonId = demonId;
  }
}

// ── Persistence types ────────────────────────────────────────────────

export interface CompletedConnectionRecord {
  connectionIndex: number;
  accuracy: number;
  deviationMap: Record<number, number>;
}

export interface SealReconstructorState {
  demonId: string;
  completedConnections: CompletedConnectionRecord[];
}

// ── Geometry helpers ─────────────────────────────────────────────────

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function pathArcLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

/**
 * Minimum distance from point `p` to the nearest point on the polyline
 * defined by `segments`. Falls back to point-to-point distance for a
 * single-point polyline.
 */
function minDistToPolyline(p: Point, polyline: Point[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return distance(p, polyline[0]);

  let minDist = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      minDist = Math.min(minDist, distance(p, a));
      continue;
    }

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const proj: Point = { x: a.x + t * dx, y: a.y + t * dy };
    minDist = Math.min(minDist, distance(p, proj));
  }

  return minDist;
}

/**
 * Build a deviation map: for each drawn point at index `i`, record the
 * minimum distance from that point to the canonical polyline.
 */
function buildDeviationMap(drawn: Point[], canonical: Point[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (let i = 0; i < drawn.length; i++) {
    map[i] = minDistToPolyline(drawn[i], canonical);
  }
  return map;
}

// ── Discrete Fréchet distance ────────────────────────────────────────

/**
 * Compute the discrete Fréchet distance between two polylines P and Q.
 *
 * Uses the classic O(|P|·|Q|) dynamic programming algorithm. The result
 * is expressed in the same coordinate units as the input points (normalized
 * 0–1 for all seal geometry).
 *
 * Returns Infinity if either polyline is empty.
 */
function discreteFrechetDistance(P: Point[], Q: Point[]): number {
  const n = P.length;
  const m = Q.length;

  if (n === 0 || m === 0) return Infinity;

  // Flat array for the DP table (row-major, n rows × m columns).
  const ca = new Float64Array(n * m).fill(-1);

  function dp(i: number, j: number): number {
    const idx = i * m + j;
    if (ca[idx] >= 0) return ca[idx];

    const d = distance(P[i], Q[j]);

    let result: number;
    if (i === 0 && j === 0) {
      result = d;
    } else if (i === 0) {
      result = Math.max(dp(0, j - 1), d);
    } else if (j === 0) {
      result = Math.max(dp(i - 1, 0), d);
    } else {
      result = Math.max(Math.min(dp(i - 1, j), dp(i, j - 1), dp(i - 1, j - 1)), d);
    }

    ca[idx] = result;
    return result;
  }

  return dp(n - 1, m - 1);
}

// ── SealReconstructor ────────────────────────────────────────────────

export class SealReconstructor {
  private readonly demonId: string;
  private readonly geometry: SealGeometry;

  /** NodeId set by beginStroke; cleared after each evaluateStroke. */
  private pendingFromNodeId: NodeId | null = null;

  /** Map from connection index → completed record. Last attempt wins. */
  private readonly completed = new Map<number, CompletedConnectionRecord>();

  constructor(demonId: string) {
    const demon = getDemon(demonId);
    if (!demon) {
      throw new UnknownDemonError(demonId);
    }
    this.demonId = demonId;
    this.geometry = demon.sealGeometry;
  }

  /**
   * Record the node from which the next stroke begins.
   * Must be called before evaluateStroke.
   */
  beginStroke(fromNodeId: NodeId): void {
    this.pendingFromNodeId = fromNodeId;
  }

  /**
   * Compare the drawn stroke against the expected path for the connection
   * (pendingFromNodeId → toNodeId) and return a ConnectionResult.
   *
   * Accuracy = clamp(1 − discreteFréchet(drawn, canonical), 0, 1).
   * Valid = the Fréchet distance is within tolerance.maxDeviation.
   *
   * If no matching connection exists in the seal geometry, returns a
   * synthetic result with accuracy 0 and valid false.
   *
   * Throws if beginStroke has not been called since the last evaluateStroke.
   */
  evaluateStroke(result: StrokeResult, toNodeId: NodeId): ConnectionResult {
    if (this.pendingFromNodeId === null) {
      throw new Error('beginStroke must be called before evaluateStroke');
    }

    const fromNodeId = this.pendingFromNodeId;
    this.pendingFromNodeId = null;

    const connectionIndex = this.geometry.connections.findIndex(
      (c) => c.fromNode === fromNodeId && c.toNode === toNodeId,
    );

    if (connectionIndex === -1) {
      // No matching connection — synthesise a minimal invalid result.
      const synthetic: NodeConnection = {
        fromNode: fromNodeId,
        toNode: toNodeId,
        expectedPath: [result.startPoint, result.endPoint],
        tolerance: { maxDeviation: 0.08, maxAngularError: 15 },
      };
      return {
        attempted: synthetic,
        accuracy: 0,
        deviationMap: buildDeviationMap(result.pathPoints, synthetic.expectedPath),
        valid: false,
      };
    }

    const connection = this.geometry.connections[connectionIndex];
    const frechet = discreteFrechetDistance(result.pathPoints, connection.expectedPath);
    const accuracy = Math.max(0, Math.min(1, 1 - frechet));
    const valid = frechet <= connection.tolerance.maxDeviation;
    const deviationMap = buildDeviationMap(result.pathPoints, connection.expectedPath);

    const record: CompletedConnectionRecord = { connectionIndex, accuracy, deviationMap };
    this.completed.set(connectionIndex, record);

    return { attempted: connection, accuracy, deviationMap, valid };
  }

  /**
   * Weighted mean accuracy across ALL connections in the seal geometry.
   * Completed connections contribute their measured accuracy; missing
   * connections contribute 0. Weight = canonical path arc length (longer
   * paths carry more importance). Returns 0 when the geometry is empty.
   */
  getSealIntegrity(): number {
    if (this.geometry.connections.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let idx = 0; idx < this.geometry.connections.length; idx++) {
      const conn = this.geometry.connections[idx];
      const weight = Math.max(pathArcLength(conn.expectedPath), Number.EPSILON);
      const accuracy = this.completed.get(idx)?.accuracy ?? 0;
      weightedSum += accuracy * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /** Returns true when every connection in the seal geometry is completed. */
  isComplete(): boolean {
    return this.completed.size === this.geometry.connections.length;
  }

  /**
   * Return a plain-object snapshot of evaluation progress.
   * Safe to pass through JSON.stringify / JSON.parse.
   */
  getPartialState(): SealReconstructorState {
    return {
      demonId: this.demonId,
      completedConnections: Array.from(this.completed.values()),
    };
  }

  /**
   * Reconstruct a SealReconstructor from a previously serialised state.
   * Throws UnknownDemonError if the demon id is no longer in the registry.
   */
  static restoreFromState(state: SealReconstructorState): SealReconstructor {
    const reconstructor = new SealReconstructor(state.demonId);
    for (const record of state.completedConnections) {
      reconstructor.completed.set(record.connectionIndex, record);
    }
    return reconstructor;
  }
}
