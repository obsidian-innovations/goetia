import { describe, it, expect } from 'vitest'
import {
  createBroadcastState,
  isBroadcasting,
  isVesselBroadcasting,
  calculateVeilReduction,
  broadcastCorruption,
  createVesselThinPlace,
  getWhisperIntervalMultiplier,
} from '../world/CorruptionBroadcast'
import type { ThinPlace, Coord } from '../world/ThinPlaces'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeThinPlace(overrides: Partial<ThinPlace> = {}): ThinPlace {
  return {
    id: 'test',
    type: 'fixed',
    center: { lat: 51.5, lng: -0.1 },
    radiusMeters: 100,
    veilStrength: 0.5,
    createdAt: 0,
    createdBy: null,
    ritualActivity: 0,
    ...overrides,
  }
}

const NOW = 1_000_000

// ─── createBroadcastState ─────────────────────────────────────────────────

describe('createBroadcastState', () => {
  it('creates correct initial state', () => {
    const state = createBroadcastState(0.6, NOW)
    expect(state.corruptionLevel).toBe(0.6)
    expect(state.position).toBeNull()
    expect(state.lastBroadcastAt).toBe(NOW)
  })
})

// ─── isBroadcasting ──────────────────────────────────────────────────────

describe('isBroadcasting', () => {
  it('returns false below 0.50 threshold', () => {
    const state = createBroadcastState(0.49, NOW)
    expect(isBroadcasting(state)).toBe(false)
  })

  it('returns true at 0.50', () => {
    const state = createBroadcastState(0.50, NOW)
    expect(isBroadcasting(state)).toBe(true)
  })

  it('returns true above 0.50', () => {
    const state = createBroadcastState(0.75, NOW)
    expect(isBroadcasting(state)).toBe(true)
  })
})

// ─── isVesselBroadcasting ─────────────────────────────────────────────────

describe('isVesselBroadcasting', () => {
  it('returns false below 0.80', () => {
    const state = createBroadcastState(0.79, NOW)
    expect(isVesselBroadcasting(state)).toBe(false)
  })

  it('returns true at 0.80', () => {
    const state = createBroadcastState(0.80, NOW)
    expect(isVesselBroadcasting(state)).toBe(true)
  })
})

// ─── calculateVeilReduction ───────────────────────────────────────────────

describe('calculateVeilReduction', () => {
  it('scales with time elapsed', () => {
    const oneDay = 24 * 60 * 60 * 1000
    expect(calculateVeilReduction(oneDay)).toBeCloseTo(0.05)
    expect(calculateVeilReduction(oneDay / 2)).toBeCloseTo(0.025)
    expect(calculateVeilReduction(0)).toBe(0)
  })
})

// ─── broadcastCorruption ──────────────────────────────────────────────────

describe('broadcastCorruption', () => {
  it('applies veil reduction to nearby places', () => {
    const state = createBroadcastState(0.60, NOW)
    const pos: Coord = { lat: 51.5, lng: -0.1 }
    const tp = makeThinPlace({ center: pos, veilStrength: 0.5 })
    const oneDay = 24 * 60 * 60 * 1000

    const { effects, updatedPlaces } = broadcastCorruption(state, [tp], pos, NOW + oneDay)
    expect(effects).toHaveLength(1)
    expect(effects[0].veilReduction).toBeCloseTo(0.05)
    expect(updatedPlaces[0].veilStrength).toBeCloseTo(0.45)
  })

  it('does not affect places when below broadcast threshold', () => {
    const state = createBroadcastState(0.30, NOW)
    const pos: Coord = { lat: 51.5, lng: -0.1 }
    const tp = makeThinPlace({ center: pos, veilStrength: 0.5 })

    const { effects } = broadcastCorruption(state, [tp], pos, NOW + 100_000)
    expect(effects).toHaveLength(0)
  })
})

// ─── createVesselThinPlace ────────────────────────────────────────────────

describe('createVesselThinPlace', () => {
  it('creates temp place at vessel stage', () => {
    const state = createBroadcastState(0.90, NOW)
    const pos: Coord = { lat: 51.5, lng: -0.1 }
    const place = createVesselThinPlace(state, pos, NOW)

    expect(place).not.toBeNull()
    expect(place!.center).toEqual(pos)
    expect(place!.createdAt).toBe(NOW)
    expect(place!.expiresAt).toBe(NOW + 30 * 60 * 1000)
  })

  it('returns null below vessel threshold', () => {
    const state = createBroadcastState(0.60, NOW)
    const pos: Coord = { lat: 51.5, lng: -0.1 }
    expect(createVesselThinPlace(state, pos, NOW)).toBeNull()
  })
})

// ─── getWhisperIntervalMultiplier ─────────────────────────────────────────

describe('getWhisperIntervalMultiplier', () => {
  it('returns 0.5 at vessel stage', () => {
    const state = createBroadcastState(0.90, NOW)
    expect(getWhisperIntervalMultiplier(state)).toBe(0.5)
  })

  it('returns 0.75 when broadcasting but not vessel', () => {
    const state = createBroadcastState(0.60, NOW)
    expect(getWhisperIntervalMultiplier(state)).toBe(0.75)
  })

  it('returns 1.0 when not broadcasting', () => {
    const state = createBroadcastState(0.30, NOW)
    expect(getWhisperIntervalMultiplier(state)).toBe(1.0)
  })
})
