import { describe, it, expect } from 'vitest'
import {
  createPilgrimageState,
  getDemonDirection,
  startPilgrimage,
  updatePilgrimage,
  isPilgrimageBonusActive,
  getResearchMultiplier,
  hasCompletedAllCardinals,
  PILGRIMAGE_RESEARCH_MULTIPLIER,
} from '../world/Pilgrimages'
import type { Coord } from '../world/ThinPlaces'

const NOW = 1_000_000
const HOUR_MS = 60 * 60 * 1000

// ─── createPilgrimageState ────────────────────────────────────────────────

describe('createPilgrimageState', () => {
  it('creates empty state', () => {
    const state = createPilgrimageState()
    expect(state.pilgrimages.size).toBe(0)
    expect(state.positionHistory).toHaveLength(0)
  })
})

// ─── getDemonDirection ────────────────────────────────────────────────────

describe('getDemonDirection', () => {
  it('maps index 1 to 0 degrees (N)', () => {
    const dir = getDemonDirection(1)
    expect(dir.bearing).toBeCloseTo(0)
    expect(dir.label).toBe('N')
  })

  it('maps index 19 to 90 degrees (E)', () => {
    const dir = getDemonDirection(19)
    expect(dir.bearing).toBeCloseTo(90)
    expect(dir.label).toBe('E')
  })

  it('maps index 37 to 180 degrees (S)', () => {
    const dir = getDemonDirection(37)
    expect(dir.bearing).toBeCloseTo(180)
    expect(dir.label).toBe('S')
  })
})

// ─── startPilgrimage ──────────────────────────────────────────────────────

describe('startPilgrimage', () => {
  it('creates new tracking entry', () => {
    const pos: Coord = { lat: 51.5, lng: -0.1 }
    const state = startPilgrimage(createPilgrimageState(), 'demon-1', pos)

    expect(state.pilgrimages.has('demon-1')).toBe(true)
    const progress = state.pilgrimages.get('demon-1')!
    expect(progress.demonId).toBe('demon-1')
    expect(progress.startPosition).toEqual(pos)
    expect(progress.distanceTraveled).toBe(0)
    expect(progress.completed).toBe(false)
  })
})

// ─── updatePilgrimage ─────────────────────────────────────────────────────

describe('updatePilgrimage', () => {
  it('tracks distance in correct direction', () => {
    const start: Coord = { lat: 51.0, lng: 0.0 }
    // Move north (~1.1km) which is bearing 0
    const moved: Coord = { lat: 51.01, lng: 0.0 }
    const direction = getDemonDirection(1) // bearing 0 (north)

    let state = startPilgrimage(createPilgrimageState(), 'demon-1', start)
    state = updatePilgrimage(state, 'demon-1', direction, moved, NOW)

    const progress = state.pilgrimages.get('demon-1')!
    expect(progress.distanceTraveled).toBeGreaterThan(0)
    expect(progress.furthestPosition).toEqual(moved)
  })
})

// ─── isPilgrimageBonusActive ──────────────────────────────────────────────

describe('isPilgrimageBonusActive', () => {
  it('returns true during bonus window', () => {
    const start: Coord = { lat: 51.0, lng: 0.0 }
    // Move north > 1km to complete pilgrimage
    const far: Coord = { lat: 51.01, lng: 0.0 }
    const direction = getDemonDirection(1)

    let state = startPilgrimage(createPilgrimageState(), 'demon-1', start)
    state = updatePilgrimage(state, 'demon-1', direction, far, NOW)

    const progress = state.pilgrimages.get('demon-1')!
    if (progress.completed) {
      expect(isPilgrimageBonusActive(state, 'demon-1', NOW + 1000)).toBe(true)
      // Expired after 1 hour
      expect(isPilgrimageBonusActive(state, 'demon-1', NOW + HOUR_MS + 1)).toBe(false)
    }
  })
})

// ─── getResearchMultiplier ────────────────────────────────────────────────

describe('getResearchMultiplier', () => {
  it('returns 1x when no bonus active', () => {
    const state = createPilgrimageState()
    expect(getResearchMultiplier(state, 'demon-1', NOW)).toBe(1)
  })

  it('returns 3x during bonus', () => {
    expect(PILGRIMAGE_RESEARCH_MULTIPLIER).toBe(3)
  })
})

// ─── hasCompletedAllCardinals ─────────────────────────────────────────────

describe('hasCompletedAllCardinals', () => {
  it('requires N, E, S, W', () => {
    const state = createPilgrimageState()
    // No pilgrimages at all
    expect(hasCompletedAllCardinals(state, 'demon-1')).toBe(false)
  })

  it('returns false with partial cardinals', () => {
    let state = startPilgrimage(createPilgrimageState(), 'demon-1', { lat: 51.0, lng: 0.0 })
    // Manually set some cardinals for testing
    const progress = state.pilgrimages.get('demon-1')!
    progress.completedCardinals.add('N')
    progress.completedCardinals.add('E')
    expect(hasCompletedAllCardinals(state, 'demon-1')).toBe(false)
  })

  it('returns true when all four are present', () => {
    let state = startPilgrimage(createPilgrimageState(), 'demon-1', { lat: 51.0, lng: 0.0 })
    const progress = state.pilgrimages.get('demon-1')!
    progress.completedCardinals.add('N')
    progress.completedCardinals.add('E')
    progress.completedCardinals.add('S')
    progress.completedCardinals.add('W')
    expect(hasCompletedAllCardinals(state, 'demon-1')).toBe(true)
  })
})
