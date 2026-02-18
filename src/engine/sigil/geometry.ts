// ─── Inline type ────────────────────────────────────────────────────────────

export type Point = { x: number; y: number };

// ─── normalizePathToUnitSpace ────────────────────────────────────────────────

/**
 * Translates and scales a path so that:
 *   - The minimum x and y are 0
 *   - The longer axis spans exactly 1.0
 * Aspect ratio is preserved.
 * If all points are identical, returns the array unchanged.
 */
export function normalizePathToUnitSpace(points: Point[]): Point[] {
  if (points.length === 0) return points;

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = Math.max(rangeX, rangeY);

  // All points are identical — return unchanged
  if (scale === 0) return points;

  return points.map((p) => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale,
  }));
}

// ─── resamplePath ────────────────────────────────────────────────────────────

/**
 * Resamples a polyline to exactly `targetCount` evenly-spaced points
 * using linear interpolation along cumulative arc length.
 * If `points` has fewer than 2 entries the path is padded with the last point.
 * `targetCount` must be >= 2.
 */
export function resamplePath(points: Point[], targetCount: number): Point[] {
  // Pad to at least 2 points
  let src = points.slice();
  if (src.length === 0) src = [{ x: 0, y: 0 }];
  while (src.length < 2) src.push({ ...src[src.length - 1] });

  // Build cumulative arc-length table
  const cumLen: number[] = [0];
  for (let i = 1; i < src.length; i++) {
    const dx = src[i].x - src[i - 1].x;
    const dy = src[i].y - src[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  const total = cumLen[cumLen.length - 1];
  const result: Point[] = [];

  for (let k = 0; k < targetCount; k++) {
    const target = (k / (targetCount - 1)) * total;

    // Find the segment that contains this arc-length position
    let lo = 0;
    let hi = cumLen.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] <= target) lo = mid;
      else hi = mid;
    }

    const segLen = cumLen[hi] - cumLen[lo];
    if (segLen === 0) {
      result.push({ ...src[lo] });
    } else {
      const t = (target - cumLen[lo]) / segLen;
      result.push({
        x: src[lo].x + t * (src[hi].x - src[lo].x),
        y: src[lo].y + t * (src[hi].y - src[lo].y),
      });
    }
  }

  return result;
}

// ─── discreteFrechetDistance ─────────────────────────────────────────────────

/**
 * Computes the discrete Fréchet distance between two paths using dynamic
 * programming. Both paths should be pre-normalized and resampled to equal
 * length. Returns 0 if either path is empty.
 */
export function discreteFrechetDistance(pathA: Point[], pathB: Point[]): number {
  const n = pathA.length;
  const m = pathB.length;
  if (n === 0 || m === 0) return 0;

  function dist(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  // Allocate n×m table
  const ca: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(-1));

  ca[0][0] = dist(pathA[0], pathB[0]);

  for (let i = 1; i < n; i++) {
    ca[i][0] = Math.max(ca[i - 1][0], dist(pathA[i], pathB[0]));
  }

  for (let j = 1; j < m; j++) {
    ca[0][j] = Math.max(ca[0][j - 1], dist(pathA[0], pathB[j]));
  }

  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      ca[i][j] = Math.max(
        Math.min(ca[i - 1][j], ca[i - 1][j - 1], ca[i][j - 1]),
        dist(pathA[i], pathB[j])
      );
    }
  }

  return ca[n - 1][m - 1];
}

// ─── pathLength ──────────────────────────────────────────────────────────────

/**
 * Returns the total Euclidean length of a polyline.
 * Returns 0 for fewer than 2 points.
 */
