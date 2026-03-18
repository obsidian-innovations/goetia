import { describe, it, expect } from 'vitest'
import {
  createWhisperingWall,
  embedEcho,
  getEchoes,
  getResonanceModifier,
  getEchoDemonIds,
  getTotalEchoCount,
} from '../world/Echoes'

const NOW = 1_000_000

// ─── createWhisperingWall ─────────────────────────────────────────────────

describe('createWhisperingWall', () => {
  it('creates empty state', () => {
    const state = createWhisperingWall()
    expect(state.echoes.size).toBe(0)
  })
})

// ─── embedEcho ────────────────────────────────────────────────────────────

describe('embedEcho', () => {
  it('adds echo and increases resonance', () => {
    let state = createWhisperingWall()
    state = embedEcho(state, 'place-1', 'hello', 'demon-a', 'player-1', NOW)
    const echoes = getEchoes(state, 'place-1')
    expect(echoes).toHaveLength(1)
    expect(echoes[0].text).toBe('hello')
    expect(echoes[0].demonId).toBe('demon-a')
    expect(echoes[0].intensity).toBe(0.8)
  })

  it('boosts existing same-demon echoes', () => {
    let state = createWhisperingWall()
    state = embedEcho(state, 'place-1', 'first', 'demon-a', 'player-1', NOW)
    state = embedEcho(state, 'place-1', 'second', 'demon-a', 'player-1', NOW + 1)
    const echoes = getEchoes(state, 'place-1')
    expect(echoes).toHaveLength(2)
    // First echo should have been boosted by 0.1
    expect(echoes[0].intensity).toBeCloseTo(0.9)
    // Second echo is fresh at base intensity
    expect(echoes[1].intensity).toBeCloseTo(0.8)
  })
})

// ─── getEchoes ────────────────────────────────────────────────────────────

describe('getEchoes', () => {
  it('returns empty for unknown place', () => {
    const state = createWhisperingWall()
    expect(getEchoes(state, 'nonexistent')).toEqual([])
  })
})

// ─── getResonanceModifier ─────────────────────────────────────────────────

describe('getResonanceModifier', () => {
  it('increases with more echoes', () => {
    let state = createWhisperingWall()
    const mod0 = getResonanceModifier(state, 'place-1')

    state = embedEcho(state, 'place-1', 'a', 'demon-a', 'p1', NOW)
    const mod1 = getResonanceModifier(state, 'place-1')

    state = embedEcho(state, 'place-1', 'b', 'demon-b', 'p1', NOW + 1)
    const mod2 = getResonanceModifier(state, 'place-1')

    expect(mod0).toBe(0)
    expect(mod1).toBeGreaterThan(mod0)
    expect(mod2).toBeGreaterThan(mod1)
  })
})

// ─── getEchoDemonIds ──────────────────────────────────────────────────────

describe('getEchoDemonIds', () => {
  it('returns unique demon IDs', () => {
    let state = createWhisperingWall()
    state = embedEcho(state, 'place-1', 'a', 'demon-a', 'p1', NOW)
    state = embedEcho(state, 'place-1', 'b', 'demon-a', 'p1', NOW + 1)
    state = embedEcho(state, 'place-1', 'c', 'demon-b', 'p1', NOW + 2)

    const ids = getEchoDemonIds(state, 'place-1')
    expect(ids).toHaveLength(2)
    expect(ids).toContain('demon-a')
    expect(ids).toContain('demon-b')
  })
})

// ─── getTotalEchoCount ────────────────────────────────────────────────────

describe('getTotalEchoCount', () => {
  it('counts across all places', () => {
    let state = createWhisperingWall()
    state = embedEcho(state, 'place-1', 'a', 'demon-a', 'p1', NOW)
    state = embedEcho(state, 'place-2', 'b', 'demon-b', 'p1', NOW + 1)
    state = embedEcho(state, 'place-1', 'c', 'demon-c', 'p1', NOW + 2)

    expect(getTotalEchoCount(state)).toBe(3)
  })
})
