import { describe, it, expect } from 'vitest'
import {
  createObservationState,
  observeClash,
  recordObservation,
  clearObservations,
  getTotalCorruptionAbsorbed,
} from '../social/SpectralObservation'
import type { ClashResult } from '@engine/pvp/ClashResolver'

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockClashResult(): ClashResult {
  return {
    outcome: 'contested_win',
    winner: 'attacker',
    attackerDamage: 0.05,
    defenderDamage: 0.08,
    score: 0.3,
    details: 'test',
  }
}

// ─── createObservationState ─────────────────────────────────────────────────

describe('createObservationState', () => {
  it('creates empty state', () => {
    const state = createObservationState()
    expect(state.activeObservations).toHaveLength(0)
    expect(state.totalXp).toBe(0)
  })
})

// ─── observeClash ───────────────────────────────────────────────────────────

describe('observeClash', () => {
  it('returns zero corruption when out of range', () => {
    const result = observeClash(mockClashResult(), false)
    expect(result.corruptionAbsorbed).toBe(0)
    expect(result.wasInRange).toBe(false)
    expect(result.observationXp).toBe(0)
  })

  it('returns 2% of total damage when in range', () => {
    const clash = mockClashResult()
    const result = observeClash(clash, true)
    // total damage = 0.05 + 0.08 = 0.13, 2% = 0.0026
    expect(result.corruptionAbsorbed).toBeCloseTo(0.0026)
    expect(result.wasInRange).toBe(true)
  })
})

// ─── recordObservation ──────────────────────────────────────────────────────

describe('recordObservation', () => {
  it('accumulates XP', () => {
    let state = createObservationState()
    const obs = observeClash(mockClashResult(), true)
    state = recordObservation(state, obs)
    expect(state.activeObservations).toHaveLength(1)
    expect(state.totalXp).toBeGreaterThan(0)
  })

  it('does not record out-of-range observations', () => {
    let state = createObservationState()
    const obs = observeClash(mockClashResult(), false)
    state = recordObservation(state, obs)
    expect(state.activeObservations).toHaveLength(0)
    expect(state.totalXp).toBe(0)
  })
})

// ─── clearObservations ──────────────────────────────────────────────────────

describe('clearObservations', () => {
  it('empties active list', () => {
    let state = createObservationState()
    const obs = observeClash(mockClashResult(), true)
    state = recordObservation(state, obs)
    state = clearObservations(state)
    expect(state.activeObservations).toHaveLength(0)
  })
})

// ─── getTotalCorruptionAbsorbed ─────────────────────────────────────────────

describe('getTotalCorruptionAbsorbed', () => {
  it('sums all observations', () => {
    let state = createObservationState()
    const obs1 = observeClash(mockClashResult(), true)
    const obs2 = observeClash(mockClashResult(), true)
    state = recordObservation(state, obs1)
    state = recordObservation(state, obs2)
    // Each is 0.0026, total ≈ 0.0052
    expect(getTotalCorruptionAbsorbed(state)).toBeCloseTo(0.0052)
  })
})
