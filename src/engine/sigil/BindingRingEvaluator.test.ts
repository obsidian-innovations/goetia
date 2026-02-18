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

  it('perfect circle produces no weak points', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64);
    const points = stroke.pathPoints;
    const result = (evaluator as any).computeWeakPoints(
      points, 200, 200, 100
    );
    expect(result.length).toBe(0);
  });

  it('jagged region produces weak points', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64);
    const jagged = stroke.pathPoints.map((p, i) => {
      if (i >= 45 && i <= 55) {
        const dx = p.x - 200;
        const dy = p.y - 200;
        return { x: 200 + dx * 1.6, y: 200 + dy * 1.6 };
      }
      return p;
    });
    const result = (evaluator as any).computeWeakPoints(
      jagged, 200, 200, 100
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('all weak point angles are in range [0, 2π)', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64);
    const jagged = stroke.pathPoints.map((p, i) => {
      if (i >= 20 && i <= 25) {
        return { x: p.x * 1.5, y: p.y * 1.5 };
      }
      return p;
    });
    const result = (evaluator as any).computeWeakPoints(
      jagged, 200, 200, 100
    );
    for (const wp of result) {
      expect(wp.startAngle).toBeGreaterThanOrEqual(0);
      expect(wp.endAngle).toBeLessThanOrEqual(2 * Math.PI + 0.01);
    }
  });

  it('evaluate() perfect circle returns strong result', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(200, 200, 100, 64, 0);
    const result = evaluator.evaluate(stroke);
    expect(result.circularity).toBeGreaterThanOrEqual(0.90);
    expect(result.closure).toBeGreaterThanOrEqual(0.90);
    expect(result.overallStrength).toBeGreaterThanOrEqual(0.85);
    expect(result.center.x).toBeCloseTo(200, 0);
    expect(result.center.y).toBeCloseTo(200, 0);
    expect(result.radius).toBeCloseTo(100, 0);
  });

  it('evaluate() circle with gap returns lower strength', () => {
    const evaluator = new BindingRingEvaluator();
    const closed = makeCircleStroke(200, 200, 100, 64, 0);
    const gapped = makeCircleStroke(200, 200, 100, 64, 0.20);
    const closedResult = evaluator.evaluate(closed);
    const gappedResult = evaluator.evaluate(gapped);
    expect(closedResult.overallStrength).toBeGreaterThan(gappedResult.overallStrength);
  });

  it('evaluate() fewer than 3 points returns empty result', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke: StrokeResult = {
      pathPoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      simplifiedPoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      averageVelocity: 0,
      pressureProfile: new Array(20).fill(0.5),
      curvature: [],
      duration: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
      totalLength: 0,
    };
    const result = evaluator.evaluate(stroke);
    expect(result.overallStrength).toBe(0);
    expect(result.radius).toBe(0);
    expect(result.weakPoints).toHaveLength(0);
  });

  it('evaluate() returns valid RingResult shape', () => {
    const evaluator = new BindingRingEvaluator();
    const stroke = makeCircleStroke(150, 150, 80, 48, 0);
    const result = evaluator.evaluate(stroke);
    expect(typeof result.circularity).toBe('number');
    expect(typeof result.closure).toBe('number');
    expect(typeof result.consistency).toBe('number');
    expect(typeof result.overallStrength).toBe('number');
    expect(Array.isArray(result.weakPoints)).toBe(true);
    expect(typeof result.center.x).toBe('number');
    expect(typeof result.center.y).toBe('number');
    expect(typeof result.radius).toBe('number');
  });
});
