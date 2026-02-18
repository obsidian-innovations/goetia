import { SealReconstructor, UnknownDemonError } from './SealReconstructor';
import type { Point, StrokeResult, NodeId } from './Types';

// ── helpers ──────────────────────────────────────────────────────────

function nid(id: string): NodeId {
  return id as NodeId;
}

/**
 * Build a minimal StrokeResult whose pathPoints are exactly the provided
 * points. All other fields are set to innocuous defaults.
 */
function makeStrokeResult(points: Point[]): StrokeResult {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  return {
    pathPoints: points,
    averageVelocity: 1.0,
    pressureProfile: new Array(20).fill(0.5),
    curvature: 0,
    duration: 500,
    startPoint: start,
    endPoint: end,
  };
}

/**
 * Draw every connection in Bael's seal with the exact canonical path,
 * returning the reconstructor after all strokes are evaluated.
 */
function completeAllBaelConnections(reconstructor: SealReconstructor): void {
  // Bael connection order mirrors DemonRegistry definition order:
  //  0: b1→b3   1: b3→b5   2: b5→b7   3: b7→b2
  //  4: b2→b4   5: b4→b6   6: b6→b1   7: b8→b1   8: b8→b4
  const strokes: [string, string, Point[]][] = [
    ['b1', 'b3', [{ x: 0.5, y: 0.05 }, { x: 0.7, y: 0.2 }, { x: 0.95, y: 0.7 }]],
    ['b3', 'b5', [{ x: 0.95, y: 0.7 }, { x: 0.65, y: 0.85 }, { x: 0.35, y: 0.95 }]],
    ['b5', 'b7', [{ x: 0.35, y: 0.95 }, { x: 0.15, y: 0.7 }, { x: 0.15, y: 0.3 }]],
    ['b7', 'b2', [{ x: 0.15, y: 0.3 }, { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.3 }]],
    ['b2', 'b4', [{ x: 0.85, y: 0.3 }, { x: 0.8, y: 0.6 }, { x: 0.65, y: 0.95 }]],
    ['b4', 'b6', [{ x: 0.65, y: 0.95 }, { x: 0.3, y: 0.85 }, { x: 0.05, y: 0.7 }]],
    ['b6', 'b1', [{ x: 0.05, y: 0.7 }, { x: 0.15, y: 0.3 }, { x: 0.5, y: 0.05 }]],
    ['b8', 'b1', [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.05 }]],
    ['b8', 'b4', [{ x: 0.5, y: 0.5 }, { x: 0.65, y: 0.95 }]],
  ];

  for (const [from, to, path] of strokes) {
    reconstructor.beginStroke(nid(from));
    reconstructor.evaluateStroke(makeStrokeResult(path), nid(to));
  }
}

// ── tests ────────────────────────────────────────────────────────────

