import { describe, it, expect } from 'vitest'
import {
  createDefaultConditions,
  velocityToMovement,
  luminanceToDarkness,
  audioLevelToSilence,
  calculateConditionModifiers,
  getStackedChargeMultiplier,
} from './ConditionsEngine'
import type { RitualConditions } from './ConditionsEngine'

describe('ConditionsEngine', () => {
  // ── Default conditions ──────────────────────────────────────────────────

  describe('createDefaultConditions', () => {
    it('returns neutral conditions', () => {
      const c = createDefaultConditions()
      expect(c.darkness).toBe(0)
      expect(c.movement).toBe(0)
      expect(c.silence).toBe(0.5) // neutral — no mic = no bonus/penalty
      expect(c.rhythmic).toBe(false)
      expect(c.thinPlaceMultiplier).toBe(1.0)
      expect(c.temporalMultiplier).toBe(1.0)
    })
  })

  // ── Conversion helpers ──────────────────────────────────────────────────

  describe('velocityToMovement', () => {
    it('returns 0 for null speed', () => {
      expect(velocityToMovement(null)).toBe(0)
    })

    it('returns 0 for zero speed', () => {
      expect(velocityToMovement(0)).toBe(0)
    })

    it('returns 0 for negative speed', () => {
      expect(velocityToMovement(-1)).toBe(0)
    })

    it('scales linearly up to MAX_VELOCITY_MS (3.0)', () => {
      expect(velocityToMovement(1.5)).toBeCloseTo(0.5, 2)
    })

    it('clamps to 1 at high speeds', () => {
      expect(velocityToMovement(10)).toBe(1)
    })
  })

  describe('luminanceToDarkness', () => {
    it('returns 1 for total darkness', () => {
      expect(luminanceToDarkness(0)).toBe(1)
    })

    it('returns 0 for maximum brightness', () => {
      expect(luminanceToDarkness(255)).toBe(0)
    })

    it('returns ~0.5 for mid-brightness', () => {
      expect(luminanceToDarkness(127)).toBeCloseTo(0.502, 2)
    })
  })

  describe('audioLevelToSilence', () => {
    it('returns 1 for no audio', () => {
      expect(audioLevelToSilence(0)).toBe(1)
    })

    it('returns 0 for maximum audio', () => {
      expect(audioLevelToSilence(1)).toBe(0)
    })

    it('clamps out-of-range values', () => {
      expect(audioLevelToSilence(-0.5)).toBe(1)
      expect(audioLevelToSilence(1.5)).toBe(0)
    })
  })

  // ── Condition modifiers ─────────────────────────────────────────────────

  describe('calculateConditionModifiers', () => {
    it('returns zero modifiers for neutral conditions', () => {
      const mods = calculateConditionModifiers(createDefaultConditions())
      expect(mods.ringBonus).toBe(0)
      expect(mods.sealPenalty).toBe(0)
      expect(mods.coherenceBonus).toBe(0)
      expect(mods.chargeBonus).toBe(0)
      expect(mods.chargePenalty).toBeGreaterThanOrEqual(0)
      expect(mods.coherenceRhythmBonus).toBe(0)
    })

    it('gives ring bonus in darkness', () => {
      const c: RitualConditions = { ...createDefaultConditions(), darkness: 0.8 }
      const mods = calculateConditionModifiers(c)
      expect(mods.ringBonus).toBeGreaterThan(0)
      expect(mods.ringBonus).toBeLessThanOrEqual(0.05)
    })

    it('gives max ring bonus at full darkness', () => {
      const c: RitualConditions = { ...createDefaultConditions(), darkness: 1.0 }
      const mods = calculateConditionModifiers(c)
      expect(mods.ringBonus).toBeCloseTo(0.05, 4)
    })

    it('gives no ring bonus below darkness threshold', () => {
      const c: RitualConditions = { ...createDefaultConditions(), darkness: 0.5 }
      const mods = calculateConditionModifiers(c)
      expect(mods.ringBonus).toBe(0)
    })

    it('gives seal penalty and coherence bonus during movement', () => {
      const c: RitualConditions = { ...createDefaultConditions(), movement: 0.8 }
      const mods = calculateConditionModifiers(c)
      expect(mods.sealPenalty).toBeGreaterThan(0)
      expect(mods.sealPenalty).toBeLessThanOrEqual(0.03)
      expect(mods.coherenceBonus).toBeGreaterThan(0)
      expect(mods.coherenceBonus).toBeLessThanOrEqual(0.05)
    })

    it('gives no movement effects below threshold', () => {
      const c: RitualConditions = { ...createDefaultConditions(), movement: 0.2 }
      const mods = calculateConditionModifiers(c)
      expect(mods.sealPenalty).toBe(0)
      expect(mods.coherenceBonus).toBe(0)
    })

    it('gives charge bonus in silence', () => {
      const c: RitualConditions = { ...createDefaultConditions(), silence: 0.8 }
      const mods = calculateConditionModifiers(c)
      expect(mods.chargeBonus).toBeGreaterThan(0)
      expect(mods.chargeBonus).toBeLessThanOrEqual(0.04)
    })

    it('gives charge penalty from noise', () => {
      const c: RitualConditions = { ...createDefaultConditions(), silence: 0.1 }
      const mods = calculateConditionModifiers(c)
      expect(mods.chargePenalty).toBeGreaterThan(0)
      expect(mods.chargePenalty).toBeLessThanOrEqual(0.03)
    })

    it('gives coherence rhythm bonus when rhythmic', () => {
      const c: RitualConditions = { ...createDefaultConditions(), rhythmic: true }
      const mods = calculateConditionModifiers(c)
      expect(mods.coherenceRhythmBonus).toBe(0.05)
    })
  })

  // ── Stacked charge multiplier ──────────────────────────────────────────

  describe('getStackedChargeMultiplier', () => {
    it('returns 1.0 for neutral conditions', () => {
      const c = createDefaultConditions()
      const mods = calculateConditionModifiers(c)
      expect(getStackedChargeMultiplier(c, mods)).toBeCloseTo(1.0, 2)
    })

    it('stacks with thin place multiplier', () => {
      const c: RitualConditions = { ...createDefaultConditions(), thinPlaceMultiplier: 1.5 }
      const mods = calculateConditionModifiers(c)
      expect(getStackedChargeMultiplier(c, mods)).toBeCloseTo(1.5, 2)
    })

    it('stacks with temporal multiplier', () => {
      const c: RitualConditions = { ...createDefaultConditions(), temporalMultiplier: 2.0 }
      const mods = calculateConditionModifiers(c)
      expect(getStackedChargeMultiplier(c, mods)).toBeCloseTo(2.0, 2)
    })

    it('combines silence bonus with multipliers', () => {
      const c: RitualConditions = {
        ...createDefaultConditions(),
        silence: 1.0,
        thinPlaceMultiplier: 1.2,
        temporalMultiplier: 1.5,
      }
      const mods = calculateConditionModifiers(c)
      const result = getStackedChargeMultiplier(c, mods)
      expect(result).toBeGreaterThan(1.5) // base 1.04 * 1.2 * 1.5
    })

    it('never returns negative', () => {
      const c: RitualConditions = {
        ...createDefaultConditions(),
        silence: 0,
        thinPlaceMultiplier: 0.1,
        temporalMultiplier: 0.1,
      }
      const mods = calculateConditionModifiers(c)
      expect(getStackedChargeMultiplier(c, mods)).toBeGreaterThanOrEqual(0)
    })
  })
})
