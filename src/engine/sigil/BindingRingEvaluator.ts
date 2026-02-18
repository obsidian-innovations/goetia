import type { StrokeResult, RingResult, RingWeakPoint, Point } from './Types';
import {
  fitCircle,
  pointDeviationFromCircle,
  rmsDeviation,
  standardDeviation,
  pointAngleOnCircle,
} from './geometry';

export class BindingRingEvaluator {
  private emptyResult(): RingResult {
    return {
      circularity: 0,
      closure: 0,
      consistency: 0,
      overallStrength: 0,
      weakPoints: [],
      center: { x: 0, y: 0 },
      radius: 0,
    };
  }

  private computeCircularity(
    points: Point[],
    cx: number,
    cy: number,
    radius: number,
  ): number {
    const deviations = points.map((p) =>
      pointDeviationFromCircle(p, cx, cy, radius),
    );
    const rms = rmsDeviation(deviations);
    return Math.max(0, 1 - rms / radius);
  }

  private computeClosure(points: Point[], radius: number): number {
    const start = points[0];
    const end = points[points.length - 1];
    const gap = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const diameter = 2 * radius;
    return Math.max(0, 1 - gap / diameter);
  }

  private computeConsistency(pressureProfile: number[]): number {
    const allDefault = pressureProfile.every((v) => Math.abs(v - 0.5) < 0.01);
    if (allDefault) return 0.7;
    const stdDev = standardDeviation(pressureProfile);
    return Math.max(0, 1 - stdDev * 4);
  }

  private computeWeakPoints(
    points: Point[],
    cx: number,
    cy: number,
    radius: number,
  ): RingWeakPoint[] {
    const SEGMENT_COUNT = 16;
    const segmentSize = (2 * Math.PI) / SEGMENT_COUNT;

    const deviations = points.map((p) =>
      pointDeviationFromCircle(p, cx, cy, radius),
    );

    const buckets: number[][] = Array.from(
      { length: SEGMENT_COUNT },
      () => [],
    );
    for (let i = 0; i < points.length; i++) {
      const angle = pointAngleOnCircle(points[i], cx, cy);
      const segIdx = Math.min(
        Math.floor(angle / segmentSize),
        SEGMENT_COUNT - 1,
      );
      buckets[segIdx].push(deviations[i]);
    }

    const segmentMeans = buckets.map((bucket) => {
      if (bucket.length === 0) return 0;
      return bucket.reduce((a, b) => a + b, 0) / bucket.length;
    });

    const overallMean =
      deviations.reduce((a, b) => a + b, 0) / deviations.length;

    const NOISE_FLOOR = 1e-9;
    const weakPoints: RingWeakPoint[] = [];
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      if (
        buckets[i].length > 0 &&
        segmentMeans[i] > 1.5 * overallMean &&
        segmentMeans[i] > NOISE_FLOOR
      ) {
        weakPoints.push({
          startAngle: i * segmentSize,
          endAngle: (i + 1) * segmentSize,
          strength: segmentMeans[i] / radius,
        });
      }
    }

    return weakPoints;
  }

  evaluate(stroke: StrokeResult): RingResult {
    if (stroke.pathPoints.length < 2) return this.emptyResult();

    const { cx, cy, radius } = fitCircle(stroke.pathPoints);
    const circularity = this.computeCircularity(stroke.pathPoints, cx, cy, radius);
    const closure = this.computeClosure(stroke.pathPoints, radius);
    const consistency = this.computeConsistency(stroke.pressureProfile);

    // Placeholder weak-point detection; full scan via pointAngleOnCircle to be implemented
    const gapStartAngle = pointAngleOnCircle(
      stroke.pathPoints[stroke.pathPoints.length - 1],
      cx,
      cy,
    );
    const gapEndAngle = pointAngleOnCircle(stroke.pathPoints[0], cx, cy);
    const weakPoints: RingWeakPoint[] =
      closure < 1 ? [{ startAngle: gapStartAngle, endAngle: gapEndAngle, strength: closure }] : [];

    return {
      circularity,
      closure,
      consistency,
      overallStrength: 0,
      weakPoints,
      center: { x: cx, y: cy },
      radius,
    };
  }
}
