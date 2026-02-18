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
