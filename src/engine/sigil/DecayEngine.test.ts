import { describe, it, expect } from 'vitest'
import {
  createDecayState,
  calculateDecay,
  applyDecay,
  recordRebind,
  isAncient,
  processDecayBatch,
} from './DecayEngine'
import type { DecayState } from './DecayEngine'
import type { Sigil } from './Types'
import type { TemporalModifiers } from '@engine/temporal/TemporalEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000

function makeSigil(overrides: Partial<Sigil> = {}): Sigil {
  return {
    id: 'sig-1',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.85,
    visualState: 'charged',
    status: 'charged',
    createdAt: Date.now() - MS_PER_DAY * 30,
    statusChangedAt: Date.now() - MS_PER_DAY * 10,
    ...overrides,
  }
}

function makeDecayState(overrides: Partial<DecayState> = {}): DecayState {
  return {
    sigilId: 'sig-1',
    lastDecayCheck: Date.now() - MS_PER_DAY * 10,
    rebindCount: 0,
    totalDecayed: 0,
    ...overrides,
  }
}

function makeTemporalMods(overrides: Partial<TemporalModifiers> = {}): TemporalModifiers {
  return {
    chargeMultiplier: 1.0,
    corruptionMultiplier: 1.0,
    purificationMultiplier: 1.0,
    veilReduction: 0.0,
    isWitchingHour: false,
    isSolstice: false,
    isEquinox: false,
    moonPhase: { phase: 'full', illumination: 1.0, daysSinceNew: 14.77 },
    ...overrides,
  }
}

// ─── createDecayState ───────────────────────────────────────────────────────

describe('createDecayState', () => {
  it('creates a fresh decay state', () => {
    const now = Date.now()
    const state = createDecayState('sig-1', now)
    expect(state.sigilId).toBe('sig-1')
    expect(state.lastDecayCheck).toBe(now)
    expect(state.rebindCount).toBe(0)
    expect(state.totalDecayed).toBe(0)
  })
})

// ─── calculateDecay ─────────────────────────────────────────────────────────

describe('calculateDecay', () => {
  it('returns null for non-decayable statuses', () => {
    for (const status of ['draft', 'complete', 'resting', 'spent'] as const) {
      const sigil = makeSigil({ status })
      const result = calculateDecay(sigil, makeDecayState(), Date.now())
      expect(result).toBeNull()
    }
  })

  it('returns null if no time has elapsed', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged' })
    const state = makeDecayState({ lastDecayCheck: now })
    expect(calculateDecay(sigil, state, now)).toBeNull()
  })

  it('decays 0.01 per day for charged sigils', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    expect(result!.decayed).toBeCloseTo(0.10, 5)
    expect(result!.newIntegrity).toBeCloseTo(0.75, 5)
  })

  it('decays awakened sigils too', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'awakened', overallIntegrity: 0.90 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 5 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    expect(result!.decayed).toBeCloseTo(0.05, 5)
    expect(result!.newIntegrity).toBeCloseTo(0.85, 5)
  })

  it('doubles decay during witching hour', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const mods = makeTemporalMods({ isWitchingHour: true })
    const result = calculateDecay(sigil, state, now, mods)
    expect(result).not.toBeNull()
    expect(result!.decayed).toBeCloseTo(0.20, 5)
  })

  it('amplifies decay with corruption scar (1.5x)', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const result = calculateDecay(sigil, state, now, undefined, true)
    expect(result).not.toBeNull()
    expect(result!.decayed).toBeCloseTo(0.15, 5)
  })

  it('halves decay for ancient sigils', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10, rebindCount: 3 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    expect(result!.decayed).toBeCloseTo(0.05, 5)
    expect(result!.isAncient).toBe(true)
  })

  it('clamps integrity to zero', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.02 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    expect(result!.newIntegrity).toBe(0)
    expect(result!.decayed).toBeCloseTo(0.02, 5)
  })

  it('flags needsRebinding when below 0.30', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.35 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    // 0.35 - 0.10 = 0.25 < 0.30
    expect(result!.needsRebinding).toBe(true)
  })

  it('does not flag needsRebinding when above 0.30', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const result = calculateDecay(sigil, state, now)
    expect(result).not.toBeNull()
    expect(result!.needsRebinding).toBe(false)
  })

  it('stacks witching hour and corruption scar', () => {
    const now = Date.now()
    const sigil = makeSigil({ status: 'charged', overallIntegrity: 0.85 })
    const state = makeDecayState({ lastDecayCheck: now - MS_PER_DAY * 10 })
    const mods = makeTemporalMods({ isWitchingHour: true })
    const result = calculateDecay(sigil, state, now, mods, true)
    expect(result).not.toBeNull()
    // 0.01 * 2.0 * 1.5 * 10 = 0.30
    expect(result!.decayed).toBeCloseTo(0.30, 5)
  })
})

// ─── applyDecay ─────────────────────────────────────────────────────────────

