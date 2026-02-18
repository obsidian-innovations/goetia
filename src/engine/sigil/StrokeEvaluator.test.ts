import { StrokeEvaluator } from './StrokeEvaluator';
import type { TouchEvent } from './Types';

// ── helpers ─────────────────────────────────────────────────────────

function makeTouchEvent(
  x: number,
  y: number,
  timestamp: number,
  pressure = 0.6,
): TouchEvent {
  return { x, y, timestamp, pressure };
}

/** Generate evenly-spaced points along a straight line. */
function straightLine(
  count: number,
  options: { pressure?: number } = {},
): TouchEvent[] {
  const events: TouchEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push(
      makeTouchEvent(i * 10, i * 10, i * 16, options.pressure ?? 0.6),
    );
  }
  return events;
}

/** Generate points along a circle (center 100,100  radius 50). */
function circleStroke(count: number): TouchEvent[] {
  const cx = 100;
  const cy = 100;
  const r = 50;
  const events: TouchEvent[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    events.push(
      makeTouchEvent(
        cx + r * Math.cos(angle),
        cy + r * Math.sin(angle),
        i * 16,
        0.7,
      ),
    );
  }
  return events;
}

// ── tests ───────────────────────────────────────────────────────────

describe('StrokeEvaluator', () => {
  let evaluator: StrokeEvaluator;

  beforeEach(() => {
    evaluator = new StrokeEvaluator();
  });

  // 1. Straight line → near-zero curvature
  it('straight line produces near-zero curvature', () => {
    for (const e of straightLine(30)) evaluator.addPoint(e);
    const result = evaluator.finalize();

    expect(Math.abs(result.curvature)).toBeLessThan(0.01);
    expect(result.pathPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.duration).toBeGreaterThan(0);
  });

  // 2. Circle stroke → consistent non-zero curvature
  it('circle stroke produces consistent curvature', () => {
    for (const e of circleStroke(64)) evaluator.addPoint(e);
    const result = evaluator.finalize();

    // A circle traced counter-clockwise produces positive signed curvature.
    expect(Math.abs(result.curvature)).toBeGreaterThan(0.01);
    expect(result.pressureProfile).toHaveLength(20);
  });

  // 3. Short stroke (< 10 points) still yields a valid StrokeResult
  it('short stroke under 10 points still produces valid result', () => {
    const points = straightLine(5);
    for (const e of points) evaluator.addPoint(e);
    const result = evaluator.finalize();

    expect(result.pathPoints.length).toBeGreaterThanOrEqual(2);
    expect(result.averageVelocity).toBeGreaterThanOrEqual(0);
    expect(result.pressureProfile).toHaveLength(20);
    expect(result.startPoint).toEqual({ x: points[0].x, y: points[0].y });
    expect(result.endPoint).toEqual({
      x: points[points.length - 1].x,
      y: points[points.length - 1].y,
    });
    expect(result.duration).toBe(
      points[points.length - 1].timestamp - points[0].timestamp,
    );
  });

  // 4. reset() clears all state
  it('reset clears all state correctly', () => {
    for (const e of straightLine(20)) evaluator.addPoint(e);
    evaluator.reset();

    // After reset, finalize with no points should throw.
    expect(() => evaluator.finalize()).toThrow('Cannot finalize an empty stroke');

    // Feed fresh data and verify it works independently.
    const fresh = circleStroke(16);
    for (const e of fresh) evaluator.addPoint(e);
    const result = evaluator.finalize();

    expect(result.startPoint).toEqual({ x: fresh[0].x, y: fresh[0].y });
    expect(result.pressureProfile).toHaveLength(20);
  });

  // 5. Pressure defaults to 0.5 when device reports 0
  it('pressure defaults to 0.5 when device does not support pressure', () => {
    const events = straightLine(20, { pressure: 0 });
    for (const e of events) evaluator.addPoint(e);
    const result = evaluator.finalize();

    // Every sample in the profile should be 0.5 (the default).
    for (const p of result.pressureProfile) {
      expect(p).toBeCloseTo(0.5, 5);
    }
  });

  // ── additional sanity checks ────────────────────────────────────

  it('single point produces zero velocity and zero duration', () => {
    evaluator.addPoint(makeTouchEvent(50, 50, 100, 0.8));
    const result = evaluator.finalize();

    expect(result.averageVelocity).toBe(0);
    expect(result.duration).toBe(0);
    expect(result.pathPoints).toHaveLength(1);
    expect(result.pressureProfile).toHaveLength(20);
  });

  it('velocity is positive for a moving stroke', () => {
    for (const e of straightLine(30)) evaluator.addPoint(e);
    const result = evaluator.finalize();

    expect(result.averageVelocity).toBeGreaterThan(0);
  });
});