describe('SealReconstructor', () => {
  // 1. Perfect canonical path → accuracy near 1.0
  it('drawing the exact canonical path produces accuracy near 1.0', () => {
    const reconstructor = new SealReconstructor('bael');

    // Bael connection 0: b1 → b3
    const canonical: Point[] = [
      { x: 0.5, y: 0.05 },
      { x: 0.7, y: 0.2 },
      { x: 0.95, y: 0.7 },
    ];

    reconstructor.beginStroke(nid('b1'));
    const result = reconstructor.evaluateStroke(makeStrokeResult(canonical), nid('b3'));

    expect(result.accuracy).toBeCloseTo(1.0, 5);
    expect(result.valid).toBe(true);
  });

  // 2. Heavily deviated path → low accuracy
  it('drawing a heavily deviated path produces low accuracy', () => {
    const reconstructor = new SealReconstructor('bael');

    // b1→b3 canonical sits in the upper-right quadrant.
    // Provide a horizontal mid-line far from that region.
    const deviated: Point[] = [
      { x: 0.0, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 1.0, y: 0.5 },
    ];

    reconstructor.beginStroke(nid('b1'));
    const result = reconstructor.evaluateStroke(makeStrokeResult(deviated), nid('b3'));

    // Discrete Fréchet ≈ 0.67 → accuracy ≈ 0.33
    expect(result.accuracy).toBeLessThan(0.5);
    expect(result.valid).toBe(false);
  });

  // 3. Missing connections reduce seal integrity proportionally
  describe('missing connections and getSealIntegrity', () => {
    it('integrity is 0 before any connections are drawn', () => {
      const reconstructor = new SealReconstructor('bael');
      expect(reconstructor.getSealIntegrity()).toBe(0);
    });

    it('completing all connections with perfect paths gives integrity near 1.0', () => {
      const reconstructor = new SealReconstructor('bael');
      completeAllBaelConnections(reconstructor);

      expect(reconstructor.isComplete()).toBe(true);
      expect(reconstructor.getSealIntegrity()).toBeCloseTo(1.0, 5);
    });

    it('completing only some connections reduces integrity below 1.0', () => {
      const partialReconstructor = new SealReconstructor('bael');

      // Complete only the first connection with a perfect path.
      partialReconstructor.beginStroke(nid('b1'));
      partialReconstructor.evaluateStroke(
        makeStrokeResult([{ x: 0.5, y: 0.05 }, { x: 0.7, y: 0.2 }, { x: 0.95, y: 0.7 }]),
        nid('b3'),
      );

      const partialIntegrity = partialReconstructor.getSealIntegrity();
      expect(partialIntegrity).toBeGreaterThan(0);
      expect(partialIntegrity).toBeLessThan(1.0);
      expect(partialReconstructor.isComplete()).toBe(false);
    });

    it('integrity grows proportionally as more connections are completed', () => {
      const r1 = new SealReconstructor('bael');
      const r2 = new SealReconstructor('bael');

      // Complete 1 connection in r1, 5 connections in r2 — both with perfect paths.
      const allStrokes: [string, string, Point[]][] = [
        ['b1', 'b3', [{ x: 0.5, y: 0.05 }, { x: 0.7, y: 0.2 }, { x: 0.95, y: 0.7 }]],
        ['b3', 'b5', [{ x: 0.95, y: 0.7 }, { x: 0.65, y: 0.85 }, { x: 0.35, y: 0.95 }]],
        ['b5', 'b7', [{ x: 0.35, y: 0.95 }, { x: 0.15, y: 0.7 }, { x: 0.15, y: 0.3 }]],
        ['b7', 'b2', [{ x: 0.15, y: 0.3 }, { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.3 }]],
        ['b2', 'b4', [{ x: 0.85, y: 0.3 }, { x: 0.8, y: 0.6 }, { x: 0.65, y: 0.95 }]],
      ];

      const [from1, to1, path1] = allStrokes[0];
      r1.beginStroke(nid(from1));
      r1.evaluateStroke(makeStrokeResult(path1), nid(to1));

      for (const [from, to, path] of allStrokes) {
        r2.beginStroke(nid(from));
        r2.evaluateStroke(makeStrokeResult(path), nid(to));
      }

      expect(r1.getSealIntegrity()).toBeLessThan(r2.getSealIntegrity());
    });
  });

  // 4. Partial state can be serialized and restored
  describe('getPartialState and restoreFromState', () => {
    it('serialized state round-trips through JSON without data loss', () => {
      const original = new SealReconstructor('bael');

      // Complete two connections with exact canonical paths.
      original.beginStroke(nid('b1'));
      original.evaluateStroke(
        makeStrokeResult([{ x: 0.5, y: 0.05 }, { x: 0.7, y: 0.2 }, { x: 0.95, y: 0.7 }]),
        nid('b3'),
      );
      original.beginStroke(nid('b3'));
      original.evaluateStroke(
        makeStrokeResult([{ x: 0.95, y: 0.7 }, { x: 0.65, y: 0.85 }, { x: 0.35, y: 0.95 }]),
        nid('b5'),
      );

      const stateBeforeSerialise = original.getPartialState();
      const json = JSON.stringify(stateBeforeSerialise);
      const restored = SealReconstructor.restoreFromState(JSON.parse(json));

      // Verify structural equality of the persisted state.
      const stateAfterRestore = restored.getPartialState();
      expect(stateAfterRestore.demonId).toBe(stateBeforeSerialise.demonId);
      expect(stateAfterRestore.completedConnections).toHaveLength(
        stateBeforeSerialise.completedConnections.length,
      );

      // Verify computed integrity is identical after restoration.
      expect(restored.getSealIntegrity()).toBeCloseTo(original.getSealIntegrity(), 10);
      expect(restored.isComplete()).toBe(original.isComplete());
    });

    it('restored reconstructor continues to accept new strokes', () => {
      const original = new SealReconstructor('bael');
      original.beginStroke(nid('b1'));
      original.evaluateStroke(
        makeStrokeResult([{ x: 0.5, y: 0.05 }, { x: 0.7, y: 0.2 }, { x: 0.95, y: 0.7 }]),
        nid('b3'),
      );

      const restored = SealReconstructor.restoreFromState(
        JSON.parse(JSON.stringify(original.getPartialState())),
      );

      // Should be able to add another connection without error.
      restored.beginStroke(nid('b3'));
      const result = restored.evaluateStroke(
        makeStrokeResult([{ x: 0.95, y: 0.7 }, { x: 0.65, y: 0.85 }, { x: 0.35, y: 0.95 }]),
        nid('b5'),
      );
      expect(result.accuracy).toBeCloseTo(1.0, 5);
    });
  });

  // 5. Wrong demon id throws typed error
  describe('UnknownDemonError', () => {
    it('throws UnknownDemonError for an unrecognised demon id', () => {
      expect(() => new SealReconstructor('nonexistent_demon')).toThrow(UnknownDemonError);
    });

    it('error carries the attempted demon id', () => {
      let caught: unknown;
      try {
        new SealReconstructor('fake_demon_xyz');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(UnknownDemonError);
      expect((caught as UnknownDemonError).demonId).toBe('fake_demon_xyz');
    });

    it('error message includes the attempted demon id', () => {
      expect(() => new SealReconstructor('bad_id')).toThrow(/bad_id/);
    });
  });

  // ── edge cases ───────────────────────────────────────────────────

  it('deviationMap contains an entry for each drawn point', () => {
    const reconstructor = new SealReconstructor('bael');
    const path: Point[] = [
      { x: 0.5, y: 0.05 },
      { x: 0.65, y: 0.12 },
      { x: 0.7, y: 0.2 },
      { x: 0.95, y: 0.7 },
    ];

    reconstructor.beginStroke(nid('b1'));
    const result = reconstructor.evaluateStroke(makeStrokeResult(path), nid('b3'));

    expect(Object.keys(result.deviationMap)).toHaveLength(path.length);
  });

  it('calling evaluateStroke without beginStroke throws', () => {
    const reconstructor = new SealReconstructor('bael');
    expect(() =>
      reconstructor.evaluateStroke(
        makeStrokeResult([{ x: 0.5, y: 0.05 }]),
        nid('b3'),
      ),
    ).toThrow();
  });

  it('unknown connection pair returns valid=false and accuracy 0', () => {
    const reconstructor = new SealReconstructor('bael');
    // 'b1' → 'b4' is not a connection in Bael's seal.
    reconstructor.beginStroke(nid('b1'));
    const result = reconstructor.evaluateStroke(
      makeStrokeResult([{ x: 0.5, y: 0.05 }, { x: 0.65, y: 0.95 }]),
      nid('b4'),
    );

    expect(result.accuracy).toBe(0);
    expect(result.valid).toBe(false);
  });
});
