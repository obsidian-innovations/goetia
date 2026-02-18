import type { Point, PointerInputEvent, StrokeResult } from './Types';

const DUPLICATE_THRESHOLD = 1; // pixels
const RDP_EPSILON = 3.0;
const PRESSURE_PROFILE_SAMPLES = 20;
const MIN_STROKE_LENGTH = 20; // pixels

export class StrokeEvaluator {
  private points: PointerInputEvent[] = [];

  addPoint(event: PointerInputEvent): void {
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dist = distance(last, event);
      if (dist < DUPLICATE_THRESHOLD) return;
    }

    const clamped: PointerInputEvent = {
      ...event,
      pressure: event.pressure === 0 ? 0.5 : Math.min(1, Math.max(0, event.pressure)),
    };

    this.points.push(clamped);
  }

  finalize(): StrokeResult {
    if (this.points.length === 0) {
      return emptyResult();
    }

    if (this.points.length === 1) {
      const p = { x: this.points[0].x, y: this.points[0].y };
      return {
        pathPoints: [p],
        simplifiedPoints: [p],
        averageVelocity: 0,
        pressureProfile: [this.points[0].pressure],
        curvature: [],
        duration: 0,
        startPoint: p,
        endPoint: p,
        totalLength: 0,
      };
    }

    if (this.points.length === 2) {
      const p0 = { x: this.points[0].x, y: this.points[0].y };
      const p1 = { x: this.points[1].x, y: this.points[1].y };
      const len = distance(this.points[0], this.points[1]);
      const dur = this.points[1].timestamp - this.points[0].timestamp;
      return {
        pathPoints: [p0, p1],
        simplifiedPoints: [p0, p1],
        averageVelocity: dur > 0 ? len / dur : 0,
        pressureProfile: samplePressure(this.points, PRESSURE_PROFILE_SAMPLES),
        curvature: [],
        duration: dur,
        startPoint: p0,
        endPoint: p1,
        totalLength: len,
      };
    }

    const pathPoints: Point[] = this.points.map((p) => ({ x: p.x, y: p.y }));
    const simplifiedPoints = StrokeEvaluator.rdpSimplify(pathPoints, RDP_EPSILON);

    const totalLength = computeTotalLength(pathPoints);
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    const duration = last.timestamp - first.timestamp;
    const averageVelocity = duration > 0 ? totalLength / duration : 0;

    const pressureProfile = samplePressure(this.points, PRESSURE_PROFILE_SAMPLES);
    const curvature = computeCurvature(simplifiedPoints);

    return {
      pathPoints,
      simplifiedPoints,
      averageVelocity,
      pressureProfile,
      curvature,
      duration,
      startPoint: pathPoints[0],
      endPoint: pathPoints[pathPoints.length - 1],
      totalLength,
    };
  }

  reset(): void {
    this.points = [];
  }

  getPointCount(): number {
    return this.points.length;
  }

  isMinimumLength(): boolean {
    return computeTotalLength(this.points) >= MIN_STROKE_LENGTH;
  }

  static rdpSimplify(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return [...points];

    let maxDist = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const d = perpendicularDistance(points[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIndex = i;
      }
    }

    if (maxDist > epsilon) {
      const left = StrokeEvaluator.rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
      const right = StrokeEvaluator.rdpSimplify(points.slice(maxIndex), epsilon);
      return left.slice(0, -1).concat(right);
    }

    return [first, last];
  }
}

function emptyResult(): StrokeResult {
  return {
    pathPoints: [],
    simplifiedPoints: [],
    averageVelocity: 0,
    pressureProfile: [],
    curvature: [],
    duration: 0,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 0 },
    totalLength: 0,
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(point, lineStart);

  const cross = Math.abs((point.x - lineStart.x) * dy - (point.y - lineStart.y) * dx);
  return cross / Math.sqrt(lenSq);
}

function computeTotalLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

function samplePressure(points: PointerInputEvent[], sampleCount: number): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0].pressure];

  // Build cumulative distance array
  const cumDist: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumDist.push(cumDist[i - 1] + distance(points[i - 1], points[i]));
  }
  const totalDist = cumDist[cumDist.length - 1];

  if (totalDist === 0) {
    // All points at same position — average pressure
    const avg = points.reduce((s, p) => s + p.pressure, 0) / points.length;
    return Array(sampleCount).fill(avg);
  }

  const profile: number[] = [];
  for (let s = 0; s < sampleCount; s++) {
    const targetDist = (s / (sampleCount - 1)) * totalDist;

    // Find the segment containing this distance
    let segIndex = 0;
    for (let i = 1; i < cumDist.length; i++) {
      if (cumDist[i] >= targetDist) {
        segIndex = i - 1;
        break;
      }
      segIndex = i - 1;
    }

    const segStart = cumDist[segIndex];
    const segEnd = cumDist[segIndex + 1];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    const p0 = points[segIndex].pressure;
    const p1 = points[segIndex + 1].pressure;
    profile.push(p0 + t * (p1 - p0));
  }

  return profile;
}

function computeCurvature(points: Point[]): number[] {
  if (points.length < 3) return [];

  const curvatures: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Direction vectors
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;

    const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
    const len2 = Math.sqrt(d2x * d2x + d2y * d2y);

    if (len1 === 0 || len2 === 0) {
      curvatures.push(0);
      continue;
    }

    // Cross product of normalized direction vectors, clamped to [-1, 1]
    const cross = (d1x / len1) * (d2y / len2) - (d1y / len1) * (d2x / len2);
    curvatures.push(Math.min(1, Math.max(-1, cross)));
  }

  return curvatures;
}
