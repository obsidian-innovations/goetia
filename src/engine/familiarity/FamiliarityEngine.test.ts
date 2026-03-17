import { describe, it, expect } from 'vitest'
import {
  createFamiliarityState,
  getTier,
  addInteraction,
  getEventAmount,
  getDemandPersonalization,
  getSimplifiedGeometry,
  getUnsolicitedOffer,
  processInteraction,
} from './FamiliarityEngine'
import type { FamiliarityState, FamiliarityEvent } from './FamiliarityEngine'
import type { Demon, NodeId } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function nid(id: string): NodeId { return id as NodeId }

function makeState(overrides: Partial<FamiliarityState> = {}): FamiliarityState {
  return {
    demonId: 'bael',
    score: 0,
    tier: 'stranger',
    interactionCount: 0,
    lastInteractionAt: Date.now(),
    simplifiedEdges: [],
    ...overrides,
  }
}

function makeDemon(overrides: Partial<Demon> = {}): Demon {
  const n1 = { id: nid('n1'), position: { x: 0.2, y: 0.2 } }
  const n2 = { id: nid('n2'), position: { x: 0.8, y: 0.2 } }
  const n3 = { id: nid('n3'), position: { x: 0.5, y: 0.8 } }
  const n4 = { id: nid('n4'), position: { x: 0.5, y: 0.5 } }
  return {
    id: 'bael',
    name: 'Bael',
    rank: 'King',
    domains: ['knowledge'],
    legions: 66,
    description: 'King of the East',
    sealGeometry: {
      nodes: [n1, n2, n3, n4],
      edges: [
        { fromNode: nid('n1'), toNode: nid('n2'), canonicalPath: [n1.position, { x: 0.5, y: 0.1 }, n2.position], weight: 0.35 },
        { fromNode: nid('n2'), toNode: nid('n3'), canonicalPath: [n2.position, { x: 0.7, y: 0.5 }, n3.position], weight: 0.30 },
        { fromNode: nid('n3'), toNode: nid('n1'), canonicalPath: [n3.position, { x: 0.3, y: 0.5 }, n1.position], weight: 0.20 },
        { fromNode: nid('n4'), toNode: nid('n1'), canonicalPath: [n4.position, n1.position], weight: 0.15 },
      ],
    },
    ...overrides,
  }
}

// ─── createFamiliarityState ────────────────────────────────────────────────

describe('createFamiliarityState', () => {
  it('creates a fresh state with zero score and stranger tier', () => {
    const now = Date.now()
    const state = createFamiliarityState('bael', now)
    expect(state.demonId).toBe('bael')
    expect(state.score).toBe(0)
    expect(state.tier).toBe('stranger')
    expect(state.interactionCount).toBe(0)
    expect(state.lastInteractionAt).toBe(now)
    expect(state.simplifiedEdges).toEqual([])
  })
})

// ─── getTier ───────────────────────────────────────────────────────────────

describe('getTier', () => {
  it('returns stranger for score < 0.25', () => {
    expect(getTier(0)).toBe('stranger')
    expect(getTier(0.10)).toBe('stranger')
    expect(getTier(0.24)).toBe('stranger')
  })

  it('returns acquaintance for score 0.25–0.49', () => {
    expect(getTier(0.25)).toBe('acquaintance')
    expect(getTier(0.40)).toBe('acquaintance')
    expect(getTier(0.49)).toBe('acquaintance')
  })

  it('returns familiar for score 0.50–0.79', () => {
    expect(getTier(0.50)).toBe('familiar')
    expect(getTier(0.65)).toBe('familiar')
    expect(getTier(0.79)).toBe('familiar')
  })

  it('returns bonded for score >= 0.80', () => {
    expect(getTier(0.80)).toBe('bonded')
    expect(getTier(0.95)).toBe('bonded')
    expect(getTier(1.0)).toBe('bonded')
  })
})

// ─── getEventAmount ────────────────────────────────────────────────────────

describe('getEventAmount', () => {
  it('returns correct amounts for each event type', () => {
    expect(getEventAmount('ritual_complete')).toBe(0.05)
    expect(getEventAmount('charge_complete')).toBe(0.04)
    expect(getEventAmount('demand_fulfilled')).toBe(0.03)
    expect(getEventAmount('hex_cast')).toBe(0.02)
    expect(getEventAmount('study')).toBe(0.01)
    expect(getEventAmount('demand_ignored')).toBe(-0.02)
  })
})

