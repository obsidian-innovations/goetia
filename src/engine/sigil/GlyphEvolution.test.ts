import { describe, it, expect } from 'vitest'
import {
  createHistory,
  recordDrawing,
  evolveGlyph,
  getEvolvedTemplate,
  calculateDivergence,
} from './GlyphEvolution'
import type { GlyphDrawingHistory } from './GlyphEvolution'
import type { GlyphId, Point } from '@engine/sigil/Types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const testGlyphId = 'TEST_GLYPH' as GlyphId

function makePath(scale = 1, offset = 0): Point[] {
  // Simple L-shape path
  return [
    { x: 0 + offset, y: 0 },
    { x: 0 + offset, y: 0.5 * scale },
    { x: 0 + offset, y: 1.0 * scale },
    { x: 0.5 * scale + offset, y: 1.0 * scale },
    { x: 1.0 * scale + offset, y: 1.0 * scale },
  ]
}

function makeHistoryWithDraws(count: number, pathFn = makePath): GlyphDrawingHistory {
  let history = createHistory(testGlyphId)
  for (let i = 0; i < count; i++) {
    history = recordDrawing(history, pathFn(1, i * 0.001))
  }
  return history
}

describe('GlyphEvolution', () => {
  // ── History creation ────────────────────────────────────────────────────

  describe('createHistory', () => {
    it('creates empty history', () => {
      const h = createHistory(testGlyphId)
      expect(h.glyphId).toBe(testGlyphId)
      expect(h.drawCount).toBe(0)
      expect(h.accumulatedPaths).toHaveLength(0)
      expect(h.evolvedCanonicalPath).toBeNull()
      expect(h.divergenceFromOriginal).toBe(0)
    })
  })

  // ── Recording ──────────────────────────────────────────────────────────

  describe('recordDrawing', () => {
    it('increments draw count', () => {
      let h = createHistory(testGlyphId)
      h = recordDrawing(h, makePath())
      expect(h.drawCount).toBe(1)
      h = recordDrawing(h, makePath())
      expect(h.drawCount).toBe(2)
    })

    it('stores normalized paths', () => {
      let h = createHistory(testGlyphId)
      h = recordDrawing(h, makePath())
      expect(h.accumulatedPaths).toHaveLength(1)
      // Normalized paths should be in [0,1] range
      for (const pt of h.accumulatedPaths[0]) {
        expect(pt.x).toBeGreaterThanOrEqual(0)
        expect(pt.x).toBeLessThanOrEqual(1)
        expect(pt.y).toBeGreaterThanOrEqual(0)
        expect(pt.y).toBeLessThanOrEqual(1)
      }
    })

    it('caps stored paths at 30', () => {
      const h = makeHistoryWithDraws(40)
      expect(h.accumulatedPaths).toHaveLength(30)
      expect(h.drawCount).toBe(40)
    })

    it('ignores paths with fewer than 3 points', () => {
      let h = createHistory(testGlyphId)
      h = recordDrawing(h, [{ x: 0, y: 0 }, { x: 1, y: 1 }])
      expect(h.drawCount).toBe(0)
      expect(h.accumulatedPaths).toHaveLength(0)
    })
  })

  // ── Evolution ──────────────────────────────────────────────────────────

  describe('evolveGlyph', () => {
    it('does nothing below threshold', () => {
      const h = makeHistoryWithDraws(30)
      const evolved = evolveGlyph(h, makePath())
      expect(evolved.evolvedCanonicalPath).toBeNull()
    })

    it('evolves after 50 draws with 20+ stored paths', () => {
      const h = makeHistoryWithDraws(55)
      const evolved = evolveGlyph(h, makePath())
      expect(evolved.evolvedCanonicalPath).not.toBeNull()
      expect(evolved.evolvedCanonicalPath!.length).toBe(32) // RESAMPLE_COUNT
      expect(evolved.divergenceFromOriginal).toBeGreaterThanOrEqual(0)
    })

    it('computes divergence from original canonical path', () => {
      const h = makeHistoryWithDraws(55)
      const evolved = evolveGlyph(h, makePath())
      // With nearly identical paths, divergence should be small
      expect(evolved.divergenceFromOriginal).toBeLessThan(1)
    })
  })

  // ── Template selection ────────────────────────────────────────────────

  describe('getEvolvedTemplate', () => {
    it('returns original when no history', () => {
      const original = makePath()
      expect(getEvolvedTemplate(undefined, original)).toBe(original)
    })

    it('returns original when no evolved path', () => {
      const original = makePath()
      const h = createHistory(testGlyphId)
      expect(getEvolvedTemplate(h, original)).toBe(original)
    })

    it('returns evolved path when available', () => {
      const h = makeHistoryWithDraws(55)
      const evolved = evolveGlyph(h, makePath())
      const result = getEvolvedTemplate(evolved, makePath())
      expect(result).toBe(evolved.evolvedCanonicalPath)
    })
  })

  // ── Divergence ────────────────────────────────────────────────────────

  describe('calculateDivergence', () => {
    it('returns 0 for identical paths', () => {
      const path = makePath()
      expect(calculateDivergence(path, path)).toBeCloseTo(0, 1)
    })

    it('returns positive value for different paths', () => {
      const pathA = makePath(1, 0)
      const pathB: Point[] = [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 },
      ]
      expect(calculateDivergence(pathA, pathB)).toBeGreaterThan(0)
    })
  })
})
