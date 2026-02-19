import { describe, it, expect } from 'vitest'
import {
  generateEncounter,
  calculateInterference,
  resolveEncounter,
  isEncounterActive,
  type Encounter,
} from './Encounters'
import type { ThinPlace } from './ThinPlaces'

function makeThinPlace(overrides: Partial<ThinPlace> = {}): ThinPlace {
  return {
    id: 'stonehenge',
    type: 'fixed',
    center: { lat: 51.18, lng: -1.83 },
    radiusMeters: 200,
    veilStrength: 0.2,
    createdAt: 0,
    createdBy: null,
    ritualActivity: 0,
    ...overrides,
  }
}

// ─── generateEncounter ─────────────────────────────────────────────────────

describe('generateEncounter', () => {
  it('returns null when seed exceeds encounter chance', () => {
    const tp = makeThinPlace({ veilStrength: 1.0 }) // weakest, ~15% base
    // seed=0.99 → above any possible chance
    expect(generateEncounter(tp, 0, 0.99)).toBeNull()
  })

  it('returns an encounter when seed is below encounter chance', () => {
    const tp = makeThinPlace({ veilStrength: 0 }) // strongest, 100% chance
    const enc = generateEncounter(tp, 1000, 0.0)
    expect(enc).not.toBeNull()
    expect(enc!.thinPlaceId).toBe('stonehenge')
    expect(enc!.bound).toBe(false)
  })

  it('assigns higher interference for thinner veils', () => {
    const thin = makeThinPlace({ veilStrength: 0.1 })
    const thick = makeThinPlace({ veilStrength: 0.9 })
    const encThin = generateEncounter(thin, 0, 0.05)!
    const encThick = generateEncounter(thick, 0, 0.05)!
    expect(encThin.interferenceLevel).toBeGreaterThan(encThick.interferenceLevel)
  })

  it('generates a valid demonId', () => {
    const tp = makeThinPlace({ veilStrength: 0 })
    const enc = generateEncounter(tp, 0, 0.0)!
    expect(typeof enc.demonId).toBe('string')
    expect(enc.demonId.length).toBeGreaterThan(0)
  })
})

// ─── calculateInterference ─────────────────────────────────────────────────

describe('calculateInterference', () => {
  function makeEncounter(interferenceLevel: number): Encounter {
    return {
      id: 'test-enc',
      demonId: 'bael',
      thinPlaceId: 'stonehenge',
      startedAt: 0,
      interferenceLevel,
      bound: false,
    }
  }

  it('returns zero effects for interferenceLevel=0', () => {
    const fx = calculateInterference(makeEncounter(0))
    expect(fx.nodePositionNoise).toBe(0)
    expect(fx.sealAlphaReduction).toBe(0)
    expect(fx.colourTint).toBeNull()
    expect(fx.glyphThresholdBump).toBe(0)
  })

  it('returns max effects for interferenceLevel=1', () => {
    const fx = calculateInterference(makeEncounter(1))
    expect(fx.nodePositionNoise).toBeCloseTo(0.05)
    expect(fx.sealAlphaReduction).toBeCloseTo(0.4)
    expect(fx.colourTint).not.toBeNull()
    expect(fx.glyphThresholdBump).toBeCloseTo(0.15)
  })

  it('applies colour tint only when interferenceLevel > 0.5', () => {
    expect(calculateInterference(makeEncounter(0.4)).colourTint).toBeNull()
    expect(calculateInterference(makeEncounter(0.6)).colourTint).not.toBeNull()
  })
})

// ─── resolveEncounter ──────────────────────────────────────────────────────

describe('resolveEncounter', () => {
  it('marks the encounter as bound', () => {
    const enc: Encounter = {
      id: 'e', demonId: 'bael', thinPlaceId: 'tp', startedAt: 0, interferenceLevel: 0.5, bound: false,
    }
    expect(resolveEncounter(enc).bound).toBe(true)
  })

  it('does not mutate the original', () => {
    const enc: Encounter = {
      id: 'e', demonId: 'bael', thinPlaceId: 'tp', startedAt: 0, interferenceLevel: 0.5, bound: false,
    }
    resolveEncounter(enc)
    expect(enc.bound).toBe(false)
  })
})

// ─── isEncounterActive ─────────────────────────────────────────────────────

describe('isEncounterActive', () => {
  it('returns true for a fresh, unbound encounter', () => {
    const enc: Encounter = {
      id: 'e', demonId: 'bael', thinPlaceId: 'tp', startedAt: 1000, interferenceLevel: 0.5, bound: false,
    }
    expect(isEncounterActive(enc, 2000)).toBe(true)
  })

  it('returns false for a bound encounter', () => {
    const enc: Encounter = {
      id: 'e', demonId: 'bael', thinPlaceId: 'tp', startedAt: 1000, interferenceLevel: 0.5, bound: true,
    }
    expect(isEncounterActive(enc, 2000)).toBe(false)
  })

  it('returns false after 10 minutes', () => {
    const enc: Encounter = {
      id: 'e', demonId: 'bael', thinPlaceId: 'tp', startedAt: 0, interferenceLevel: 0.5, bound: false,
    }
    expect(isEncounterActive(enc, 10 * 60 * 1000 + 1)).toBe(false)
  })
})
