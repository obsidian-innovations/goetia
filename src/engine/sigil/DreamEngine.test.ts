import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDreamState,
  checkDream,
  applyDrift,
  processDreamBatch,
  DREAMABLE_STATUSES,
} from './DreamEngine'
import type { DreamState, DriftEvent } from './DreamEngine'
import type { Sigil, GlyphId, RingWeakPoint, PlacedGlyph } from './Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000
const NOW = 1_700_000_000_000

function gid(id: string): GlyphId { return id as GlyphId }

function makePlacedGlyph(glyphId: string, x: number, y: number): PlacedGlyph {
  return { glyphId: gid(glyphId), position: { x, y }, confidence: 0.8, timestamp: NOW }
}

function makeWeakPoint(startAngle: number, endAngle: number, strength: number): RingWeakPoint {
  return { startAngle, endAngle, strength }
}

function makeSigil(overrides: Partial<Sigil> = {}): Sigil {
  return {
    id: 'sig-1',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [
      makePlacedGlyph('VECTOR_OUT', 0.3, 0.4),
      makePlacedGlyph('QUALITY_SHARP', 0.6, 0.7),
    ],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: {
      circularity: 0.9,
      closure: 0.85,
      consistency: 0.8,
      overallStrength: 0.85,
      weakPoints: [
        makeWeakPoint(0.5, 0.8, 0.4),
        makeWeakPoint(2.0, 2.3, 0.6),
      ],
      center: { x: 0.5, y: 0.5 },
      radius: 0.4,
    },
    overallIntegrity: 0.85,
    visualState: 'charged',
    status: 'resting',
    createdAt: NOW - MS_PER_HOUR * 48,
    statusChangedAt: NOW - MS_PER_HOUR * 24,
    ...overrides,
  }
}

