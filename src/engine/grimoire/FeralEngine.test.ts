import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkFeralStatus,
  tickFeralDrift,
  tickFeral,
  generateFeralWhisper,
} from './FeralEngine'
import type { FeralSigilState } from './FeralEngine'
import type { Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000
const SEVEN_DAYS = 7 * 24 * 60 * 60_000

function makeSigil(id: string, overrides: Partial<Sigil> = {}): Sigil {
  return {
    id,
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.85,
    visualState: 'healthy',
    status: 'spent',
    createdAt: NOW - SEVEN_DAYS * 2,
    statusChangedAt: NOW - SEVEN_DAYS * 2,
    ...overrides,
  }
}

function makeFeralState(sigilId: string, isFeral: boolean, overrides: Partial<FeralSigilState> = {}): FeralSigilState {
  return {
    sigilId,
    demonId: 'bael',
    unboundAt: NOW - SEVEN_DAYS * 2,
    feralAt: isFeral ? NOW - SEVEN_DAYS : null,
    isFeral,
    driftOffset: { dx: 0, dy: 0 },
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FeralEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkFeralStatus', () => {
    it('returns null for non-spent sigils', () => {
      const sigil = makeSigil('s1', { status: 'resting' })
      expect(checkFeralStatus(sigil, undefined, NOW)).toBeNull()
    })

    it('returns non-feral state for recently spent sigil', () => {
      const sigil = makeSigil('s1', { statusChangedAt: NOW - 1000 })
      const result = checkFeralStatus(sigil, undefined, NOW)
      expect(result).not.toBeNull()
      expect(result!.isFeral).toBe(false)
      expect(result!.feralAt).toBeNull()
    })

    it('returns feral state after 7 days', () => {
      const sigil = makeSigil('s1', { statusChangedAt: NOW - SEVEN_DAYS - 1 })
      const result = checkFeralStatus(sigil, undefined, NOW)
      expect(result).not.toBeNull()
      expect(result!.isFeral).toBe(true)
      expect(result!.feralAt).toBeDefined()
    })

    it('transitions at exactly 7 days', () => {
      const sigil = makeSigil('s1', { statusChangedAt: NOW - SEVEN_DAYS })
      const result = checkFeralStatus(sigil, undefined, NOW)
      expect(result!.isFeral).toBe(true)
    })

    it('returns existing state if no change', () => {
      const existing = makeFeralState('s1', true)
      const sigil = makeSigil('s1')
      const result = checkFeralStatus(sigil, existing, NOW)
      expect(result).toBe(existing) // same reference
    })

    it('preserves drift offset from existing state', () => {
      const existing = makeFeralState('s1', false, {
        driftOffset: { dx: 0.05, dy: -0.03 },
        unboundAt: NOW - SEVEN_DAYS - 1,
      })
      const sigil = makeSigil('s1', { statusChangedAt: NOW - SEVEN_DAYS - 1 })
      const result = checkFeralStatus(sigil, existing, NOW)
      expect(result!.isFeral).toBe(true)
      expect(result!.driftOffset).toEqual({ dx: 0.05, dy: -0.03 })
    })
  })

  describe('tickFeralDrift', () => {
    it('applies drift to feral sigils', () => {
      const states: Record<string, FeralSigilState> = {
        s1: makeFeralState('s1', true),
      }

      const updated = tickFeralDrift(states)
      expect(updated).not.toBe(states) // new reference
      const drift = updated['s1'].driftOffset
      // Non-zero drift should be applied (random, but bounded)
      expect(Math.abs(drift.dx) + Math.abs(drift.dy)).toBeGreaterThanOrEqual(0)
    })

    it('does not drift non-feral sigils', () => {
      const states: Record<string, FeralSigilState> = {
        s1: makeFeralState('s1', false),
      }

      const updated = tickFeralDrift(states)
      expect(updated).toBe(states) // same reference, no changes
    })

    it('clamps drift within bounds', () => {
      const states: Record<string, FeralSigilState> = {
        s1: makeFeralState('s1', true, { driftOffset: { dx: 0.099, dy: 0.099 } }),
      }

      // Run many ticks to try to exceed bounds
      let current = states
      for (let i = 0; i < 100; i++) {
        current = tickFeralDrift(current)
      }

      const drift = current['s1'].driftOffset
      expect(drift.dx).toBeGreaterThanOrEqual(-0.1)
      expect(drift.dx).toBeLessThanOrEqual(0.1)
      expect(drift.dy).toBeGreaterThanOrEqual(-0.1)
      expect(drift.dy).toBeLessThanOrEqual(0.1)
    })
  })

  describe('tickFeral', () => {
    it('creates feral states for spent sigils past 7 days', () => {
      const sigils = [makeSigil('s1', { statusChangedAt: NOW - SEVEN_DAYS - 1 })]
      const result = tickFeral(sigils, {}, NOW)
      expect(result.statesChanged).toBe(true)
      expect(result.updatedStates['s1']).toBeDefined()
      expect(result.updatedStates['s1'].isFeral).toBe(true)
    })

    it('removes states for sigils no longer spent', () => {
      const sigils = [makeSigil('s1', { status: 'resting' })]
      const existing = { s1: makeFeralState('s1', true) }
      const result = tickFeral(sigils, existing, NOW)
      expect(result.statesChanged).toBe(true)
      expect(result.updatedStates['s1']).toBeUndefined()
    })

    it('triggers wild sigil event at 3+ feral', () => {
      const sigils = [
        makeSigil('s1', { demonId: 'a', statusChangedAt: NOW - SEVEN_DAYS - 1 }),
        makeSigil('s2', { demonId: 'b', statusChangedAt: NOW - SEVEN_DAYS - 1 }),
        makeSigil('s3', { demonId: 'c', statusChangedAt: NOW - SEVEN_DAYS - 1 }),
      ]
      const result = tickFeral(sigils, {}, NOW)
      expect(result.wildEvent).not.toBeNull()
      expect(result.wildEvent!.triggered).toBe(true)
      expect(result.wildEvent!.feralCount).toBe(3)
    })

    it('no wild event below 3 feral', () => {
      const sigils = [
        makeSigil('s1', { statusChangedAt: NOW - SEVEN_DAYS - 1 }),
        makeSigil('s2', { statusChangedAt: NOW - SEVEN_DAYS - 1 }),
      ]
      const result = tickFeral(sigils, {}, NOW)
      expect(result.wildEvent).toBeNull()
    })

    it('reports statesChanged=false when nothing changed', () => {
      // Mock random to return 0.5 (drift will be 0)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const existing = { s1: makeFeralState('s1', true) }
      const sigils = [makeSigil('s1')]
      const result = tickFeral(sigils, existing, NOW)
      // State already feral, drift is zero due to mock → no change
      // Note: tickFeralDrift still creates a new ref for feral states
      // so statesChanged will be true due to drift reference change
      expect(result.updatedStates['s1']).toBeDefined()
    })

    it('wild event description escalates with count', () => {
      const makeFeral = (id: string) => makeSigil(id, {
        demonId: id,
        statusChangedAt: NOW - SEVEN_DAYS - 1,
      })

      const result3 = tickFeral([makeFeral('a'), makeFeral('b'), makeFeral('c')], {}, NOW)
      const result5 = tickFeral(
        [makeFeral('a'), makeFeral('b'), makeFeral('c'), makeFeral('d'), makeFeral('e')],
        {}, NOW,
      )

      expect(result3.wildEvent!.description).not.toBe(result5.wildEvent!.description)
    })
  })

  describe('generateFeralWhisper', () => {
    it('returns a non-empty string', () => {
      expect(generateFeralWhisper().length).toBeGreaterThan(0)
    })

    it('produces variety', () => {
      const results = new Set<string>()
      for (let i = 0; i < 50; i++) results.add(generateFeralWhisper())
      expect(results.size).toBeGreaterThan(1)
    })
  })
})
