import { describe, it, expect } from 'vitest'
import { GlyphRecognizer } from './GlyphRecognizer'
import { GLYPH_TEMPLATES, GLYPHS } from './GlyphLibrary'
import type { StrokeResult } from './Types'

// ─── Helper ──────────────────────────────────────────────────────────────────

function makeStroke(points: { x: number; y: number }[]): StrokeResult {
  const simplified = points
  return {
    pathPoints: points,
    simplifiedPoints: simplified,
    averageVelocity: 1,
    pressureProfile: new Array(20).fill(0.5),
    curvature: new Array(simplified.length).fill(0),
    duration: 500,
    startPoint: points[0] ?? { x: 0, y: 0 },
    endPoint: points[points.length - 1] ?? { x: 0, y: 0 },
    totalLength: 100,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GlyphRecognizer', () => {
  it('each canonical path recognizes itself above threshold', () => {
    const recognizer = new GlyphRecognizer()
    for (const template of GLYPH_TEMPLATES) {
      const stroke = makeStroke(template.canonicalPath)
      const result = recognizer.recognize([stroke])
      expect(result.recognized, `Expected ${template.id} to recognize itself`).toBe(template.id)
      expect(
        result.confidence,
        `Expected confidence >= 0.55 for ${template.id}`
      ).toBeGreaterThanOrEqual(0.55)
    }
  })

  it('scaled canonical path still recognizes', () => {
    const recognizer = new GlyphRecognizer()
    const template = GLYPH_TEMPLATES.find(t => t.id === GLYPHS.VECTOR_OUT)!
    const scaled = template.canonicalPath.map(p => ({
      x: p.x * 200 + 50,
      y: p.y * 200 + 50,
    }))
    const stroke = makeStroke(scaled)
    const result = recognizer.recognize([stroke])
    expect(result.recognized).toBe(GLYPHS.VECTOR_OUT)
  })

  it('empty input returns null', () => {
    const recognizer = new GlyphRecognizer()
    const result = recognizer.recognize([])
    expect(result.recognized).toBeNull()
  })

  it('single point input returns null', () => {
    const recognizer = new GlyphRecognizer()
    const stroke = makeStroke([{ x: 0.5, y: 0.5 }])
    const result = recognizer.recognize([stroke])
    expect(result.recognized).toBeNull()
  })

  it('alternates are sorted by confidence descending', () => {
    const recognizer = new GlyphRecognizer()
    const template = GLYPH_TEMPLATES[0]
    const stroke = makeStroke(template.canonicalPath)
    const result = recognizer.recognize([stroke])
    for (let i = 0; i < result.alternates.length - 1; i++) {
      expect(result.alternates[i].confidence).toBeGreaterThanOrEqual(
        result.alternates[i + 1].confidence
      )
    }
  })
})