describe('applyDecay', () => {
  it('returns sigil with updated integrity and visual state', () => {
    const sigil = makeSigil({ overallIntegrity: 0.85, visualState: 'charged' })
    const result = { newIntegrity: 0.75, decayed: 0.10, needsRebinding: false, isAncient: false }
    const updated = applyDecay(sigil, result)
    expect(updated.overallIntegrity).toBe(0.75)
    expect(updated.visualState).toBe('healthy')
  })

  it('sets corrupted visual state below 0.30', () => {
    const sigil = makeSigil({ overallIntegrity: 0.35 })
    const result = { newIntegrity: 0.25, decayed: 0.10, needsRebinding: true, isAncient: false }
    const updated = applyDecay(sigil, result)
    expect(updated.visualState).toBe('corrupted')
  })

  it('sets unstable visual state between 0.30 and 0.60', () => {
    const sigil = makeSigil({ overallIntegrity: 0.55 })
    const result = { newIntegrity: 0.45, decayed: 0.10, needsRebinding: false, isAncient: false }
    const updated = applyDecay(sigil, result)
    expect(updated.visualState).toBe('unstable')
  })

  it('ancient sigils always show healthy visual state', () => {
    const sigil = makeSigil({ overallIntegrity: 0.25 })
    const result = { newIntegrity: 0.20, decayed: 0.05, needsRebinding: true, isAncient: true }
    const updated = applyDecay(sigil, result)
    expect(updated.visualState).toBe('healthy')
    expect(updated.isAncient).toBe(true)
  })
})

// ─── recordRebind ───────────────────────────────────────────────────────────

describe('recordRebind', () => {
  it('increments rebind count', () => {
    const state = makeDecayState({ rebindCount: 1 })
    const now = Date.now()
    const updated = recordRebind(state, now)
    expect(updated.rebindCount).toBe(2)
    expect(updated.lastDecayCheck).toBe(now)
  })

  it('preserves other state fields', () => {
    const state = makeDecayState({ rebindCount: 2, totalDecayed: 0.15 })
    const updated = recordRebind(state, Date.now())
    expect(updated.totalDecayed).toBe(0.15)
    expect(updated.sigilId).toBe('sig-1')
  })
})

// ─── isAncient ──────────────────────────────────────────────────────────────

describe('isAncient', () => {
  it('returns false for rebindCount < 3', () => {
    expect(isAncient(makeDecayState({ rebindCount: 0 }))).toBe(false)
    expect(isAncient(makeDecayState({ rebindCount: 2 }))).toBe(false)
  })

  it('returns true for rebindCount >= 3', () => {
    expect(isAncient(makeDecayState({ rebindCount: 3 }))).toBe(true)
    expect(isAncient(makeDecayState({ rebindCount: 5 }))).toBe(true)
  })
})

// ─── processDecayBatch ──────────────────────────────────────────────────────

describe('processDecayBatch', () => {
  it('skips non-decayable sigils', () => {
    const now = Date.now()
    const sigils = [makeSigil({ id: 's1', status: 'draft' }), makeSigil({ id: 's2', status: 'spent' })]
    const { updatedSigils } = processDecayBatch(sigils, {}, now)
    expect(updatedSigils).toHaveLength(0)
  })

  it('creates decay state for newly encountered decayable sigils', () => {
    const now = Date.now()
    const sigils = [makeSigil({ id: 's1', status: 'charged' })]
    const { updatedSigils, updatedDecayStates } = processDecayBatch(sigils, {}, now)
    // First encounter: creates state but doesn't decay
    expect(updatedSigils).toHaveLength(0)
    expect(updatedDecayStates['s1']).toBeDefined()
    expect(updatedDecayStates['s1'].lastDecayCheck).toBe(now)
  })

  it('decays existing charged sigils', () => {
    const now = Date.now()
    const sigils = [makeSigil({ id: 's1', status: 'charged', overallIntegrity: 0.85 })]
    const states: Record<string, DecayState> = {
      's1': makeDecayState({ sigilId: 's1', lastDecayCheck: now - MS_PER_DAY * 10 }),
    }
    const { updatedSigils, updatedDecayStates } = processDecayBatch(sigils, states, now)
    expect(updatedSigils).toHaveLength(1)
    expect(updatedSigils[0].overallIntegrity).toBeCloseTo(0.75, 5)
    expect(updatedDecayStates['s1'].lastDecayCheck).toBe(now)
    expect(updatedDecayStates['s1'].totalDecayed).toBeCloseTo(0.10, 5)
  })

  it('processes multiple sigils', () => {
    const now = Date.now()
    const sigils = [
      makeSigil({ id: 's1', status: 'charged', overallIntegrity: 0.85 }),
      makeSigil({ id: 's2', status: 'awakened', overallIntegrity: 0.90 }),
      makeSigil({ id: 's3', status: 'draft' }),
    ]
    const states: Record<string, DecayState> = {
      's1': makeDecayState({ sigilId: 's1', lastDecayCheck: now - MS_PER_DAY * 5 }),
      's2': makeDecayState({ sigilId: 's2', lastDecayCheck: now - MS_PER_DAY * 5 }),
    }
    const { updatedSigils } = processDecayBatch(sigils, states, now)
    expect(updatedSigils).toHaveLength(2)
  })

  it('passes temporal modifiers and scar set through', () => {
    const now = Date.now()
    const sigils = [makeSigil({ id: 's1', status: 'charged', overallIntegrity: 0.85 })]
    const states: Record<string, DecayState> = {
      's1': makeDecayState({ sigilId: 's1', lastDecayCheck: now - MS_PER_DAY * 10 }),
    }
    const mods = makeTemporalMods({ isWitchingHour: true })
    const scars = new Set(['s1'])
    const { updatedSigils } = processDecayBatch(sigils, states, now, mods, scars)
    // 0.01 * 2.0 * 1.5 * 10 = 0.30
    expect(updatedSigils[0].overallIntegrity).toBeCloseTo(0.55, 5)
  })
})