// ─── addInteraction ────────────────────────────────────────────────────────

describe('addInteraction', () => {
  it('increases score for positive events', () => {
    const state = makeState({ score: 0.10 })
    const event: FamiliarityEvent = { type: 'ritual_complete', amount: 0.05 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBeCloseTo(0.15, 5)
    expect(updated.interactionCount).toBe(1)
  })

  it('decreases score for negative events', () => {
    const state = makeState({ score: 0.30 })
    const event: FamiliarityEvent = { type: 'demand_ignored', amount: -0.02 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBeCloseTo(0.28, 5)
  })

  it('clamps score to 0', () => {
    const state = makeState({ score: 0.01 })
    const event: FamiliarityEvent = { type: 'demand_ignored', amount: -0.02 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBe(0)
  })

  it('clamps score to 1', () => {
    const state = makeState({ score: 0.99 })
    const event: FamiliarityEvent = { type: 'ritual_complete', amount: 0.05 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBe(1)
  })

  it('updates tier when crossing threshold', () => {
    const state = makeState({ score: 0.23 })
    const event: FamiliarityEvent = { type: 'ritual_complete', amount: 0.05 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBeCloseTo(0.28, 5)
    expect(updated.tier).toBe('acquaintance')
  })

  it('demotes tier when score drops below threshold', () => {
    const state = makeState({ score: 0.25, tier: 'acquaintance' })
    const event: FamiliarityEvent = { type: 'demand_ignored', amount: -0.02 }
    const updated = addInteraction(state, event, Date.now())
    expect(updated.score).toBeCloseTo(0.23, 5)
    expect(updated.tier).toBe('stranger')
  })

  it('20 ritual completions move from stranger to bonded', () => {
    let state = makeState()
    for (let i = 0; i < 20; i++) {
      state = addInteraction(state, { type: 'ritual_complete', amount: 0.05 }, Date.now())
    }
    expect(state.score).toBeCloseTo(1.0, 5)
    expect(state.tier).toBe('bonded')
    expect(state.interactionCount).toBe(20)
  })

  it('preserves demonId', () => {
    const state = makeState({ demonId: 'paimon' })
    const updated = addInteraction(state, { type: 'study', amount: 0.01 }, Date.now())
    expect(updated.demonId).toBe('paimon')
  })
})

// ─── getDemandPersonalization ──────────────────────────────────────────────

describe('getDemandPersonalization', () => {
  it('returns correct personalization per tier', () => {
    expect(getDemandPersonalization('stranger')).toBe('generic')
    expect(getDemandPersonalization('acquaintance')).toBe('personalized')
    expect(getDemandPersonalization('familiar')).toBe('offers')
    expect(getDemandPersonalization('bonded')).toBe('unrefusable')
  })
})

// ─── getSimplifiedGeometry ─────────────────────────────────────────────────

describe('getSimplifiedGeometry', () => {
  it('returns unchanged geometry for non-bonded tiers', () => {
    const demon = makeDemon()
    for (const tier of ['stranger', 'acquaintance', 'familiar'] as const) {
      const state = makeState({ tier })
      const result = getSimplifiedGeometry(state, demon)
      expect(result.simplifiedEdges).toHaveLength(0)
      expect(result.geometry).toBe(demon.sealGeometry) // same reference
    }
  })

  it('simplifies 2 lowest-weight edges at bonded tier', () => {
    const demon = makeDemon()
    const state = makeState({ tier: 'bonded', score: 0.90 })
    const result = getSimplifiedGeometry(state, demon)

    expect(result.simplifiedEdges).toHaveLength(2)
    // Lowest-weight edges: n4→n1 (0.15), n3→n1 (0.20)
    const keys = result.simplifiedEdges.map(e => `${e.from}-${e.to}`)
    expect(keys).toContain('n4-n1')
    expect(keys).toContain('n3-n1')
  })

  it('simplified edges have 2-point canonical path (straight line)', () => {
    const demon = makeDemon()
    const state = makeState({ tier: 'bonded', score: 0.90 })
    const { geometry } = getSimplifiedGeometry(state, demon)

    // Find the simplified edge n4→n1
    const simplified = geometry.edges.find(
      e => e.fromNode === 'n4' && e.toNode === 'n1',
    )
    expect(simplified).toBeDefined()
    expect(simplified!.canonicalPath).toHaveLength(2)
  })

  it('non-simplified edges retain original canonical path', () => {
    const demon = makeDemon()
    const state = makeState({ tier: 'bonded', score: 0.90 })
    const { geometry } = getSimplifiedGeometry(state, demon)

    // n1→n2 (weight 0.35) should NOT be simplified
    const kept = geometry.edges.find(e => e.fromNode === 'n1' && e.toNode === 'n2')
    expect(kept).toBeDefined()
    expect(kept!.canonicalPath).toHaveLength(3) // original 3-point path
  })

  it('uses cached simplifiedEdges when present', () => {
    const demon = makeDemon()
    const cached = [{ from: nid('n1'), to: nid('n2') }] // not the lowest-weight!
    const state = makeState({ tier: 'bonded', score: 0.90, simplifiedEdges: cached })
    const result = getSimplifiedGeometry(state, demon)

    // Should use cached, not recompute
    expect(result.simplifiedEdges).toEqual(cached)
    const edge = result.geometry.edges.find(e => e.fromNode === 'n1' && e.toNode === 'n2')
    expect(edge!.canonicalPath).toHaveLength(2) // simplified to straight line
  })
})

// ─── getUnsolicitedOffer ───────────────────────────────────────────────────

describe('getUnsolicitedOffer', () => {
  it('returns null for stranger tier', () => {
    const state = makeState({ tier: 'stranger' })
    expect(getUnsolicitedOffer(state, makeDemon())).toBeNull()
  })

  it('returns null for acquaintance tier', () => {
    const state = makeState({ tier: 'acquaintance' })
    expect(getUnsolicitedOffer(state, makeDemon())).toBeNull()
  })

  it('can return an offer for familiar tier', () => {
    const demon = makeDemon()
    // Try a range of interaction counts to find one that triggers
    let found = false
    for (let i = 0; i < 100; i++) {
      const state = makeState({ tier: 'familiar', interactionCount: i })
      const offer = getUnsolicitedOffer(state, demon)
      if (offer !== null) {
        found = true
        expect(typeof offer).toBe('string')
        break
      }
    }
    expect(found).toBe(true)
  })

  it('can return an offer for bonded tier', () => {
    const demon = makeDemon()
    let found = false
    for (let i = 0; i < 100; i++) {
      const state = makeState({ tier: 'bonded', interactionCount: i })
      const offer = getUnsolicitedOffer(state, demon)
      if (offer !== null) {
        found = true
        expect(typeof offer).toBe('string')
        break
      }
    }
    expect(found).toBe(true)
  })
})

// ─── processInteraction ────────────────────────────────────────────────────

describe('processInteraction', () => {
  it('creates state for new demon', () => {
    const now = Date.now()
    const { updatedState, allStates } = processInteraction({}, 'bael', 'ritual_complete', now)
    expect(updatedState.demonId).toBe('bael')
    expect(updatedState.score).toBeCloseTo(0.05, 5)
    expect(updatedState.tier).toBe('stranger')
    expect(allStates['bael']).toBe(updatedState)
  })

  it('updates existing state', () => {
    const existing = { bael: makeState({ score: 0.20, interactionCount: 5 }) }
    const { updatedState } = processInteraction(existing, 'bael', 'ritual_complete', Date.now())
    expect(updatedState.score).toBeCloseTo(0.25, 5)
    expect(updatedState.tier).toBe('acquaintance')
    expect(updatedState.interactionCount).toBe(6)
  })

  it('preserves other demons in allStates', () => {
    const existing = {
      bael: makeState({ demonId: 'bael', score: 0.10 }),
      paimon: makeState({ demonId: 'paimon', score: 0.50 }),
    }
    const { allStates } = processInteraction(existing, 'bael', 'study', Date.now())
    expect(allStates['paimon']).toBe(existing.paimon) // unchanged reference
    expect(allStates['bael'].score).toBeCloseTo(0.11, 5)
  })
})
