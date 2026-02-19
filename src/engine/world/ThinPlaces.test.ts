import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  bearingDeg,
  isInThinPlace,
  getNearbyThinPlaces,
  getChargeMultiplier,
  getCorruptionMultiplier,
  addRitualActivity,
  compassLabel,
  type ThinPlace,
  type Coord,
} from './ThinPlaces'

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

// ─── haversineDistance ─────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const p: Coord = { lat: 51.5, lng: -0.1 }
    expect(haversineDistance(p, p)).toBe(0)
  })

  it('returns ~111km per degree of latitude', () => {
    const a: Coord = { lat: 0, lng: 0 }
    const b: Coord = { lat: 1, lng: 0 }
    const dist = haversineDistance(a, b)
    expect(dist).toBeGreaterThan(110_000)
    expect(dist).toBeLessThan(112_000)
  })

  it('is symmetric', () => {
    const a: Coord = { lat: 40.7128, lng: -74.006 }
    const b: Coord = { lat: 51.5074, lng: -0.1278 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 0)
  })

  it('calculates London to Paris correctly (~340km)', () => {
    const london: Coord = { lat: 51.5074, lng: -0.1278 }
    const paris: Coord = { lat: 48.8566, lng: 2.3522 }
    const dist = haversineDistance(london, paris)
    expect(dist).toBeGreaterThan(335_000)
    expect(dist).toBeLessThan(345_000)
  })
})

// ─── bearingDeg ────────────────────────────────────────────────────────────

describe('bearingDeg', () => {
  it('returns 0 (north) for due-north movement', () => {
    const a: Coord = { lat: 0, lng: 0 }
    const b: Coord = { lat: 1, lng: 0 }
    expect(bearingDeg(a, b)).toBeCloseTo(0, 0)
  })

  it('returns ~90 (east) for due-east movement', () => {
    const a: Coord = { lat: 0, lng: 0 }
    const b: Coord = { lat: 0, lng: 1 }
    expect(bearingDeg(a, b)).toBeCloseTo(90, 0)
  })

  it('returns ~180 (south) for due-south movement', () => {
    const a: Coord = { lat: 1, lng: 0 }
    const b: Coord = { lat: 0, lng: 0 }
    expect(bearingDeg(a, b)).toBeCloseTo(180, 0)
  })

  it('returns ~270 (west) for due-west movement', () => {
    const a: Coord = { lat: 0, lng: 1 }
    const b: Coord = { lat: 0, lng: 0 }
    expect(bearingDeg(a, b)).toBeCloseTo(270, 0)
  })
})

// ─── isInThinPlace ─────────────────────────────────────────────────────────

describe('isInThinPlace', () => {
  const tp = makeThinPlace({ center: { lat: 51.0, lng: 0.0 }, radiusMeters: 500 })

  it('returns null when outside all thin places', () => {
    const pos: Coord = { lat: 52.0, lng: 0.0 } // ~111km away
    expect(isInThinPlace(pos, [tp])).toBeNull()
  })

  it('returns the thin place when inside', () => {
    const pos: Coord = { lat: 51.0, lng: 0.0 } // at center
    expect(isInThinPlace(pos, [tp])).toBe(tp)
  })

  it('returns null with empty list', () => {
    expect(isInThinPlace({ lat: 51.0, lng: 0.0 }, [])).toBeNull()
  })

  it('returns the most potent when inside multiple', () => {
    const weak = makeThinPlace({ id: 'weak', center: { lat: 51.0, lng: 0.0 }, radiusMeters: 1000, veilStrength: 0.8 })
    const potent = makeThinPlace({ id: 'potent', center: { lat: 51.0, lng: 0.0 }, radiusMeters: 500, veilStrength: 0.2 })
    const pos: Coord = { lat: 51.0, lng: 0.0 }
    expect(isInThinPlace(pos, [weak, potent])?.id).toBe('potent')
  })
})

