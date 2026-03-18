import { describe, it, expect } from 'vitest'
import {
  createCollectiveRitual,
  addContribution,
  isRitualComplete,
  getAverageIntegrity,
  getCorruptionPerPlayer,
  completeRitual,
  betrayRitual,
  getWeightedIntegrity,
} from '../social/CollectiveRitual'
import { createCoven } from '../social/CovenEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSealContribution(playerId = 'p1', quality = 0.8) {
  return { playerId, layer: 'seal' as const, quality }
}

function makeGlyphContribution(playerId = 'p2', quality = 0.6) {
  return { playerId, layer: 'glyphs' as const, quality }
}

function makeRingContribution(playerId = 'p3', quality = 0.7) {
  return { playerId, layer: 'ring' as const, quality }
}

function fullRitualState() {
  let state = createCollectiveRitual('cov-1', 'bael', 1000)
  state = addContribution(state, makeSealContribution())
  state = addContribution(state, makeGlyphContribution())
  state = addContribution(state, makeRingContribution())
  return state
}

// ─── createCollectiveRitual ─────────────────────────────────────────────────

describe('createCollectiveRitual', () => {
  it('creates correct initial state', () => {
    const state = createCollectiveRitual('cov-1', 'bael', 1000)
    expect(state.covenId).toBe('cov-1')
    expect(state.demonId).toBe('bael')
    expect(state.phase).toBe('gathering')
    expect(state.contributions).toHaveLength(0)
    expect(state.result).toBeNull()
    expect(state.betrayal).toBeNull()
  })
})

// ─── addContribution ────────────────────────────────────────────────────────

describe('addContribution', () => {
  it('adds to correct layer', () => {
    let state = createCollectiveRitual('cov-1', 'bael', 0)
    state = addContribution(state, makeSealContribution())
    expect(state.contributions).toHaveLength(1)
    expect(state.contributions[0].layer).toBe('seal')
    expect(state.phase).toBe('drawing')
  })

  it('rejects duplicate layers', () => {
    let state = createCollectiveRitual('cov-1', 'bael', 0)
    state = addContribution(state, makeSealContribution('p1'))
    state = addContribution(state, makeSealContribution('p2'))
    expect(state.contributions).toHaveLength(1)
  })
})

// ─── isRitualComplete ───────────────────────────────────────────────────────

describe('isRitualComplete', () => {
  it('returns true when all 3 layers present', () => {
    const state = fullRitualState()
    expect(isRitualComplete(state)).toBe(true)
  })

  it('returns false when layers are missing', () => {
    let state = createCollectiveRitual('cov-1', 'bael', 0)
    state = addContribution(state, makeSealContribution())
    expect(isRitualComplete(state)).toBe(false)
  })
})

// ─── getAverageIntegrity ────────────────────────────────────────────────────

describe('getAverageIntegrity', () => {
  it('averages contributions', () => {
    const state = fullRitualState()
    // (0.8 + 0.6 + 0.7) / 3 = 0.7
    expect(getAverageIntegrity(state)).toBeCloseTo(0.7)
  })

  it('returns 0 for no contributions', () => {
    const state = createCollectiveRitual('cov-1', 'bael', 0)
    expect(getAverageIntegrity(state)).toBe(0)
  })
})

// ─── getCorruptionPerPlayer ─────────────────────────────────────────────────

describe('getCorruptionPerPlayer', () => {
  it('splits base corruption cost among contributors', () => {
    const state = fullRitualState()
    // 0.15 / 3 = 0.05
    expect(getCorruptionPerPlayer(state)).toBeCloseTo(0.05)
  })
})

// ─── completeRitual ─────────────────────────────────────────────────────────

describe('completeRitual', () => {
  it('produces a valid sigil with correct integrity', () => {
    const state = fullRitualState()
    const completed = completeRitual(state, 2000)
    expect(completed.phase).toBe('complete')
    expect(completed.result).not.toBeNull()
    expect(completed.result!.overallIntegrity).toBeCloseTo(0.7)
    expect(completed.result!.demonId).toBe('bael')
    expect(completed.result!.status).toBe('complete')
  })
})

// ─── betrayRitual ───────────────────────────────────────────────────────────

describe('betrayRitual', () => {
  it('shatters and records betrayal', () => {
    const state = fullRitualState()
    const covenState = createCoven('Circle', 'p1', 0)
    const { ritualState, covenState: updatedCoven } = betrayRitual(state, 'p1', covenState, 3000)
    expect(ritualState.phase).toBe('shattered')
    expect(ritualState.betrayal).not.toBeNull()
    expect(ritualState.betrayal!.betrayerId).toBe('p1')
    expect(ritualState.result).toBeNull()
    // Betrayals recorded for non-betrayer contributors (p2 and p3)
    expect(updatedCoven.betrayals.length).toBeGreaterThanOrEqual(2)
  })
})

// ─── getWeightedIntegrity ───────────────────────────────────────────────────

describe('getWeightedIntegrity', () => {
  it('applies member weights', () => {
    const state = fullRitualState()
    const weights = new Map<string, number>([
      ['p1', 2.0],
      ['p2', 1.0],
      ['p3', 1.0],
    ])
    // weighted = (0.8*2 + 0.6*1 + 0.7*1) / (2+1+1) = 2.9/4 = 0.725
    expect(getWeightedIntegrity(state, weights)).toBeCloseTo(0.725)
  })
})
