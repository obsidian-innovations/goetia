import { describe, it, expect } from 'vitest'
import {
  createCoven,
  inviteMember,
  removeMember,
  contributeSigil,
  exposeSigil,
  isMember,
  getBetrayalsByPlayer,
  type CovenState,
} from './CovenEngine'
import type { Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(id = 'sig-1'): Sigil {
  return {
    id,
    demonId: 'bael',
    sealIntegrity: 0.7,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.7,
    visualState: 'healthy',
    status: 'complete',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

// ─── createCoven ────────────────────────────────────────────────────────────

describe('createCoven', () => {
  it('sets the coven name', () => {
    const state = createCoven('Qliphoth Circle', 'p1', 0)
    expect(state.coven.name).toBe('Qliphoth Circle')
  })

  it('includes the founder as first member', () => {
    const state = createCoven('Circle', 'founder-1', 0)
    expect(state.coven.members).toContain('founder-1')
    expect(state.coven.members.length).toBe(1)
  })

  it('starts with an empty shared grimoire', () => {
    const state = createCoven('Circle', 'p1', 0)
    expect(state.coven.sharedGrimoire).toHaveLength(0)
  })

  it('starts with no betrayals', () => {
    const state = createCoven('Circle', 'p1', 0)
    expect(state.betrayals).toHaveLength(0)
  })

  it('sets createdAt', () => {
    const state = createCoven('Circle', 'p1', 9999)
    expect(state.coven.createdAt).toBe(9999)
  })
})

// ─── inviteMember ────────────────────────────────────────────────────────────

describe('inviteMember', () => {
  it('adds a new member', () => {
    const state = createCoven('Circle', 'p1', 0)
    const updated = inviteMember(state, 'p2')
    expect(updated.coven.members).toContain('p2')
    expect(updated.coven.members.length).toBe(2)
  })

  it('does not duplicate existing members', () => {
    const state = createCoven('Circle', 'p1', 0)
    const updated = inviteMember(state, 'p1')
    expect(updated.coven.members.length).toBe(1)
  })

  it('does not mutate the original state', () => {
    const state = createCoven('Circle', 'p1', 0)
    inviteMember(state, 'p2')
    expect(state.coven.members.length).toBe(1)
  })
})

// ─── removeMember ────────────────────────────────────────────────────────────

describe('removeMember', () => {
  it('removes an existing member', () => {
    let state = createCoven('Circle', 'p1', 0)
    state = inviteMember(state, 'p2')
    state = removeMember(state, 'p2')
    expect(state.coven.members).not.toContain('p2')
  })

  it('no-ops when player is not a member', () => {
    const state = createCoven('Circle', 'p1', 0)
    const updated = removeMember(state, 'unknown')
    expect(updated.coven.members.length).toBe(1)
  })
})

// ─── contributeSigil ─────────────────────────────────────────────────────────

describe('contributeSigil', () => {
  it('adds the sigil to the shared grimoire', () => {
    const state = createCoven('Circle', 'p1', 0)
    const sigil = makeSigil('s1')
    const updated = contributeSigil(state, sigil)
    expect(updated.coven.sharedGrimoire).toHaveLength(1)
    expect(updated.coven.sharedGrimoire[0].id).toBe('s1')
  })

  it('accumulates multiple sigils', () => {
    let state = createCoven('Circle', 'p1', 0)
    state = contributeSigil(state, makeSigil('s1'))
    state = contributeSigil(state, makeSigil('s2'))
    expect(state.coven.sharedGrimoire).toHaveLength(2)
  })

  it('does not mutate the original state', () => {
    const state = createCoven('Circle', 'p1', 0)
    contributeSigil(state, makeSigil())
    expect(state.coven.sharedGrimoire).toHaveLength(0)
  })
})

// ─── exposeSigil ─────────────────────────────────────────────────────────────

describe('exposeSigil', () => {
  it('records a betrayal', () => {
    const state = createCoven('Circle', 'p1', 0)
    const updated = exposeSigil(state, 'p1', 'sig-1', 'enemy-1', 5000)
    expect(updated.betrayals).toHaveLength(1)
    expect(updated.betrayals[0].betrayerId).toBe('p1')
    expect(updated.betrayals[0].sigilId).toBe('sig-1')
    expect(updated.betrayals[0].targetPlayerId).toBe('enemy-1')
    expect(updated.betrayals[0].exposedAt).toBe(5000)
  })

  it('does not mutate the original state', () => {
    const state = createCoven('Circle', 'p1', 0)
    exposeSigil(state, 'p1', 'sig-1', 'enemy-1', 0)
    expect(state.betrayals).toHaveLength(0)
  })

  it('accumulates multiple betrayals', () => {
    let state = createCoven('Circle', 'p1', 0)
    state = exposeSigil(state, 'p1', 'sig-1', 'enemy-1', 100)
    state = exposeSigil(state, 'p1', 'sig-2', 'enemy-2', 200)
    expect(state.betrayals).toHaveLength(2)
  })
})

// ─── isMember ────────────────────────────────────────────────────────────────

describe('isMember', () => {
  it('returns true for a member', () => {
    const state = createCoven('Circle', 'p1', 0)
    expect(isMember(state, 'p1')).toBe(true)
  })

  it('returns false for a non-member', () => {
    const state = createCoven('Circle', 'p1', 0)
    expect(isMember(state, 'stranger')).toBe(false)
  })
})

// ─── getBetrayalsByPlayer ─────────────────────────────────────────────────────

describe('getBetrayalsByPlayer', () => {
  it('returns only betrayals by the specified player', () => {
    let state = createCoven('Circle', 'p1', 0)
    state = exposeSigil(state, 'p1', 'sig-a', 'target', 0)
    state = exposeSigil(state, 'p2', 'sig-b', 'target', 0)
    expect(getBetrayalsByPlayer(state, 'p1')).toHaveLength(1)
    expect(getBetrayalsByPlayer(state, 'p1')[0].sigilId).toBe('sig-a')
  })

  it('returns empty array for a player with no betrayals', () => {
    const state = createCoven('Circle', 'p1', 0)
    expect(getBetrayalsByPlayer(state, 'innocent')).toHaveLength(0)
  })
})

// ─── immutability ────────────────────────────────────────────────────────────

describe('CovenEngine — immutability', () => {
  it('createCoven → inviteMember → contributeSigil all return new objects', () => {
    const s0 = createCoven('Circle', 'p1', 0)
    const s1 = inviteMember(s0, 'p2')
    const s2: CovenState = contributeSigil(s1, makeSigil())
    expect(s0).not.toBe(s1)
    expect(s1).not.toBe(s2)
    expect(s0.coven).not.toBe(s2.coven)
  })
})
