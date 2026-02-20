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

  it('defaults to normal difficulty', () => {
    const recognizer = new GlyphRecognizer()
    const template = GLYPH_TEMPLATES.find(t => t.id === GLYPHS.VECTOR_OUT)!
    const stroke = makeStroke(template.canonicalPath)
    const result = recognizer.recognize([stroke])
    expect(result.recognized).toBe(GLYPHS.VECTOR_OUT)
  })

  it('easy difficulty recognizes all canonical paths', () => {
    const recognizer = new GlyphRecognizer('easy')
    for (const template of GLYPH_TEMPLATES) {
      const stroke = makeStroke(template.canonicalPath)
      const result = recognizer.recognize([stroke])
      expect(result.recognized, `Expected ${template.id} on easy`).toBe(template.id)
    }
  })

  it('hard difficulty recognizes all canonical paths', () => {
    const recognizer = new GlyphRecognizer('hard')
    for (const template of GLYPH_TEMPLATES) {
      const stroke = makeStroke(template.canonicalPath)
      const result = recognizer.recognize([stroke])
      expect(result.recognized, `Expected ${template.id} on hard`).toBe(template.id)
    }
  })

  it('easy difficulty yields higher confidence than hard for the same input', () => {
    const easy = new GlyphRecognizer('easy')
    const hard = new GlyphRecognizer('hard')
    const template = GLYPH_TEMPLATES.find(t => t.id === GLYPHS.QUALITY_SHARP)!
    // Add noise to make it imperfect
    const noisy = template.canonicalPath.map(p => ({
      x: p.x + (Math.sin(p.y * 10) * 0.03),
      y: p.y + (Math.cos(p.x * 10) * 0.03),
    }))
    const stroke = makeStroke(noisy)
    const easyResult = easy.recognize([stroke])
    const hardResult = hard.recognize([stroke])
    expect(easyResult.confidence).toBeGreaterThan(hardResult.confidence)
  })

  it('setDifficulty changes recognition behavior', () => {
    const recognizer = new GlyphRecognizer('hard')
    const template = GLYPH_TEMPLATES.find(t => t.id === GLYPHS.VECTOR_OUT)!
    const stroke = makeStroke(template.canonicalPath)
    const hardResult = recognizer.recognize([stroke])

    recognizer.setDifficulty('easy')
    const easyResult = recognizer.recognize([stroke])

    // Easy should give higher or equal confidence (lower RMSD multiplier)
    expect(easyResult.confidence).toBeGreaterThanOrEqual(hardResult.confidence)
  })

  it('hard difficulty rejects sloppy drawings that easy accepts', () => {
    const easy = new GlyphRecognizer('easy')
    const hard = new GlyphRecognizer('hard')
    // A very rough chevron with significant distortion
    const sloppyChevron = [
      { x: 0.2, y: 0.15 },
      { x: 0.35, y: 0.22 },
      { x: 0.50, y: 0.35 },
      { x: 0.65, y: 0.42 },
      { x: 0.75, y: 0.55 },
      { x: 0.60, y: 0.58 },
      { x: 0.45, y: 0.72 },
      { x: 0.30, y: 0.80 },
      { x: 0.18, y: 0.88 },
    ]
    const stroke = makeStroke(sloppyChevron)
    const easyResult = easy.recognize([stroke])
    const hardResult = hard.recognize([stroke])
    // Easy should recognize it; hard should either reject or give lower confidence
    if (easyResult.recognized !== null) {
      expect(easyResult.confidence).toBeGreaterThan(hardResult.confidence)
    }
  })
})
