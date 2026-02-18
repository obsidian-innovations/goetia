import { describe, it, expect } from 'vitest';
import {
  normalizePathToUnitSpace,
  resamplePath,
  discreteFrechetDistance,
  pathLength,
  nearestPointIndex,
} from './geometry';
import type { Point } from './geometry';

// ─── normalizePathToUnitSpace ────────────────────────────────────────────────

describe('normalizePathToUnitSpace', () => {
  it('normalizes a horizontal line to [(0,0),(1,0)]', () => {
    const input: Point[] = [
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ];
    const result = normalizePathToUnitSpace(input);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[0].y).toBeCloseTo(0);
    expect(result[1].x).toBeCloseTo(1);
    expect(result[1].y).toBeCloseTo(0);
  });

  it('leaves a unit square unchanged', () => {
    const input: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const result = normalizePathToUnitSpace(input);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 1, y: 0 });
    expect(result[2]).toEqual({ x: 1, y: 1 });
    expect(result[3]).toEqual({ x: 0, y: 1 });
  });

  it('returns a single identical point unchanged', () => {
    const input: Point[] = [{ x: 42, y: 7 }];
    const result = normalizePathToUnitSpace(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 42, y: 7 });
  });

  it('returns empty array unchanged', () => {
    expect(normalizePathToUnitSpace([])).toEqual([]);
  });

  it('preserves aspect ratio for a tall rectangle', () => {
    // Width 1, height 2 — scale should be 2, so x spans 0..0.5, y spans 0..1
    const input: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    const result = normalizePathToUnitSpace(input);
    expect(result[1].x).toBeCloseTo(0.5);
    expect(result[2].y).toBeCloseTo(1);
  });
});

// ─── resamplePath ────────────────────────────────────────────────────────────

describe('resamplePath', () => {
  it('resamples a horizontal line to 5 evenly-spaced points', () => {
    const input: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const result = resamplePath(input, 5);
    expect(result).toHaveLength(5);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[1].x).toBeCloseTo(2.5);
    expect(result[2].x).toBeCloseTo(5);
    expect(result[3].x).toBeCloseTo(7.5);
    expect(result[4].x).toBeCloseTo(10);
    for (const p of result) expect(p.y).toBeCloseTo(0);
  });

  it('output always has exactly targetCount points', () => {
    const input: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];
    for (const count of [2, 5, 10, 100]) {
      expect(resamplePath(input, count)).toHaveLength(count);
    }
  });

  it('pads a single-point path to targetCount', () => {
    const result = resamplePath([{ x: 3, y: 7 }], 4);
    expect(result).toHaveLength(4);
    for (const p of result) {
      expect(p.x).toBeCloseTo(3);
      expect(p.y).toBeCloseTo(7);
    }
  });

  it('pads an empty path without crashing', () => {
    const result = resamplePath([], 3);
    expect(result).toHaveLength(3);
  });
});

// ─── discreteFrechetDistance ─────────────────────────────────────────────────

describe('discreteFrechetDistance', () => {
  it('returns 0 (or very close) for identical paths', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0 },
    ];
    expect(discreteFrechetDistance(path, path)).toBeCloseTo(0);
  });

  it('returns ~0.1 for parallel lines offset by 0.1', () => {
    const n = 10;
    const pathA: Point[] = Array.from({ length: n }, (_, i) => ({
      x: i / (n - 1),
      y: 0,
    }));
    const pathB: Point[] = Array.from({ length: n }, (_, i) => ({
      x: i / (n - 1),
      y: 0.1,
    }));
    const d = discreteFrechetDistance(pathA, pathB);
    expect(d).toBeCloseTo(0.1, 5);
  });

  it('returns 0 for an empty path', () => {
    const path: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(discreteFrechetDistance([], path)).toBe(0);
    expect(discreteFrechetDistance(path, [])).toBe(0);
    expect(discreteFrechetDistance([], [])).toBe(0);
  });
});

// ─── pathLength ──────────────────────────────────────────────────────────────

describe('pathLength', () => {
  it('returns 5 for a 3-4-5 right triangle leg', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];
    expect(pathLength(points)).toBeCloseTo(5);
  });

  it('returns 0 for a single point', () => {
    expect(pathLength([{ x: 1, y: 2 }])).toBe(0);
  });

  it('returns 0 for an empty array', () => {
    expect(pathLength([])).toBe(0);
  });

  it('sums multiple segments correctly', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(pathLength(points)).toBeCloseTo(2);
  });
});

// ─── nearestPointIndex ───────────────────────────────────────────────────────

describe('nearestPointIndex', () => {
  it('returns 0 for an empty array', () => {
    expect(nearestPointIndex([], { x: 0, y: 0 })).toBe(0);
  });

  it('returns the index of the closest point', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(nearestPointIndex(points, { x: 4, y: 0 })).toBe(1);
    expect(nearestPointIndex(points, { x: 9, y: 0 })).toBe(2);
    expect(nearestPointIndex(points, { x: -1, y: 0 })).toBe(0);
  });

  it('returns the first match when two points are equidistant', () => {
    const points: Point[] = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    // target at origin — both are distance 1; first wins
    expect(nearestPointIndex(points, { x: 0, y: 0 })).toBe(0);
  });
});