// ─── getNearbyThinPlaces ───────────────────────────────────────────────────

describe('getNearbyThinPlaces', () => {
  const origin: Coord = { lat: 51.0, lng: 0.0 }
  const near = makeThinPlace({ id: 'near', center: { lat: 51.001, lng: 0.0 }, radiusMeters: 100 })   // ~111m
  const far = makeThinPlace({ id: 'far', center: { lat: 51.1, lng: 0.0 }, radiusMeters: 100 })        // ~11km

  it('returns only places within range', () => {
    const result = getNearbyThinPlaces(origin, [near, far], 500)
    expect(result.map(t => t.id)).toEqual(['near'])
  })

  it('returns empty when none in range', () => {
    expect(getNearbyThinPlaces(origin, [far], 500)).toHaveLength(0)
  })

  it('sorts nearest first', () => {
    const mid = makeThinPlace({ id: 'mid', center: { lat: 51.002, lng: 0.0 }, radiusMeters: 100 })
    const result = getNearbyThinPlaces(origin, [mid, near], 1000)
    expect(result[0].id).toBe('near')
  })
})

// ─── Multipliers ───────────────────────────────────────────────────────────

describe('getChargeMultiplier', () => {
  it('returns 1.0 outside all thin places', () => {
    expect(getChargeMultiplier(null)).toBe(1.0)
  })

  it('returns 3.0 for veilStrength=0 (fully thin)', () => {
    expect(getChargeMultiplier(makeThinPlace({ veilStrength: 0 }))).toBeCloseTo(3.0)
  })

  it('returns 1.5 for veilStrength=1 (weakest thin place)', () => {
    expect(getChargeMultiplier(makeThinPlace({ veilStrength: 1 }))).toBeCloseTo(1.5)
  })

  it('returns 2.25 for veilStrength=0.5', () => {
    expect(getChargeMultiplier(makeThinPlace({ veilStrength: 0.5 }))).toBeCloseTo(2.25)
  })
})

describe('getCorruptionMultiplier', () => {
  it('matches charge multiplier', () => {
    const tp = makeThinPlace({ veilStrength: 0.3 })
    expect(getCorruptionMultiplier(tp)).toBeCloseTo(getChargeMultiplier(tp))
  })
})

// ─── addRitualActivity ─────────────────────────────────────────────────────

describe('addRitualActivity', () => {
  it('accumulates activity', () => {
    const tp = makeThinPlace({ ritualActivity: 5 })
    const result = addRitualActivity(tp, 3)
    expect(result.ritualActivity).toBe(8)
  })

  it('does not mutate the original', () => {
    const tp = makeThinPlace({ ritualActivity: 0 })
    addRitualActivity(tp, 50)
    expect(tp.ritualActivity).toBe(0)
  })

  it('reduces veilStrength as activity crosses multiples of 10', () => {
    const tp = makeThinPlace({ type: 'dynamic', veilStrength: 0.6, ritualActivity: 0 })
    const result = addRitualActivity(tp, 10)
    expect(result.veilStrength).toBeLessThan(tp.veilStrength)
  })

  it('never reduces veilStrength below 0.05', () => {
    const tp = makeThinPlace({ type: 'dynamic', veilStrength: 0.1, ritualActivity: 0 })
    const result = addRitualActivity(tp, 10_000)
    expect(result.veilStrength).toBeGreaterThanOrEqual(0.05)
  })
})

// ─── compassLabel ──────────────────────────────────────────────────────────

describe('compassLabel', () => {
  it('returns N for 0°', () => expect(compassLabel(0)).toBe('N'))
  it('returns E for 90°', () => expect(compassLabel(90)).toBe('E'))
  it('returns S for 180°', () => expect(compassLabel(180)).toBe('S'))
  it('returns W for 270°', () => expect(compassLabel(270)).toBe('W'))
  it('returns NE for 45°', () => expect(compassLabel(45)).toBe('NE'))
})
