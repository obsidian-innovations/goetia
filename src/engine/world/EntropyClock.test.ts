import { describe, it, expect } from 'vitest'
import {
  createEntropyState,
  recordEntropyEvent,
  getEntropyEffects,
  getNewlyTriggered,
  isThresholdTriggered,
} from '../world/EntropyClock'

// ─── createEntropyState ───────────────────────────────────────────────────

describe('createEntropyState', () => {
  it('starts at counter 0', () => {
    const state = createEntropyState()
    expect(state.counter).toBe(0)
    expect(state.events.sigil_created).toBe(0)
    expect(state.thresholds.every(t => !t.triggered)).toBe(true)
  })
})

// ─── recordEntropyEvent ───────────────────────────────────────────────────

describe('recordEntropyEvent', () => {
  it('increments counter with event weight', () => {
    let state = createEntropyState()
    state = recordEntropyEvent(state, 'sigil_created')
    expect(state.counter).toBe(1)
    expect(state.events.sigil_created).toBe(1)
  })

  it('sigil_created adds 1, sigil_corrupted adds 3, sigil_destroyed adds 5', () => {
    const s0 = createEntropyState()

    const s1 = recordEntropyEvent(s0, 'sigil_created')
    expect(s1.counter).toBe(1)

    const s2 = recordEntropyEvent(s0, 'sigil_corrupted')
    expect(s2.counter).toBe(3)

    const s3 = recordEntropyEvent(s0, 'sigil_destroyed')
    expect(s3.counter).toBe(5)
  })
})

// ─── thresholds ───────────────────────────────────────────────────────────

describe('thresholds', () => {
  it('trigger at correct values', () => {
    let state = createEntropyState()
    // Add 100 created sigils to reach the first threshold (100)
    for (let i = 0; i < 100; i++) {
      state = recordEntropyEvent(state, 'sigil_created')
    }
    expect(state.counter).toBe(100)
    expect(isThresholdTriggered(state, 'new_encounters')).toBe(true)
    expect(isThresholdTriggered(state, 'thin_place_mutation')).toBe(false)
  })
})

// ─── getEntropyEffects ────────────────────────────────────────────────────

describe('getEntropyEffects', () => {
  it('reflects triggered thresholds', () => {
    const state = createEntropyState()
    const effects = getEntropyEffects(state)
    expect(effects.newEncounterDemons).toBe(false)
    expect(effects.autoKingEvents).toBe(false)
    expect(effects.glyphDifficultyIncrease).toBe(0)
  })

  it('reflects new_encounters when triggered', () => {
    let state = createEntropyState()
    for (let i = 0; i < 100; i++) {
      state = recordEntropyEvent(state, 'sigil_created')
    }
    const effects = getEntropyEffects(state)
    expect(effects.newEncounterDemons).toBe(true)
  })
})

// ─── getNewlyTriggered ────────────────────────────────────────────────────

describe('getNewlyTriggered', () => {
  it('returns only newly triggered thresholds', () => {
    let before = createEntropyState()
    // Bring to 99
    for (let i = 0; i < 99; i++) {
      before = recordEntropyEvent(before, 'sigil_created')
    }
    expect(isThresholdTriggered(before, 'new_encounters')).toBe(false)

    // One more pushes to 100
    const after = recordEntropyEvent(before, 'sigil_created')
    const newly = getNewlyTriggered(before, after)

    expect(newly).toHaveLength(1)
    expect(newly[0].label).toBe('new_encounters')
  })
})

// ─── isThresholdTriggered ─────────────────────────────────────────────────

describe('isThresholdTriggered', () => {
  it('checks specific labels', () => {
    const state = createEntropyState()
    expect(isThresholdTriggered(state, 'new_encounters')).toBe(false)
    expect(isThresholdTriggered(state, 'auto_king_events')).toBe(false)
    expect(isThresholdTriggered(state, 'nonexistent_label')).toBe(false)
  })
})
