import { describe, it, expect } from 'vitest';
import { BindingRingEvaluator } from './BindingRingEvaluator';
import type { StrokeResult } from './Types';

function makeCircleStroke(
  cx: number,
  cy: number,
  radius: number,
  pointCount: number,
  gapFraction: number = 0,
): StrokeResult {
  const endAngle = 2 * Math.PI * (1 - gapFraction);
  const points = Array.from({ length: pointCount }, (_, i) => {
    const angle = (i / (pointCount - 1)) * endAngle;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  return {
    pathPoints: points,
    simplifiedPoints: points,
    averageVelocity: 1,
    pressureProfile: new Array(20).fill(0.5),
    curvature: new Array(points.length).fill(0),
    duration: 500,
    startPoint: points[0],
    endPoint: points[points.length - 1],
    totalLength: 2 * Math.PI * radius * (1 - gapFraction),
  };
}

export { makeCircleStroke };

describe('BindingRingEvaluator', () => {
  it('computeCircularity returns high value for perfect circle', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64);
    const points = stroke.pathPoints;
    const result = (evaluator as any).computeCircularity(points, 200, 200, 100);
    expect(result).toBeGreaterThanOrEqual(0.90);
  });

  it('computeClosure returns high value for closed circle', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64, 0);
    const result = (evaluator as any).computeClosure(stroke.pathPoints, 100);
    expect(result).toBeGreaterThanOrEqual(0.90);
  });

  it('computeClosure returns low value for 15% gap', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64, 0.15);
    const result = (evaluator as any).computeClosure(stroke.pathPoints, 100);
    expect(result).toBeLessThan(0.70);
  });

  it('computeConsistency returns 0.7 for all-default pressure', () => {
    const evaluator = new BindingRingEvaluator();
    const result = (evaluator as any).computeConsistency(
      new Array(20).fill(0.5),
    );
    expect(result).toBe(0.7);
  });
});