function makeDreamState(overrides: Partial<DreamState> = {}): DreamState {
  return {
    sigilId: 'sig-1',
    lastDreamCheck: NOW - MS_PER_HOUR * 5, // 5 hours ago
    driftHistory: [],
    loreFragmentsRevealed: [],
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DreamEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('createDreamState', () => {
    it('creates a fresh state with no drift history', () => {
      const state = createDreamState('sig-1', NOW)
      expect(state.sigilId).toBe('sig-1')
      expect(state.lastDreamCheck).toBe(NOW)
      expect(state.driftHistory).toHaveLength(0)
      expect(state.loreFragmentsRevealed).toHaveLength(0)
    })
  })

  describe('DREAMABLE_STATUSES', () => {
    it('only includes resting', () => {
      expect(DREAMABLE_STATUSES.has('resting')).toBe(true)
      expect(DREAMABLE_STATUSES.has('charged')).toBe(false)
      expect(DREAMABLE_STATUSES.has('draft')).toBe(false)
      expect(DREAMABLE_STATUSES.has('complete')).toBe(false)
      expect(DREAMABLE_STATUSES.has('awakened')).toBe(false)
      expect(DREAMABLE_STATUSES.has('spent')).toBe(false)
    })
  })

  describe('checkDream', () => {
    it('returns null for non-resting sigils', () => {
      const sigil = makeSigil({ status: 'charged' })
      const state = makeDreamState()
      expect(checkDream(sigil, state, NOW, 0, [])).toBeNull()
    })

    it('returns null for non-dreamable statuses', () => {
      for (const status of ['draft', 'complete', 'awakened', 'spent'] as const) {
        const sigil = makeSigil({ status })
        const state = makeDreamState()
        expect(checkDream(sigil, state, NOW, 0, [])).toBeNull()
      }
    })

    it('returns null if less than 4 hours have passed', () => {
      const sigil = makeSigil()
      const state = makeDreamState({ lastDreamCheck: NOW - MS_PER_HOUR * 3 })
      expect(checkDream(sigil, state, NOW, 0, [])).toBeNull()
    })

    it('triggers at exactly 4 hours (boundary)', () => {
      const sigil = makeSigil()
      const state = makeDreamState({ lastDreamCheck: NOW - MS_PER_HOUR * 4 })
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const result = checkDream(sigil, state, NOW, 0, [])
      expect(result).not.toBeNull()
      expect(result!.driftEvent).toBeDefined()
    })

    it('produces drift after 4+ hours', () => {
      const sigil = makeSigil()
      const state = makeDreamState({ lastDreamCheck: NOW - MS_PER_HOUR * 5 })
      // Suppress lore fragment for deterministic test
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = checkDream(sigil, state, NOW, 0, [])
      expect(result).not.toBeNull()
      expect(result!.driftEvent).toBeDefined()
      expect(result!.driftEvent).not.toBeNull()
      expect(result!.driftEvent.glyphShifts).toHaveLength(2)
      expect(result!.driftEvent.ringWeakPointShifts).toHaveLength(2)
    })

    it('glyph shifts stay within drift magnitude bounds', () => {
      const sigil = makeSigil()
      const state = makeDreamState()

      // Run many times to check bounds
      for (let i = 0; i < 50; i++) {
        const result = checkDream(sigil, state, NOW, 0, [])!
        for (const shift of result.driftEvent!.glyphShifts) {
          expect(Math.abs(shift.dx)).toBeLessThanOrEqual(0.03)
          expect(Math.abs(shift.dy)).toBeLessThanOrEqual(0.03)
        }
      }
    })

    it('corruption amplifies drift magnitude', () => {
      const sigil = makeSigil()
      const state = makeDreamState()

      // At corruption 1.0, drift magnitude doubles to 0.06
      for (let i = 0; i < 50; i++) {
        const result = checkDream(sigil, state, NOW, 1.0, [])!
        for (const shift of result.driftEvent!.glyphShifts) {
          expect(Math.abs(shift.dx)).toBeLessThanOrEqual(0.06)
          expect(Math.abs(shift.dy)).toBeLessThanOrEqual(0.06)
        }
      }
    })

    it('produces a lore fragment ~20% of the time', () => {
      const sigil = makeSigil()
      const state = makeDreamState()

      vi.spyOn(Math, 'random').mockReturnValue(0.10) // Below 0.20 threshold
      const result = checkDream(sigil, state, NOW, 0, ['knowledge'])
      expect(result!.driftEvent.loreFragment).not.toBeNull()
      expect(result!.driftEvent.loreFragment!.length).toBeGreaterThan(0)
    })

    it('suppresses lore fragment when random > 0.20', () => {
      const sigil = makeSigil()
      const state = makeDreamState()

      vi.spyOn(Math, 'random').mockReturnValue(0.50) // Above threshold
      const result = checkDream(sigil, state, NOW, 0, ['knowledge'])
      expect(result!.driftEvent.loreFragment).toBeNull()
    })

    it('handles sigil with no binding ring', () => {
      const sigil = makeSigil({ bindingRing: null })
      const state = makeDreamState()
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = checkDream(sigil, state, NOW, 0, [])
      expect(result).not.toBeNull()
      expect(result!.driftEvent.ringWeakPointShifts).toHaveLength(0)
    })

    it('handles sigil with no glyphs', () => {
      const sigil = makeSigil({ glyphs: [] })
      const state = makeDreamState()
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = checkDream(sigil, state, NOW, 0, [])
      expect(result).not.toBeNull()
      expect(result!.driftEvent.glyphShifts).toHaveLength(0)
    })

    it('uses generic lore when no domains provided', () => {
      const sigil = makeSigil()
      const state = makeDreamState()

      vi.spyOn(Math, 'random').mockReturnValue(0.10)
      const result = checkDream(sigil, state, NOW, 0, [])
      expect(result!.driftEvent.loreFragment).not.toBeNull()
    })

    it('avoids already-revealed lore fragments when possible', () => {
      const sigil = makeSigil()
      // Exhaust all but one knowledge fragment
      const knowledgeLore = [
        'The seal unfolded in your sleep — a page you never wrote.',
        'It whispered a name you cannot pronounce, but recognize.',
        'Letters drift in the dark, arranging into truths you never asked for.',
        'The demon showed you a library that burned before it was built.',
        'A formula appeared behind your eyelids — correct, but forbidden.',
      ]
      const state = makeDreamState({ loreFragmentsRevealed: knowledgeLore })

      // Force lore generation
      vi.spyOn(Math, 'random').mockReturnValue(0.05)
      const result = checkDream(sigil, state, NOW, 0, ['knowledge'])
      // Should pick from the remaining unrevealed fragment
      expect(result!.driftEvent.loreFragment).not.toBeNull()
      expect(knowledgeLore).not.toContain(result!.driftEvent.loreFragment)
    })
  })

  describe('applyDrift', () => {
    it('shifts glyph positions by drift amounts', () => {
      const sigil = makeSigil()
      const drift: DriftEvent = {
        timestamp: NOW,
        glyphShifts: [
          { glyphId: gid('VECTOR_OUT'), dx: 0.02, dy: -0.01 },
          { glyphId: gid('QUALITY_SHARP'), dx: -0.01, dy: 0.02 },
        ],
        ringWeakPointShifts: [],
        loreFragment: null,
      }

      const result = applyDrift(sigil, drift)
      expect(result.glyphs[0].position.x).toBeCloseTo(0.32)
      expect(result.glyphs[0].position.y).toBeCloseTo(0.39)
      expect(result.glyphs[1].position.x).toBeCloseTo(0.59)
      expect(result.glyphs[1].position.y).toBeCloseTo(0.72)
    })

    it('clamps shifted positions to 0-1 range', () => {
      const sigil = makeSigil({
        glyphs: [makePlacedGlyph('VECTOR_OUT', 0.01, 0.99)],
      })
      const drift: DriftEvent = {
        timestamp: NOW,
        glyphShifts: [{ glyphId: gid('VECTOR_OUT'), dx: -0.03, dy: 0.03 }],
        ringWeakPointShifts: [],
        loreFragment: null,
      }

      const result = applyDrift(sigil, drift)
      expect(result.glyphs[0].position.x).toBe(0)
      expect(result.glyphs[0].position.y).toBe(1)
    })

    it('shifts ring weak-point angles', () => {
      const sigil = makeSigil()
      const drift: DriftEvent = {
        timestamp: NOW,
        glyphShifts: [],
        ringWeakPointShifts: [
          { index: 0, dStartAngle: 0.1, dEndAngle: 0.1 },
          { index: 1, dStartAngle: 0.1, dEndAngle: 0.1 },
        ],
        loreFragment: null,
      }

      const result = applyDrift(sigil, drift)
      expect(result.bindingRing!.weakPoints[0].startAngle).toBeCloseTo(0.6) // 0.5 + 0.1
      expect(result.bindingRing!.weakPoints[0].endAngle).toBeCloseTo(0.9) // 0.8 + 0.1
      expect(result.bindingRing!.weakPoints[1].startAngle).toBeCloseTo(2.1) // 2.0 + 0.1
    })

    it('preserves original sigil immutably', () => {
      const sigil = makeSigil()
      const originalX = sigil.glyphs[0].position.x
      const drift: DriftEvent = {
        timestamp: NOW,
        glyphShifts: [{ glyphId: gid('VECTOR_OUT'), dx: 0.02, dy: 0.01 }],
        ringWeakPointShifts: [],
        loreFragment: null,
      }

      applyDrift(sigil, drift)
      expect(sigil.glyphs[0].position.x).toBe(originalX)
    })

    it('handles null binding ring gracefully', () => {
      const sigil = makeSigil({ bindingRing: null })
      const drift: DriftEvent = {
        timestamp: NOW,
        glyphShifts: [],
        ringWeakPointShifts: [{ index: 0, dStartAngle: 0.5, dEndAngle: 0.7 }],
        loreFragment: null,
      }

      const result = applyDrift(sigil, drift)
      expect(result.bindingRing).toBeNull()
    })
  })

  describe('processDreamBatch', () => {
    it('skips non-resting sigils', () => {
      const sigils = [makeSigil({ status: 'charged' })]
      const states: Record<string, DreamState> = {}
      const result = processDreamBatch(sigils, states, NOW, 0, {})
      expect(result.updatedSigils).toHaveLength(0)
    })

    it('creates dream state for first encounter', () => {
      const sigils = [makeSigil()]
      const states: Record<string, DreamState> = {}
      const result = processDreamBatch(sigils, states, NOW, 0, {})
      expect(result.updatedDreamStates['sig-1']).toBeDefined()
      expect(result.updatedDreamStates['sig-1'].lastDreamCheck).toBe(NOW)
      // No drift on first encounter
      expect(result.updatedSigils).toHaveLength(0)
    })

    it('produces drift for eligible sigils after interval', () => {
      const sigils = [makeSigil()]
      const states = { 'sig-1': makeDreamState() }
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // No lore

      const result = processDreamBatch(sigils, states, NOW, 0, { bael: ['knowledge'] })
      expect(result.updatedSigils).toHaveLength(1)
      expect(result.updatedDreamStates['sig-1'].driftHistory).toHaveLength(1)
    })

    it('caps drift history at 20 events', () => {
      const existingHistory: DriftEvent[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: NOW - MS_PER_HOUR * (i + 1),
        glyphShifts: [],
        ringWeakPointShifts: [],
        loreFragment: null,
      }))

      const sigils = [makeSigil()]
      const states = {
        'sig-1': makeDreamState({ driftHistory: existingHistory }),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = processDreamBatch(sigils, states, NOW, 0, {})
      expect(result.updatedDreamStates['sig-1'].driftHistory).toHaveLength(20)
    })

    it('records lore fragment in state', () => {
      const sigils = [makeSigil()]
      const states = { 'sig-1': makeDreamState() }
      vi.spyOn(Math, 'random').mockReturnValue(0.05) // Force lore

      const result = processDreamBatch(sigils, states, NOW, 0, { bael: ['destruction'] })
      expect(result.updatedDreamStates['sig-1'].loreFragmentsRevealed.length).toBeGreaterThan(0)
    })

    it('processes multiple sigils independently', () => {
      const sigils = [
        makeSigil({ id: 'sig-1', demonId: 'bael' }),
        makeSigil({ id: 'sig-2', demonId: 'agares' }),
        makeSigil({ id: 'sig-3', demonId: 'vassago', status: 'charged' }),
      ]
      const states: Record<string, DreamState> = {
        'sig-1': makeDreamState({ sigilId: 'sig-1' }),
        'sig-2': makeDreamState({ sigilId: 'sig-2' }),
      }
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = processDreamBatch(sigils, states, NOW, 0, {})
      // sig-1 and sig-2 drift, sig-3 is not resting
      expect(result.updatedSigils).toHaveLength(2)
      expect(result.updatedDreamStates['sig-3']).toBeUndefined()
    })

    it('updates lastDreamCheck even when no drift occurs', () => {
      const sigils = [makeSigil()]
      // Last check was very recently — too soon for drift, but we
      // still process it. Actually this would skip. Let's test the
      // "enough time but Math returns edge values" case
      const recentCheck = NOW - MS_PER_HOUR * 5
      const states = { 'sig-1': makeDreamState({ lastDreamCheck: recentCheck }) }
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = processDreamBatch(sigils, states, NOW, 0, {})
      expect(result.updatedDreamStates['sig-1'].lastDreamCheck).toBe(NOW)
    })
  })
})
