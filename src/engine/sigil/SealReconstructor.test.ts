import { describe, it, expect } from 'vitest';
import { getDemon } from '../demons/DemonRegistry';
import { SealReconstructor } from './SealReconstructor';
import type { NodeId, StrokeResult } from './Types';

// ─── Helper ─────────────────────────────────────────────────────────────────

function makeStrokeResult(points: { x: number; y: number }[]): StrokeResult {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  return {
    pathPoints: points,
    simplifiedPoints: points,
    averageVelocity: 0,
    pressureProfile: [],
    curvature: [],
    duration: 0,
    startPoint: start,
    endPoint: end,
    totalLength: 0,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SealReconstructor', () => {
  it('perfect canonical path returns accuracy >= 0.95', () => {
    const demon = getDemon('bael');
    const edge = demon.sealGeometry.edges[0];
    const reconstructor = new SealReconstructor('bael');
    const stroke = makeStrokeResult(edge.canonicalPath);
    const result = reconstructor.attemptConnection(
      edge.fromNode as NodeId,
      edge.toNode as NodeId,
      stroke,
    );
    expect(result.accuracy).toBeGreaterThanOrEqual(0.95);
    expect(result.valid).toBe(true);
  });

  it('non-existent edge returns invalid result', () => {
    const fakeId = 'nonexistent' as unknown as NodeId;
    const reconstructor = new SealReconstructor('bael');
    const stroke = makeStrokeResult([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    const result = reconstructor.attemptConnection(fakeId, fakeId, stroke);
    expect(result.valid).toBe(false);
    expect(result.accuracy).toBe(0);
  });

  it('integrity reflects weighted average', () => {
    const demon = getDemon('bael');
    const reconstructor = new SealReconstructor('bael');
    expect(reconstructor.getSealIntegrity()).toBe(0);
    const edge = demon.sealGeometry.edges[0];
    const stroke = makeStrokeResult(edge.canonicalPath);
    reconstructor.attemptConnection(
      edge.fromNode as NodeId,
      edge.toNode as NodeId,
      stroke,
    );
    expect(reconstructor.getSealIntegrity()).toBeGreaterThan(0);
  });

  it('partial state round-trips', () => {
    const demon = getDemon('bael');
    const reconstructor = new SealReconstructor('bael');
    const edge = demon.sealGeometry.edges[0];
    const stroke = makeStrokeResult(edge.canonicalPath);
    reconstructor.attemptConnection(
      edge.fromNode as NodeId,
      edge.toNode as NodeId,
      stroke,
    );
    const state = reconstructor.getPartialState();
    const restored = SealReconstructor.restoreFromState(state);
    expect(restored.getSealIntegrity()).toBeCloseTo(reconstructor.getSealIntegrity(), 3);
    expect(restored.getCompletedConnections().length).toBe(
      reconstructor.getCompletedConnections().length,
    );
  });

  it('isComplete() requires all edges valid', () => {
    const demon = getDemon('bael');
    const reconstructor = new SealReconstructor('bael');
    expect(reconstructor.isComplete()).toBe(false);
    for (const edge of demon.sealGeometry.edges) {
      const stroke = makeStrokeResult(edge.canonicalPath);
      reconstructor.attemptConnection(
        edge.fromNode as NodeId,
        edge.toNode as NodeId,
        stroke,
      );
    }
    expect(reconstructor.isComplete()).toBe(true);
  });
});
