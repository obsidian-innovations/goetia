import type { NodeId, StrokeResult, ConnectionResult, SealEdge } from './Types';
import { getDemon } from '../demons/DemonRegistry';
import { normalizePathToUnitSpace, resamplePath, discreteFrechetDistance } from './geometry';

// ─── Local types ────────────────────────────────────────────────────────────

type EdgeKey = string; // `${fromNodeId}::${toNodeId}`

interface ConnectionAttempt {
  edgeKey: EdgeKey;
  result: ConnectionResult;
}

interface SerializableReconstructorState {
  demonId: string;
  attempts: ConnectionAttempt[];
}

// ─── SealReconstructor ──────────────────────────────────────────────────────

export class SealReconstructor {
  private demonId: string;
  private edges: SealEdge[];
  private attempts: Map<EdgeKey, ConnectionAttempt>;

  constructor(demonId: string) {
    const demon = getDemon(demonId);
    this.demonId = demonId;
    this.edges = demon.sealGeometry.edges;
    this.attempts = new Map();
  }

  private makeEdgeKey(fromNodeId: NodeId, toNodeId: NodeId): EdgeKey {
    return `${fromNodeId}::${toNodeId}`;
  }

  private findEdge(fromNodeId: NodeId, toNodeId: NodeId): SealEdge | null {
    for (const edge of this.edges) {
      if (
        (edge.fromNode === fromNodeId && edge.toNode === toNodeId) ||
        (edge.fromNode === toNodeId && edge.toNode === fromNodeId)
      ) {
        return edge;
      }
    }
    return null;
  }

  private getComplexity(): 'simple' | 'complex' {
    return this.edges.length > 6 ? 'complex' : 'simple';
  }

  private getTolerance(): number {
    return this.getComplexity() === 'complex' ? 0.10 : 0.15;
  }

  attemptConnection(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    stroke: StrokeResult,
  ): ConnectionResult {
    const edge = this.findEdge(fromNodeId, toNodeId);

    if (edge === null) {
      const result: ConnectionResult = {
        fromNode: fromNodeId,
        toNode: toNodeId,
        accuracy: 0,
        deviation: 1,
        valid: false,
      };
      return result;
    }

    const drawnNorm = normalizePathToUnitSpace(stroke.simplifiedPoints);
    const canonNorm = normalizePathToUnitSpace(edge.canonicalPath);

    const drawnResampled = resamplePath(drawnNorm, 32);
    const canonResampled = resamplePath(canonNorm, 32);

    const frechet = discreteFrechetDistance(drawnResampled, canonResampled);

    const tolerance = this.getTolerance();
    const accuracy = Math.max(0, 1 - frechet / tolerance);

    const result: ConnectionResult = {
      fromNode: fromNodeId,
      toNode: toNodeId,
      accuracy: Math.round(accuracy * 1000) / 1000,
      deviation: Math.round(frechet * 1000) / 1000,
      valid: accuracy >= 0.4,
    };

    const key = this.makeEdgeKey(fromNodeId, toNodeId);
    this.attempts.set(key, { edgeKey: key, result });

    return result;
  }

  getSealIntegrity(): number {
    if (this.attempts.size === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const attempt of this.attempts.values()) {
      const edge = this.findEdge(attempt.result.fromNode, attempt.result.toNode);
      if (edge) {
        weightedSum += attempt.result.accuracy * edge.weight;
        totalWeight += edge.weight;
      }
    }

    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 1000) / 1000;
  }

  getCompletionRatio(): number {
    const validCount = Array.from(this.attempts.values()).filter(a => a.result.valid).length;
    return validCount / this.edges.length;
  }

  isComplete(): boolean {
    if (this.attempts.size < this.edges.length) return false;
    return Array.from(this.attempts.values()).every(a => a.result.valid);
  }

  getCompletedConnections(): ConnectionResult[] {
    return Array.from(this.attempts.values()).map(a => a.result);
  }

  getPartialState(): SerializableReconstructorState {
    return {
      demonId: this.demonId,
      attempts: Array.from(this.attempts.values()),
    };
  }

  static restoreFromState(state: SerializableReconstructorState): SealReconstructor {
    const reconstructor = new SealReconstructor(state.demonId);
    for (const attempt of state.attempts) {
      reconstructor.attempts.set(attempt.edgeKey, attempt);
    }
    return reconstructor;
  }
}
