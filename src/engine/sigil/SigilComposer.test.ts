import { describe, it, expect } from 'vitest'
import { SigilComposer } from './SigilComposer'
import { GLYPHS } from './GlyphLibrary'
import { GlyphId, PlacedGlyph, RingResult } from './Types'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makePlacedGlyph(glyphId: GlyphId, index = 0): PlacedGlyph {
  return {
    glyphId,
    position: { x: 0.5, y: 0.5 },
    confidence: 0.9,
    timestamp: 1000 + index,
  }
}

function makeRing(overallStrength: number): RingResult {
  return {
    circularity: overallStrength,
    closure: overallStrength,
    consistency: overallStrength,
    overallStrength,
    weakPoints: [],
    center: { x: 0.5, y: 0.5 },
    radius: 0.4,
  }
}

// ─── Step 1.3 — State management ───────────────────────────────────────────

describe('SigilComposer — state', () => {
  it('constructor initializes empty state', () => {
    const composer = new SigilComposer('bael')
    const snap = composer.getSnapshot()
    expect(snap.demonId).toBe('bael')
    expect(snap.sealIntegrity).toBe(0)
    expect(snap.completedConnections).toHaveLength(0)
    expect(snap.glyphs).toHaveLength(0)
    expect(snap.bindingRing).toBeNull()
  })

  it('addGlyph replaces a glyph with the same id', () => {
    const composer = new SigilComposer('bael')
    const glyph1 = makePlacedGlyph(GLYPHS.VECTOR_OUT, 0)
    const glyph2: PlacedGlyph = { ...glyph1, confidence: 0.5, timestamp: 9999 }

    composer.addGlyph(glyph1)
    composer.addGlyph(glyph2)

    const snap = composer.getSnapshot()
    expect(snap.glyphs).toHaveLength(1)
    expect(snap.glyphs[0].confidence).toBe(0.5)
  })

  it('removeGlyph removes the glyph', () => {
    const composer = new SigilComposer('bael')
    composer.addGlyph(makePlacedGlyph(GLYPHS.VECTOR_OUT, 0))
    composer.addGlyph(makePlacedGlyph(GLYPHS.TARGET_PERSON, 1))
    composer.removeGlyph(GLYPHS.VECTOR_OUT)

    const snap = composer.getSnapshot()
    expect(snap.glyphs).toHaveLength(1)
    expect(snap.glyphs[0].glyphId).toBe(GLYPHS.TARGET_PERSON)
  })

  it('setBindingRing stores the ring', () => {
    const composer = new SigilComposer('bael')
    expect(composer.getSnapshot().bindingRing).toBeNull()
    composer.setBindingRing(makeRing(0.8))
    expect(composer.getSnapshot().bindingRing).not.toBeNull()
    expect(composer.getSnapshot().bindingRing?.overallStrength).toBe(0.8)
  })
})

// ─── Step 1.4 — compose() ──────────────────────────────────────────────────

describe('SigilComposer — compose()', () => {
  it('no ring → visualState = dormant', () => {
    const composer = new SigilComposer('bael')
    composer.setSealIntegrity(1.0, [])
    const sigil = composer.compose()
    expect(sigil.visualState).toBe('dormant')
    expect(sigil.bindingRing).toBeNull()
  })

  it('high integrity → visualState = charged (≥ 0.85)', () => {
    const composer = new SigilComposer('bael')
    // seal=1.0, coherence=1.0 (VECTOR+TARGET), ring=1.0 → overall=1.0
    composer.setSealIntegrity(1.0, [])
    composer.addGlyph(makePlacedGlyph(GLYPHS.VECTOR_OUT, 0))
    composer.addGlyph(makePlacedGlyph(GLYPHS.TARGET_PERSON, 1))
    composer.setBindingRing(makeRing(1.0))
    const sigil = composer.compose()
    expect(sigil.visualState).toBe('charged')
    expect(sigil.overallIntegrity).toBeGreaterThanOrEqual(0.85)
  })

  it('medium integrity → visualState = healthy (≥ 0.60)', () => {
    const composer = new SigilComposer('bael')
    // seal=0.7, coherence=0.60 (empty glyphs baseline), ring=0.7
    // overall = 0.7*0.40 + 0.60*0.35 + 0.7*0.25 = 0.28+0.21+0.175 = 0.665
    composer.setSealIntegrity(0.7, [])
    composer.setBindingRing(makeRing(0.7))
    const sigil = composer.compose()
    expect(sigil.visualState).toBe('healthy')
    expect(sigil.overallIntegrity).toBeGreaterThanOrEqual(0.60)
    expect(sigil.overallIntegrity).toBeLessThan(0.85)
  })

  it('low integrity → visualState = unstable (≥ 0.30)', () => {
    const composer = new SigilComposer('bael')
    // seal=0.3, coherence=0.60, ring=0.3
    // overall = 0.3*0.40 + 0.60*0.35 + 0.3*0.25 = 0.12+0.21+0.075 = 0.405
    composer.setSealIntegrity(0.3, [])
    composer.setBindingRing(makeRing(0.3))
    const sigil = composer.compose()
    expect(sigil.visualState).toBe('unstable')
    expect(sigil.overallIntegrity).toBeGreaterThanOrEqual(0.30)
    expect(sigil.overallIntegrity).toBeLessThan(0.60)
  })

  it('very low integrity → visualState = corrupted (< 0.30)', () => {
    const composer = new SigilComposer('bael')
    // seal=0.0, no glyphs → coherence=0.60, ring=0.0
    // overall = 0*0.40 + 0.60*0.35 + 0*0.25 = 0.21
    composer.setSealIntegrity(0.0, [])
    composer.setBindingRing(makeRing(0.0))
    const sigil = composer.compose()
    expect(sigil.visualState).toBe('corrupted')
    expect(sigil.overallIntegrity).toBeLessThan(0.30)
  })
})
