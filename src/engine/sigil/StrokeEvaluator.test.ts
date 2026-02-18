import { describe, it, expect, beforeEach } from 'vitest';
import { StrokeEvaluator } from './StrokeEvaluator';
import type { PointerInputEvent } from './Types';

function makeEvent(
  x: number,
  y: number,
  timestamp: number,
  pressure = 0.7,
): PointerInputEvent {
  return { x, y, pressure, timestamp, pointerId: 1 };
}

describe('StrokeEvaluator', () => {
  let evaluator: StrokeEvaluator;

  beforeEach(() => {
    evaluator = new StrokeEvaluator();
  });

  describe('straight line produces near-zero curvature', () => {
    it('should have curvature values all near zero for a straight line', () => {
      // 10 points along y = x
      for (let i = 0; i < 10; i++) {
        evaluator.addPoint(makeEvent(i * 20, i * 20, i * 100));
      }

      const result = evaluator.finalize();

      expect(result.simplifiedPoints.length).toBeGreaterThanOrEqual(2);
      for (const c of result.curvature) {
        expect(Math.abs(c)).toBeLessThan(0.01);
      }
    });
  });

  describe('circular arc produces consistent non-zero curvature', () => {
    it('should have non-zero curvature values with consistent sign', () => {
      // Quarter-circle arc with enough points that RDP keeps interior points
      const numPoints = 40;
      const radius = 100;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / (numPoints - 1)) * (Math.PI / 2);
        evaluator.addPoint(
          makeEvent(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            i * 50,
          ),
        );
      }

      const result = evaluator.finalize();

      expect(result.curvature.length).toBeGreaterThan(0);
      // All curvature values should be non-zero and have the same sign
      const signs = result.curvature.map((c) => Math.sign(c));
      const firstSign = signs[0];
      expect(firstSign).not.toBe(0);
      for (const s of signs) {
        expect(s).toBe(firstSign);
      }
      // Magnitudes should be meaningfully non-zero
      for (const c of result.curvature) {
        expect(Math.abs(c)).toBeGreaterThan(0.01);
      }
    });
  });

  describe('fewer than 3 points produces a valid but minimal StrokeResult', () => {
    it('should return empty result for zero points', () => {
      const result = evaluator.finalize();

      expect(result.pathPoints).toHaveLength(0);
      expect(result.simplifiedPoints).toHaveLength(0);
      expect(result.curvature).toHaveLength(0);
      expect(result.totalLength).toBe(0);
      expect(result.averageVelocity).toBe(0);
      expect(result.duration).toBe(0);
    });

    it('should return single-point result for one point', () => {
      evaluator.addPoint(makeEvent(50, 50, 1000));
      const result = evaluator.finalize();

      expect(result.pathPoints).toHaveLength(1);
      expect(result.simplifiedPoints).toHaveLength(1);
      expect(result.curvature).toHaveLength(0);
      expect(result.totalLength).toBe(0);
      expect(result.startPoint).toEqual({ x: 50, y: 50 });
      expect(result.endPoint).toEqual({ x: 50, y: 50 });
    });

    it('should return two-point result for two points', () => {
      evaluator.addPoint(makeEvent(0, 0, 0));
      evaluator.addPoint(makeEvent(30, 40, 500));
      const result = evaluator.finalize();

      expect(result.pathPoints).toHaveLength(2);
      expect(result.simplifiedPoints).toHaveLength(2);
      expect(result.curvature).toHaveLength(0);
      expect(result.totalLength).toBeCloseTo(50, 1);
      expect(result.duration).toBe(500);
      expect(result.averageVelocity).toBeCloseTo(0.1, 2);
    });
  });

  describe('reset() clears all state', () => {
    it('should produce empty result after reset', () => {
      // Add some points
      for (let i = 0; i < 5; i++) {
        evaluator.addPoint(makeEvent(i * 10, i * 10, i * 100));
      }
      expect(evaluator.getPointCount()).toBe(5);

      evaluator.reset();

      expect(evaluator.getPointCount()).toBe(0);

      const result = evaluator.finalize();
      expect(result.pathPoints).toHaveLength(0);
      expect(result.simplifiedPoints).toHaveLength(0);
      expect(result.totalLength).toBe(0);
      expect(result.curvature).toHaveLength(0);
      expect(result.pressureProfile).toHaveLength(0);
    });
  });

  describe('pressure defaults to 0.5 when all inputs have pressure 0', () => {
    it('should set pressure to 0.5 for zero-pressure events', () => {
      for (let i = 0; i < 10; i++) {
        evaluator.addPoint(makeEvent(i * 20, 0, i * 100, 0));
      }

      const result = evaluator.finalize();

      // All pressure profile values should be 0.5
      for (const p of result.pressureProfile) {
        expect(p).toBeCloseTo(0.5, 5);
      }
    });
  });

  describe('RDP simplification reduces a 100-point straight line to 2 points', () => {
    it('should simplify collinear points down to endpoints', () => {
      // 100 points along a perfectly straight line
      for (let i = 0; i < 100; i++) {
        evaluator.addPoint(makeEvent(i * 5, i * 3, i * 10));
      }

      const result = evaluator.finalize();

      expect(result.pathPoints).toHaveLength(100);
      expect(result.simplifiedPoints).toHaveLength(2);
      expect(result.simplifiedPoints[0]).toEqual({ x: 0, y: 0 });
      expect(result.simplifiedPoints[1]).toEqual({
        x: 99 * 5,
        y: 99 * 3,
      });
    });
  });

  describe('duplicate point filtering', () => {
    it('should ignore points closer than 1px', () => {
      evaluator.addPoint(makeEvent(10, 10, 0));
      evaluator.addPoint(makeEvent(10.3, 10.3, 50));
      evaluator.addPoint(makeEvent(10.5, 10.5, 100));
      evaluator.addPoint(makeEvent(50, 50, 200));

      expect(evaluator.getPointCount()).toBe(2);
    });
  });

  describe('isMinimumLength', () => {
    it('should return false for short strokes', () => {
      evaluator.addPoint(makeEvent(0, 0, 0));
      evaluator.addPoint(makeEvent(5, 5, 100));

      expect(evaluator.isMinimumLength()).toBe(false);
    });

    it('should return true for strokes exceeding 20px', () => {
      evaluator.addPoint(makeEvent(0, 0, 0));
      evaluator.addPoint(makeEvent(0, 25, 100));

      expect(evaluator.isMinimumLength()).toBe(true);
    });
  });

  describe('pressure clamping', () => {
    it('should clamp pressure values above 1 to 1', () => {
      evaluator.addPoint(makeEvent(0, 0, 0, 1.5));
      evaluator.addPoint(makeEvent(30, 40, 500, 0.8));

      const result = evaluator.finalize();
      // First sample should be clamped to 1.0
      expect(result.pressureProfile[0]).toBe(1);
    });
  });

  describe('pressureProfile has correct sample count', () => {
    it('should produce exactly 20 samples for a multi-point stroke', () => {
      for (let i = 0; i < 30; i++) {
        evaluator.addPoint(makeEvent(i * 10, 0, i * 100));
      }

      const result = evaluator.finalize();
      expect(result.pressureProfile).toHaveLength(20);
    });
  });
});
