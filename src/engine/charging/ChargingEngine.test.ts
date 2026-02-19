import { describe, it, expect } from 'vitest'
import {
  getRequiredChargeTime,
  createChargingState,
  tick,
  registerAttention,
  isFullyCharged,
  getDecayAmount,
} from './ChargingEngine'
import type { DemonRank } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(rank: DemonRank = 'Baron', startedAt = 0) {
  const state = createChargingState('sigil-1', rank)
  return { ...state, startedAt, lastAttentionAt: startedAt }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('getRequiredChargeTime', () => {
  it('returns 8 min for Baron', () => {
    expect(getRequiredChargeTime('Baron')).toBe(480_000)
  })

  it('returns 12 min for Knight', () => {
    expect(getRequiredChargeTime('Knight')).toBe(720_000)
  })

  it('returns 12 min for President', () => {
    expect(getRequiredChargeTime('President')).toBe(720_000)
  })

  it('returns 18 min for Earl', () => {
    expect(getRequiredChargeTime('Earl')).toBe(1_080_000)
  })

  it('returns 18 min for Marquis', () => {
    expect(getRequiredChargeTime('Marquis')).toBe(1_080_000)
  })

  it('returns 25 min for Duke', () => {
    expect(getRequiredChargeTime('Duke')).toBe(1_500_000)
  })

  it('returns 45 min for Prince', () => {
    expect(getRequiredChargeTime('Prince')).toBe(2_700_000)
  })

  it('returns 90 min for King', () => {
    expect(getRequiredChargeTime('King')).toBe(5_400_000)
  })

  it('charge time scales with rank (Baron < Duke < King)', () => {
    expect(getRequiredChargeTime('Baron')).toBeLessThan(getRequiredChargeTime('Duke'))
    expect(getRequiredChargeTime('Duke')).toBeLessThan(getRequiredChargeTime('King'))
  })
})

describe('createChargingState', () => {
  it('starts at 0 progress', () => {
    const state = createChargingState('s1', 'Baron')
    expect(state.chargeProgress).toBe(0)
  })

  it('records sigilId and rank', () => {
    const state = createChargingState('my-sigil', 'King')
    expect(state.sigilId).toBe('my-sigil')
    expect(state.demonRank).toBe('King')
  })
})

describe('tick', () => {
  it('advances progress based on elapsed time', () => {
    const required = getRequiredChargeTime('Baron') // 480_000
    const halfTime = required / 2 // 240_000ms
    const state = makeState('Baron', 0)
    // Give attention 30s before the tick so no decay applies (30s < 60s threshold)
    const activeState = { ...state, lastAttentionAt: halfTime - 30_000 }
    const ticked = tick(activeState, halfTime)
    expect(ticked.chargeProgress).toBeCloseTo(0.5, 5)
  })

  it('caps progress at 1.0', () => {
    const required = getRequiredChargeTime('Baron')
    const now = required * 2 // 960_000ms
    const state = makeState('Baron', 0)
    // Give attention 30s before the tick so no decay applies
    const activeState = { ...state, lastAttentionAt: now - 30_000 }
    const ticked = tick(activeState, now)
    expect(ticked.chargeProgress).toBe(1)
  })

  it('does not decay within the idle threshold', () => {
    const required = getRequiredChargeTime('Baron')
    const state = makeState('Baron', 0)
    // Advance to 50% but only idle for 30s (below 60s threshold)
    const halfway = tick(state, required / 2)
    const state2 = { ...halfway, lastAttentionAt: required / 2 }
    const ticked = tick(state2, required / 2 + 30_000)
    // Progress should be approximately 50% (30s of elapsed from required/2 → small gain, no decay)
    expect(ticked.chargeProgress).toBeGreaterThan(0.499)
  })

  it('decays when idle for more than 60 seconds', () => {
    const required = getRequiredChargeTime('Baron') // 480_000
    // Start at 50% progress manually
    const state = makeState('Baron', 0)
    const halfwayState = { ...state, chargeProgress: 0.5, lastAttentionAt: 0 }

    // 120s of idle (60s beyond threshold)
    const ticked = tick(halfwayState, 120_000)
    // Natural progress at 120s: 120_000/480_000 = 0.25
    // Decay: (120_000 - 60_000)/1000 * 0.002 = 60 * 0.002 = 0.12
    // But chargeProgress is recalculated fresh from naturalProgress - decayLoss
    // naturalProgress = 120_000/480_000 = 0.25
    // decayLoss = 60 * 0.002 = 0.12
    // result = max(0, 0.25 - 0.12) = 0.13
    expect(ticked.chargeProgress).toBeCloseTo(0.13, 4)
  })

  it('does not allow negative progress', () => {
    const state = makeState('Baron', 0)
    // 1 hour of total idle: decay should not make progress negative
    const ticked = tick(state, 3_600_000)
    expect(ticked.chargeProgress).toBeGreaterThanOrEqual(0)
  })
})

describe('registerAttention', () => {
  it('increments attentionCount', () => {
    const state = makeState('Baron', 0)
    const updated = registerAttention(state, 10_000)
    expect(updated.attentionCount).toBe(1)
  })

  it('resets lastAttentionAt to now', () => {
    const state = makeState('Baron', 0)
    const updated = registerAttention(state, 45_000)
    expect(updated.lastAttentionAt).toBe(45_000)
  })

  it('resetting attention stops decay', () => {
    const required = getRequiredChargeTime('Baron')
    const state = makeState('Baron', 0)
    // Idle for 90s (decaying for 30s after threshold)
    const ticked = tick(state, 90_000)
    // Reset attention at 90s
    const attended = registerAttention(ticked, 90_000)
    // Tick another 30s — within threshold, no extra decay
    const ticked2 = tick(attended, 120_000)
    // Natural progress at 120s: 120_000/480_000 = 0.25
    // No decay because lastAttentionAt = 90_000 and now = 120_000 (30s < 60s threshold)
    expect(ticked2.chargeProgress).toBeCloseTo(120_000 / required, 4)
  })
})

describe('isFullyCharged', () => {
  it('returns false when progress < 1', () => {
    const state = { ...makeState(), chargeProgress: 0.99 }
    expect(isFullyCharged(state)).toBe(false)
  })

  it('returns true when progress = 1', () => {
    const state = { ...makeState(), chargeProgress: 1 }
    expect(isFullyCharged(state)).toBe(true)
  })
})

describe('getDecayAmount', () => {
  it('returns 0 when within idle threshold', () => {
    const state = makeState('Baron', 0)
    const amount = getDecayAmount(state, 59_999)
    expect(amount).toBe(0)
  })

  it('returns decay amount after threshold', () => {
    const state = makeState('Baron', 0)
    // 30s past threshold
    const amount = getDecayAmount(state, 90_000)
    expect(amount).toBeCloseTo(30 * 0.002, 5) // 0.06
  })
})
