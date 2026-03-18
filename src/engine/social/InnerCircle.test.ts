import { describe, it, expect } from 'vitest'
import {
  createHierarchy,
  initFromCoven,
  recordContribution,
  recordParticipation,
  recordAbsence,
  applyBetrayalPenalty,
  getNormalizedWeight,
  getRanking,
  tickHierarchy,
} from '../social/InnerCircle'
import { createCoven, inviteMember } from '../social/CovenEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

function covenWith3Members() {
  let state = createCoven('Circle', 'p1', 0)
  state = inviteMember(state, 'p2')
  state = inviteMember(state, 'p3')
  return state
}

// ─── createHierarchy ────────────────────────────────────────────────────────

describe('createHierarchy', () => {
  it('creates empty state', () => {
    const h = createHierarchy()
    expect(h.weights.size).toBe(0)
  })
})

// ─── initFromCoven ──────────────────────────────────────────────────────────

describe('initFromCoven', () => {
  it('initializes all members with defaults', () => {
    const coven = covenWith3Members()
    const h = initFromCoven(coven)
    expect(h.weights.size).toBe(3)
    const w = h.weights.get('p1')!
    expect(w.contribution).toBe(0)
    expect(w.reliability).toBe(1.0)
    expect(w.influence).toBe(0)
  })
})

// ─── recordContribution ─────────────────────────────────────────────────────

describe('recordContribution', () => {
  it('increases contribution weight', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordContribution(h, 'p1', 0.5)
    expect(h.weights.get('p1')!.contribution).toBe(0.5)
    h = recordContribution(h, 'p1', 0.3)
    expect(h.weights.get('p1')!.contribution).toBeCloseTo(0.8)
  })
})

// ─── recordParticipation ────────────────────────────────────────────────────

describe('recordParticipation', () => {
  it('increases reliability', () => {
    let h = initFromCoven(covenWith3Members())
    // First reduce reliability so we can see the increase
    h = recordAbsence(h, 'p1')
    const before = h.weights.get('p1')!.reliability
    h = recordParticipation(h, 'p1')
    expect(h.weights.get('p1')!.reliability).toBeGreaterThan(before)
  })
})

// ─── recordAbsence ──────────────────────────────────────────────────────────

describe('recordAbsence', () => {
  it('decreases reliability', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordAbsence(h, 'p1')
    expect(h.weights.get('p1')!.reliability).toBeLessThan(1.0)
  })
})

// ─── applyBetrayalPenalty ───────────────────────────────────────────────────

describe('applyBetrayalPenalty', () => {
  it('halves contribution permanently', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordContribution(h, 'p1', 1.0)
    h = applyBetrayalPenalty(h, 'p1')
    expect(h.weights.get('p1')!.contribution).toBeCloseTo(0.5)
  })
})

// ─── getNormalizedWeight ────────────────────────────────────────────────────

describe('getNormalizedWeight', () => {
  it('returns 0-1 relative to max', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordContribution(h, 'p1', 1.0)
    h = recordContribution(h, 'p2', 0.5)
    // p1 has highest influence, so normalized = 1.0
    expect(getNormalizedWeight(h, 'p1')).toBeCloseTo(1.0)
    // p2 has half, so normalized = 0.5
    expect(getNormalizedWeight(h, 'p2')).toBeCloseTo(0.5)
  })
})

// ─── getRanking ─────────────────────────────────────────────────────────────

describe('getRanking', () => {
  it('orders by influence', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordContribution(h, 'p3', 1.0)
    h = recordContribution(h, 'p1', 0.5)
    h = recordContribution(h, 'p2', 0.2)
    const ranking = getRanking(h)
    expect(ranking[0]).toBe('p3')
    expect(ranking[1]).toBe('p1')
    expect(ranking[2]).toBe('p2')
  })
})

// ─── tickHierarchy ──────────────────────────────────────────────────────────

describe('tickHierarchy', () => {
  it('applies slow decay', () => {
    let h = initFromCoven(covenWith3Members())
    h = recordContribution(h, 'p1', 1.0)
    const before = h.weights.get('p1')!.contribution
    h = tickHierarchy(h)
    expect(h.weights.get('p1')!.contribution).toBeLessThan(before)
  })
})
