import { describe, it, expect } from 'vitest'
import {
  cellKey,
  cellCenter,
  createGeneratorState,
  addActivityToCell,
  spawnDynamicPlaces,
  decayDynamicPlaces,
  getAllDynamicPlaces,
} from './ThinPlaceGenerator'
import type { Coord } from './ThinPlaces'

const LONDON: Coord = { lat: 51.5074, lng: -0.1278 }

// ─── cellKey ────────────────────────────────────────────────────────────────

describe('cellKey', () => {
  it('returns consistent key for same location', () => {
    expect(cellKey(LONDON)).toBe(cellKey(LONDON))
  })

  it('returns different keys for distant points', () => {
    const paris: Coord = { lat: 48.8566, lng: 2.3522 }
    expect(cellKey(LONDON)).not.toBe(cellKey(paris))
  })

  it('returns same key for nearby points in same cell', () => {
    // Two points ~5m apart should share a cell at 0.01° precision
    const a: Coord = { lat: 51.5074, lng: -0.1278 }
    const b: Coord = { lat: 51.5075, lng: -0.1279 }
    expect(cellKey(a)).toBe(cellKey(b))
  })
})

// ─── cellCenter ─────────────────────────────────────────────────────────────

describe('cellCenter', () => {
  it('returns center at 0.01° resolution', () => {
    const center = cellCenter({ lat: 51.5074, lng: -0.1278 })
    expect(center.lat).toBe(51.51)
    expect(center.lng).toBe(-0.13)
  })
})

// ─── addActivityToCell ──────────────────────────────────────────────────────

describe('addActivityToCell', () => {
  it('creates a new cell on first activity', () => {
    const state = createGeneratorState()
    const updated = addActivityToCell(state, LONDON, 0.8, 'bael', Date.now())
    expect(updated.cells.size).toBe(1)
  })

  it('accumulates activity in the same cell', () => {
    const state = createGeneratorState()
    const s1 = addActivityToCell(state, LONDON, 0.5, 'bael', 1000)
    const s2 = addActivityToCell(s1, LONDON, 0.5, 'bael', 2000)
    const cell = s2.cells.get(cellKey(LONDON))!
    expect(cell.totalActivity).toBeCloseTo(1.0)
  })

  it('tracks unique demon IDs', () => {
    let state = createGeneratorState()
    state = addActivityToCell(state, LONDON, 0.5, 'bael', 1000)
    state = addActivityToCell(state, LONDON, 0.5, 'agares', 2000)
    const cell = state.cells.get(cellKey(LONDON))!
    expect(cell.demonIds.has('bael')).toBe(true)
    expect(cell.demonIds.has('agares')).toBe(true)
  })

  it('tracks unique active days', () => {
    let state = createGeneratorState()
    const day1 = new Date('2026-01-01').getTime()
    const day2 = new Date('2026-01-02').getTime()
    state = addActivityToCell(state, LONDON, 0.5, 'bael', day1)
    state = addActivityToCell(state, LONDON, 0.5, 'bael', day2)
    const cell = state.cells.get(cellKey(LONDON))!
    expect(cell.activeDays.size).toBe(2)
  })

  it('does not mutate input state', () => {
    const state = createGeneratorState()
    addActivityToCell(state, LONDON, 0.5, 'bael', 1000)
    expect(state.cells.size).toBe(0)
  })
})

// ─── spawnDynamicPlaces ─────────────────────────────────────────────────────

describe('spawnDynamicPlaces', () => {
  it('spawns a dynamic place when threshold is met', () => {
    let state = createGeneratorState()
    // Add enough activity to cross SPAWN_THRESHOLD=5
    for (let i = 0; i < 6; i++) {
      state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000 + i)
    }
    const spawned = spawnDynamicPlaces(state, Date.now())
    expect(getAllDynamicPlaces(spawned)).toHaveLength(1)
  })

  it('does not spawn when below threshold', () => {
    let state = createGeneratorState()
    state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000)
    const spawned = spawnDynamicPlaces(state, Date.now())
    expect(getAllDynamicPlaces(spawned)).toHaveLength(0)
  })

  it('does not duplicate existing dynamic places', () => {
    let state = createGeneratorState()
    for (let i = 0; i < 6; i++) {
      state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000 + i)
    }
    const s1 = spawnDynamicPlaces(state, Date.now())
    const s2 = spawnDynamicPlaces(s1, Date.now())
    expect(getAllDynamicPlaces(s2)).toHaveLength(1)
  })

  it('promotes to player_created after sufficient days + demons', () => {
    let state = createGeneratorState()
    // Exceed spawn threshold first
    for (let i = 0; i < 6; i++) {
      state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000 + i)
    }
    state = spawnDynamicPlaces(state, Date.now())

    // Now simulate 7 days + 3 demon types
    const baseDay = new Date('2026-01-01').getTime()
    const demonIds = ['bael', 'agares', 'vassago']
    for (let d = 0; d < 7; d++) {
      for (const demonId of demonIds) {
        state = addActivityToCell(state, LONDON, 0.5, demonId, baseDay + d * 86_400_000)
      }
    }
    const promoted = spawnDynamicPlaces(state, Date.now())
    const place = getAllDynamicPlaces(promoted)[0]
    expect(place.type).toBe('player_created')
  })
})

// ─── decayDynamicPlaces ─────────────────────────────────────────────────────

describe('decayDynamicPlaces', () => {
  it('does not decay fixed places', () => {
    // Fixed places don't appear in dynamicPlaces anyway, but test the filter
    let state = createGeneratorState()
    for (let i = 0; i < 6; i++) {
      state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000 + i)
    }
    state = spawnDynamicPlaces(state, 1000)
    const place = getAllDynamicPlaces(state)[0]
    // A freshly spawned place should survive minimal decay
    const decayed = decayDynamicPlaces(state, 1000 + 60_000)
    expect(getAllDynamicPlaces(decayed)).toHaveLength(1)
    expect(getAllDynamicPlaces(decayed)[0].veilStrength).toBeGreaterThanOrEqual(place.veilStrength)
  })

  it('removes places that have fully decayed', () => {
    let state = createGeneratorState()
    for (let i = 0; i < 6; i++) {
      state = addActivityToCell(state, LONDON, 1.0, 'bael', 1000 + i)
    }
    // Spawn at t=0
    state = spawnDynamicPlaces(state, 0)
    // Fast-forward 30 days — well past multiple half-lives
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const decayed = decayDynamicPlaces(state, thirtyDaysMs)
    expect(getAllDynamicPlaces(decayed)).toHaveLength(0)
  })
})
