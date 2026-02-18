import { describe, it, expect } from 'vitest'
import { IntentCoherenceChecker } from './IntentCoherenceChecker'
import { GLYPHS } from './GlyphLibrary'
import { PlacedGlyph } from './Types'

function makePlacedGlyph(glyphId: (typeof GLYPHS)[keyof typeof GLYPHS], index = 0): PlacedGlyph {
  return {
    glyphId,
    position: { x: 0.5, y: 0.5 },
    confidence: 0.9,
    timestamp: 1000 + index,
  }
}

describe('IntentCoherenceChecker', () => {
  const checker = new IntentCoherenceChecker()

  it('empty glyphs → score 0.60', () => {
    const result = checker.checkCoherence([])
    expect(result.score).toBe(0.60)
    expect(result.contradictions).toHaveLength(0)
    expect(result.incompleteChains).toHaveLength(0)
    expect(result.isolatedGlyphs).toHaveLength(0)
  })

  it('VECTOR_OUT + TARGET_PERSON → score 1.0', () => {
    const glyphs = [
      makePlacedGlyph(GLYPHS.VECTOR_OUT, 0),
      makePlacedGlyph(GLYPHS.TARGET_PERSON, 1),
    ]
    const result = checker.checkCoherence(glyphs)
    expect(result.score).toBe(1.0)
    expect(result.contradictions).toHaveLength(0)
    expect(result.incompleteChains).toHaveLength(0)
    expect(result.isolatedGlyphs).toHaveLength(0)
  })

  it('VECTOR_OUT + VECTOR_IN contradiction → reduces score below 0.60', () => {
    const glyphs = [
      makePlacedGlyph(GLYPHS.VECTOR_OUT, 0),
      makePlacedGlyph(GLYPHS.VECTOR_IN, 1),
    ]
    const result = checker.checkCoherence(glyphs)
    expect(result.score).toBeLessThan(0.60)
    expect(result.contradictions).toHaveLength(1)
    expect(result.contradictions[0]).toContain(GLYPHS.VECTOR_OUT)
    expect(result.contradictions[0]).toContain(GLYPHS.VECTOR_IN)
  })

  it('score is never below 0', () => {
    // Pile on as many issues as possible
    const glyphs = [
      makePlacedGlyph(GLYPHS.VECTOR_OUT, 0),
      makePlacedGlyph(GLYPHS.VECTOR_IN, 1),
      makePlacedGlyph(GLYPHS.DURATION_INSTANT, 2),
      makePlacedGlyph(GLYPHS.DURATION_SUSTAINED, 3),
    ]
    const result = checker.checkCoherence(glyphs)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })
})
