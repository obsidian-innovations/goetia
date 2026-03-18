import { describe, it, expect } from 'vitest'
import {
  createGlobalMemory,
  recordHexUse,
  recordPurification,
  recordBinding,
  addFamiliarity,
  getDemonPersonality,
  getAdjustedEscalation,
} from '../social/Anamnesis'

// ─── createGlobalMemory ─────────────────────────────────────────────────────

describe('createGlobalMemory', () => {
  it('creates empty state', () => {
    const mem = createGlobalMemory()
    expect(mem.treatments.size).toBe(0)
  })
})

// ─── recordHexUse ───────────────────────────────────────────────────────────

describe('recordHexUse', () => {
  it('increments hex count', () => {
    let mem = createGlobalMemory()
    mem = recordHexUse(mem, 'bael')
    mem = recordHexUse(mem, 'bael')
    expect(mem.treatments.get('bael')!.hexUses).toBe(2)
  })
})

// ─── recordPurification ─────────────────────────────────────────────────────

describe('recordPurification', () => {
  it('increments purification count', () => {
    let mem = createGlobalMemory()
    mem = recordPurification(mem, 'bael')
    expect(mem.treatments.get('bael')!.purifications).toBe(1)
  })
})

// ─── recordBinding ──────────────────────────────────────────────────────────

describe('recordBinding', () => {
  it('increments binding count', () => {
    let mem = createGlobalMemory()
    mem = recordBinding(mem, 'bael')
    mem = recordBinding(mem, 'bael')
    mem = recordBinding(mem, 'bael')
    expect(mem.treatments.get('bael')!.bindings).toBe(3)
  })
})

// ─── getDemonPersonality ────────────────────────────────────────────────────

describe('getDemonPersonality', () => {
  it('returns neutral for untreated demon', () => {
    const mem = createGlobalMemory()
    const p = getDemonPersonality(mem, 'unknown-demon')
    expect(p.demandShift).toBe(0)
    expect(p.anomalousEncounters).toBe(false)
    expect(p.bindingDifficultyMultiplier).toBe(1.0)
  })

  it('returns positive demandShift after many hex uses (>10)', () => {
    let mem = createGlobalMemory()
    for (let i = 0; i < 15; i++) {
      mem = recordHexUse(mem, 'bael')
    }
    const p = getDemonPersonality(mem, 'bael')
    expect(p.demandShift).toBeGreaterThan(0)
  })

  it('returns anomalousEncounters after high collective familiarity (>=50)', () => {
    let mem = createGlobalMemory()
    mem = addFamiliarity(mem, 'bael', 50)
    const p = getDemonPersonality(mem, 'bael')
    expect(p.anomalousEncounters).toBe(true)
  })
})

// ─── getAdjustedEscalation ──────────────────────────────────────────────────

describe('getAdjustedEscalation', () => {
  it('modifies baseline by personality', () => {
    let mem = createGlobalMemory()
    // With no treatment, shift is 0 → adjusted = baseline
    expect(getAdjustedEscalation(mem, 'bael', 0.5)).toBeCloseTo(0.5)

    // After many hexes, shift > 0 → adjusted > baseline
    for (let i = 0; i < 15; i++) {
      mem = recordHexUse(mem, 'bael')
    }
    expect(getAdjustedEscalation(mem, 'bael', 0.5)).toBeGreaterThan(0.5)
  })
})
