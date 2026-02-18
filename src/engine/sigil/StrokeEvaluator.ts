import type { TouchEvent, Point, StrokeResult } from './Types';

const RDP_EPSILON = 2.0;
const VELOCITY_WINDOW = 5;
const PRESSURE_SAMPLES = 20;
const DEFAULT_PRESSURE = 0.5;

// ── Geometry helpers ────────────────────────────────────────────────

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Perpendicular distance from `point` to the line through `a` and `b`. */
function perpendicularDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return distance(point, a);

  const area = Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x);
  return area / Math.sqrt(lenSq);
}

// ── Ramer-Douglas-Peucker path simplification ───────────────────────

function simplifyPath(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points.slice();

  const start = points[0];
  const end = points[points.length - 1];

  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPath(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

// ── Cumulative arc-length helper ────────────────────────────────────

function cumulativeArcLengths(points: { x: number; y: number }[]): number[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  }
  return lengths;
}

// ── Normalize pressure ──────────────────────────────────────────────

function normalizePressure(raw: number): number {
  // Devices that do not report pressure send 0; fall back to 0.5.
  if (raw === 0 || !Number.isFinite(raw)) return DEFAULT_PRESSURE;
  return raw;
}

// ── StrokeEvaluator ─────────────────────────────────────────────────

export class StrokeEvaluator {
  private points: TouchEvent[] = [];

  /** Feed a new touch event into the evaluator. */
  addPoint(event: TouchEvent): void {
    this.points.push({
      ...event,
      pressure: normalizePressure(event.pressure),
    });
  }

  /** Compute the final StrokeResult from all collected points. */
  finalize(): StrokeResult {
    if (this.points.length === 0) {
      throw new Error('Cannot finalize an empty stroke');
    }

    const raw: Point[] = this.points.map((p) => ({ x: p.x, y: p.y }));
    const simplified = simplifyPath(raw, RDP_EPSILON);

    return {
      pathPoints: simplified,
      averageVelocity: this.computeAverageVelocity(),
      pressureProfile: this.samplePressureProfile(),
      curvature: this.computeAverageCurvature(simplified),
      duration:
        this.points[this.points.length - 1].timestamp -
        this.points[0].timestamp,
      startPoint: { x: this.points[0].x, y: this.points[0].y },
      endPoint: {
        x: this.points[this.points.length - 1].x,
        y: this.points[this.points.length - 1].y,
      },
    };
  }

  /** Clear all internal state so the evaluator can be reused. */
  reset(): void {
    this.points = [];
  }

  // ── velocity ────────────────────────────────────────────────────

  /**
   * Compute average velocity using a rolling window of VELOCITY_WINDOW
   * instantaneous velocities.  The returned value is the mean of all
   * smoothed samples.
   */
  private computeAverageVelocity(): number {
    if (this.points.length < 2) return 0;

    const instantaneous: number[] = [];
    for (let i = 1; i < this.points.length; i++) {
      const dt = this.points[i].timestamp - this.points[i - 1].timestamp;
      if (dt > 0) {
        instantaneous.push(distance(this.points[i - 1], this.points[i]) / dt);
      }
    }
    if (instantaneous.length === 0) return 0;

    // Smooth with a rolling average window, then take the grand mean.
    let sum = 0;
    for (let i = 0; i < instantaneous.length; i++) {
      const windowStart = Math.max(0, i - VELOCITY_WINDOW + 1);
      let windowSum = 0;
      for (let j = windowStart; j <= i; j++) {
        windowSum += instantaneous[j];
      }
      sum += windowSum / (i - windowStart + 1);
    }
    return sum / instantaneous.length;
  }

  // ── pressure profile ────────────────────────────────────────────

  /**
   * Resample pressure at PRESSURE_SAMPLES equally-spaced arc-length
   * intervals along the raw stroke, linearly interpolating between
   * neighbouring input points.
   */
  private samplePressureProfile(): number[] {
    if (this.points.length <= 1) {
      const value = this.points.length === 1 ? this.points[0].pressure : DEFAULT_PRESSURE;
      return new Array(PRESSURE_SAMPLES).fill(value);
    }

    const arcLens = cumulativeArcLengths(this.points);
    const totalLen = arcLens[arcLens.length - 1];

    if (totalLen === 0) {
      return new Array(PRESSURE_SAMPLES).fill(this.points[0].pressure);
    }

    const profile: number[] = [];

    for (let s = 0; s < PRESSURE_SAMPLES; s++) {
      const target = (s / (PRESSURE_SAMPLES - 1)) * totalLen;

      // Binary-ish walk to find bracketing segment.
      let j = 0;
      while (j < arcLens.length - 2 && arcLens[j + 1] < target) j++;

      const segLen = arcLens[j + 1] - arcLens[j];
      const t = segLen > 0 ? (target - arcLens[j]) / segLen : 0;
      const pressure =
        this.points[j].pressure +
        t * (this.points[j + 1].pressure - this.points[j].pressure);
      profile.push(pressure);
    }

    return profile;
  }

  // ── curvature ───────────────────────────────────────────────────

  /**
   * Signed curvature at each interior simplified point via the cross
   * product of adjacent direction vectors:
   *
   *   κ = (v1 × v2) / (|v1| · |v2|)
   *
   * Returns the mean of all per-point curvatures.
   */
  private computeAverageCurvature(simplified: Point[]): number {
    if (simplified.length < 3) return 0;

    let sum = 0;
    let count = 0;

    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = simplified[i - 1];
      const curr = simplified[i];
      const next = simplified[i + 1];

      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;

      const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const m2 = Math.sqrt(v2x * v2x + v2y * v2y);

      if (m1 > 0 && m2 > 0) {
        const cross = v1x * v2y - v1y * v2x;
        sum += cross / (m1 * m2);
      }
      count++;
    }

    return count > 0 ? sum / count : 0;
  }
}
