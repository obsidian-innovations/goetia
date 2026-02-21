import type { ConnectionResult, NodeId, StrokeResult, SealGeometry, SealEdge } from './Types'
import { getDemon } from '../demons/DemonRegistry'
import {
  discreteFrechetDistance,
  normalizePathToUnitSpace,
  resamplePath,
  smoothPath,
} from './geometry'

// ─── Constants ────────────────────────────────────────────────────────────

/** Number of points to resample strokes and canonical paths to before comparison */
const RESAMPLE_N = 32

/**
 * Maximum Fréchet distance (in normalised [0,1] space) treated as a
 * perfect miss. Scores are linearly interpolated from 0 → this value.
 * Widened from 0.5 to accommodate finger-drawn stroke wobble.
 */
const MAX_FRECHET = 0.65

/** Minimum accuracy for a connection to be marked valid.
 *  Lowered from 0.25 to be more forgiving with touch input. */
const MIN_ACCURACY = 0.15

/** Moving-average radius applied to the resampled stroke to suppress
 *  high-frequency finger jitter before Fréchet comparison. */
const SMOOTH_RADIUS = 2

// ─── SealReconstructor ────────────────────────────────────────────────────

/**
 * Stateful engine class that evaluates a player's seal-tracing attempts
 * against the canonical geometry of a specific demon's seal.
 *
 * All stroke coordinates must be **normalised to [0, 1]** before being
 * passed in — normalisation is the canvas layer's responsibility.
 */
export class SealReconstructor {
  private readonly _geometry: SealGeometry
  /** Best ConnectionResult per edge key (sorted node ids joined by ':') */
  private readonly _completed: Map<string, ConnectionResult> = new Map()

  constructor(demonId: string) {
    const demon = getDemon(demonId)
    this._geometry = demon.sealGeometry
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Evaluates `stroke` as an attempt to trace the edge between `fromNode`
   * and `toNode`.  Returns a ConnectionResult regardless of whether the
   * attempt is valid; if valid, the best result for that edge is stored.
   */
  attemptConnection(
    fromNode: NodeId,
    toNode: NodeId,
    stroke: StrokeResult,
  ): ConnectionResult {
    const edge = this._findEdge(fromNode, toNode)

    if (!edge || stroke.pathPoints.length < 2) {
      return { fromNode, toNode, accuracy: 0, deviation: 1, valid: false }
    }

    // Prefer simplified points when enough are available
    const rawPts =
      stroke.simplifiedPoints.length >= 3
        ? stroke.simplifiedPoints
        : stroke.pathPoints

    // Resample stroke and canonical path to the same count, then smooth
    // the player's stroke to suppress finger jitter before comparison
    const strokeResampled = smoothPath(
      resamplePath(normalizePathToUnitSpace(rawPts), RESAMPLE_N),
      SMOOTH_RADIUS,
    )
    const canonicalResampled = resamplePath(
      normalizePathToUnitSpace(edge.canonicalPath),
      RESAMPLE_N,
    )

    // The player may draw an edge in either direction — take the better score
    const fwdDist = discreteFrechetDistance(strokeResampled, canonicalResampled)
    const revDist = discreteFrechetDistance(
      strokeResampled,
      [...canonicalResampled].reverse(),
    )
    const frechetDist = Math.min(fwdDist, revDist)

    const accuracy = Math.max(0, 1 - frechetDist / MAX_FRECHET)
    const deviation = frechetDist
    const valid = accuracy >= MIN_ACCURACY

    // Always report using the canonical node order stored on the edge
    const result: ConnectionResult = {
      fromNode: edge.fromNode,
      toNode: edge.toNode,
      accuracy,
      deviation,
      valid,
    }

    if (valid) {
      const key = this._edgeKey(edge.fromNode, edge.toNode)
      const existing = this._completed.get(key)
      if (!existing || accuracy > existing.accuracy) {
        this._completed.set(key, result)
      }
    }

    return result
  }

  /**
   * Returns the weighted accuracy sum across all completed edges.
   * Range [0, 1]; increases as more edges are successfully traced.
   */
  getSealIntegrity(): number {
    let total = 0
    for (const edge of this._geometry.edges) {
      const key = this._edgeKey(edge.fromNode, edge.toNode)
      const conn = this._completed.get(key)
      if (conn) {
        total += conn.accuracy * edge.weight
      }
    }
    return total
  }

  /** All successfully completed connections (best result per edge). */
  getCompletedConnections(): ConnectionResult[] {
    return Array.from(this._completed.values())
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _findEdge(from: NodeId, to: NodeId): SealEdge | undefined {
    return this._geometry.edges.find(
      e =>
        (e.fromNode === from && e.toNode === to) ||
        (e.fromNode === to && e.toNode === from),
    )
  }

  private _edgeKey(a: NodeId, b: NodeId): string {
    return [a as string, b as string].sort().join(':')
  }
}