export function pathLength(points: Point[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ─── nearestPointIndex ───────────────────────────────────────────────────────

/**
 * Returns the index of the point in `points` closest to `target`.
 * Returns 0 if `points` is empty.
 */
export function nearestPointIndex(points: Point[], target: Point): number {
  if (points.length === 0) return 0;

  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - target.x;
    const dy = points[i].y - target.y;
    const d = dx * dx + dy * dy; // squared — sufficient for comparison
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// ─── signedArea ──────────────────────────────────────────────────────────────

/**
 * Computes the signed area of a polygon using the shoelace formula.
 * Positive = counterclockwise, negative = clockwise.
 * Returns 0 for fewer than 3 points.
 */
export function signedArea(points: Point[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

// ─── doesPathSelfIntersect ───────────────────────────────────────────────────

function direction(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = direction(c, d, a);
  const d2 = direction(c, d, b);
  const d3 = direction(a, b, c);
  const d4 = direction(a, b, d);
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true if any two non-adjacent segments of the path intersect.
 * Segments that share an endpoint are not counted as intersecting.
 * Returns false for fewer than 4 points.
 */
export function doesPathSelfIntersect(points: Point[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

// ─── fitCircle ───────────────────────────────────────────────────────────────

/**
 * Fits a circle to a set of points using the Kasa algebraic least-squares
 * method for 3+ points, which minimises algebraic distance and is robust to
 * duplicate endpoints. Falls back to the midpoint/centroid approach for fewer
 * than 3 points.
 * Returns { cx: 0, cy: 0, radius: 0 } for fewer than 2 points.
 */
export function fitCircle(points: Point[]): { cx: number; cy: number; radius: number } {
  if (points.length < 2) return { cx: 0, cy: 0, radius: 0 };

  if (points.length === 2) {
    const cx = (points[0].x + points[1].x) / 2;
    const cy = (points[0].y + points[1].y) / 2;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return { cx, cy, radius: Math.sqrt(dx * dx + dy * dy) / 2 };
  }

  // Kasa algebraic least-squares method.
  // Centre the data first to improve numerical conditioning.
  const n = points.length;
  let mx = 0, my = 0;
  for (const p of points) { mx += p.x; my += p.y; }
  mx /= n; my /= n;

  // Work in centred coordinates u = x - mx, v = y - my.
  // Solve A*u_i + B*v_i + C = u_i^2 + v_i^2 in least squares,
  // then centre = (mx + A/2, my + B/2), r = sqrt(A^2/4 + B^2/4 + C).
  let sU = 0, sV = 0, sUU = 0, sVV = 0, sUV = 0;
  let sUZ = 0, sVZ = 0, sZ = 0;
  for (const p of points) {
    const u = p.x - mx, v = p.y - my, z = u * u + v * v;
    sU += u; sV += v; sUU += u * u; sVV += v * v; sUV += u * v;
    sUZ += u * z; sVZ += v * z; sZ += z;
  }

  // det of [[sUU, sUV, sU], [sUV, sVV, sV], [sU, sV, n]]
  const det =
    sUU * (sVV * n - sV * sV) -
    sUV * (sUV * n - sV * sU) +
    sU  * (sUV * sV - sVV * sU);

  if (Math.abs(det) < 1e-10) {
    // Degenerate (e.g. all collinear) — fall back to centroid method
    let radius = 0;
    for (const p of points) radius += Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2);
    return { cx: mx, cy: my, radius: radius / n };
  }

  const A =
    (sUZ * (sVV * n - sV * sV) -
     sUV * (sVZ * n - sV * sZ) +
     sU  * (sVZ * sV - sVV * sZ)) / det;
  const B =
    (sUU * (sVZ * n - sV * sZ) -
     sUZ * (sUV * n - sV * sU) +
     sU  * (sUV * sZ - sVZ * sU)) / det;
  const C =
    (sUU * (sVV * sZ - sV * sVZ) -
     sUV * (sUV * sZ - sV * sUZ) +
     sUZ * (sUV * sV - sVV * sU)) / det;

  const cx = mx + A / 2;
  const cy = my + B / 2;
  const r2 = A * A / 4 + B * B / 4 + C;
  return { cx, cy, radius: r2 > 0 ? Math.sqrt(r2) : 0 };
}

// ─── pointDeviationFromCircle ─────────────────────────────────────────────────

/**
 * Returns the absolute difference between the point's distance from the circle
 * center and the circle's radius.
 */
export function pointDeviationFromCircle(
  p: Point,
  cx: number,
  cy: number,
  radius: number
): number {
  return Math.abs(Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) - radius);
}

// ─── rmsDeviation ────────────────────────────────────────────────────────────

/**
 * Returns the root mean square of an array of numbers.
 * Returns 0 for an empty array.
 */
export function rmsDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const sumSq = values.reduce((acc, v) => acc + v * v, 0);
  return Math.sqrt(sumSq / values.length);
}

// ─── standardDeviation ───────────────────────────────────────────────────────

/**
 * Returns the population standard deviation of an array.
 * Returns 0 for arrays with fewer than 2 elements.
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── pointAngleOnCircle ──────────────────────────────────────────────────────

/**
 * Returns the angle in radians of the point relative to the circle center,
 * in the range [0, 2π).
 */
export function pointAngleOnCircle(p: Point, cx: number, cy: number): number {
  let angle = Math.atan2(p.y - cy, p.x - cx);
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

// ─── isPathClosed ────────────────────────────────────────────────────────────

/**
 * Returns true if the distance between the first and last point is less than
 * thresholdRatio * pathLength(points).
 * Returns false for fewer than 2 points.
 */
export function isPathClosed(points: Point[], thresholdRatio: number = 0.15): boolean {
  if (points.length < 2) return false;
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const total = pathLength(points);
  return dist < thresholdRatio * total;
}
