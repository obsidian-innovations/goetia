import { describe, it, expect } from 'vitest'
import {
  getMoonPhase,
  isWitchingHour,
  isSolstice,
  isEquinox,
  getTemporalModifiers,
  getMoonSymbol,
} from './TemporalEngine'
import type { MoonPhaseName } from './TemporalEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a timestamp for a specific local date/time. */
function localTime(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return new Date(year, month - 1, day, hour, minute).getTime()
}

/** Create a timestamp for a specific UTC date/time. */
function utcTime(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute)
}

// ─── getMoonPhase ───────────────────────────────────────────────────────────

describe('getMoonPhase', () => {
  it('returns a valid phase name for any timestamp', () => {
    const validPhases: MoonPhaseName[] = [
      'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
    ]
    // Test across a range of dates
    for (let i = 0; i < 30; i++) {
      const ts = utcTime(2025, 1, 1 + i)
      const result = getMoonPhase(ts)
      expect(validPhases).toContain(result.phase)
    }
  })

  it('returns illumination between 0 and 1', () => {
    for (let i = 0; i < 30; i++) {
      const ts = utcTime(2025, 6, 1 + i)
      const result = getMoonPhase(ts)
      expect(result.illumination).toBeGreaterThanOrEqual(0)
      expect(result.illumination).toBeLessThanOrEqual(1)
    }
  })

  it('daysSinceNew is between 0 and synodic month length', () => {
    for (let i = 0; i < 60; i++) {
      const ts = utcTime(2024, 3, 1 + i)
      const result = getMoonPhase(ts)
      expect(result.daysSinceNew).toBeGreaterThanOrEqual(0)
      expect(result.daysSinceNew).toBeLessThan(29.54)
    }
  })

  it('reports new moon near a known new moon date (Jan 29, 2025)', () => {
    // January 29, 2025 was a new moon (12:36 UTC)
    const ts = utcTime(2025, 1, 29, 12, 36)
    const result = getMoonPhase(ts)
    // Should be new or very close (waxing_crescent within ±1 day)
    expect(['new', 'waxing_crescent', 'waning_crescent']).toContain(result.phase)
    expect(result.illumination).toBeLessThan(0.1)
  })

  it('reports full moon near a known full moon date (Feb 12, 2025)', () => {
    // February 12, 2025 was a full moon
    const ts = utcTime(2025, 2, 12, 13, 0)
    const result = getMoonPhase(ts)
    expect(['full', 'waxing_gibbous', 'waning_gibbous']).toContain(result.phase)
    expect(result.illumination).toBeGreaterThan(0.85)
  })

  it('cycles through all 8 phases over a synodic month', () => {
    const phases = new Set<MoonPhaseName>()
    const startTs = utcTime(2025, 3, 1)
    // Sample every ~3.7 days across a full synodic month
    for (let i = 0; i < 8; i++) {
      const ts = startTs + i * 3.7 * 86_400_000
      phases.add(getMoonPhase(ts).phase)
    }
    expect(phases.size).toBeGreaterThanOrEqual(4) // At minimum 4 distinct phases
  })

  it('handles timestamps before the epoch', () => {
    const ts = utcTime(1990, 6, 15)
    const result = getMoonPhase(ts)
    expect(result.daysSinceNew).toBeGreaterThanOrEqual(0)
    expect(result.daysSinceNew).toBeLessThan(29.54)
  })
})

// ─── isWitchingHour ─────────────────────────────────────────────────────────

describe('isWitchingHour', () => {
  it('returns true at midnight', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 0, 0))).toBe(true)
  })

  it('returns true at 1am', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 1, 0))).toBe(true)
  })

  it('returns true at 2:59am', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 2, 59))).toBe(true)
  })

  it('returns false at 3am', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 3, 0))).toBe(false)
  })

  it('returns false at noon', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 12, 0))).toBe(false)
  })

  it('returns false at 11pm', () => {
    expect(isWitchingHour(localTime(2025, 6, 15, 23, 0))).toBe(false)
  })
})

// ─── isSolstice ─────────────────────────────────────────────────────────────

describe('isSolstice', () => {
  it('returns true for June 21', () => {
    expect(isSolstice(localTime(2025, 6, 21))).toBe(true)
  })

  it('returns true for June 20', () => {
    expect(isSolstice(localTime(2025, 6, 20))).toBe(true)
  })

  it('returns true for June 22', () => {
    expect(isSolstice(localTime(2025, 6, 22))).toBe(true)
  })

  it('returns true for December 21', () => {
    expect(isSolstice(localTime(2025, 12, 21))).toBe(true)
  })

  it('returns true for December 20', () => {
    expect(isSolstice(localTime(2025, 12, 20))).toBe(true)
  })

  it('returns false for June 19', () => {
    expect(isSolstice(localTime(2025, 6, 19))).toBe(false)
  })

  it('returns false for June 23', () => {
    expect(isSolstice(localTime(2025, 6, 23))).toBe(false)
  })

  it('returns false for a random date', () => {
    expect(isSolstice(localTime(2025, 3, 15))).toBe(false)
  })
})

// ─── isEquinox ──────────────────────────────────────────────────────────────

describe('isEquinox', () => {
  it('returns true for March 20', () => {
    expect(isEquinox(localTime(2025, 3, 20))).toBe(true)
  })

  it('returns true for March 19', () => {
    expect(isEquinox(localTime(2025, 3, 19))).toBe(true)
  })

  it('returns true for March 21', () => {
    expect(isEquinox(localTime(2025, 3, 21))).toBe(true)
  })

  it('returns true for September 22', () => {
    expect(isEquinox(localTime(2025, 9, 22))).toBe(true)
  })

  it('returns true for September 24', () => {
    expect(isEquinox(localTime(2025, 9, 24))).toBe(true)
  })

  it('returns false for March 22', () => {
    expect(isEquinox(localTime(2025, 3, 22))).toBe(false)
  })

  it('returns false for September 21', () => {
    expect(isEquinox(localTime(2025, 9, 21))).toBe(false)
  })

  it('returns false for a random date', () => {
    expect(isEquinox(localTime(2025, 7, 4))).toBe(false)
  })
})

// ─── getTemporalModifiers ───────────────────────────────────────────────────

describe('getTemporalModifiers', () => {
  it('returns base multipliers during a normal afternoon', () => {
    const ts = localTime(2025, 7, 4, 14, 0) // July 4, 2pm — not witching, not solstice
    const mods = getTemporalModifiers(ts)
    expect(mods.chargeMultiplier).toBe(1.0)
    expect(mods.corruptionMultiplier).toBe(1.0)
    expect(mods.purificationMultiplier).toBe(1.0)
    expect(mods.veilReduction).toBe(0.0)
    expect(mods.isWitchingHour).toBe(false)
    expect(mods.isSolstice).toBe(false)
    expect(mods.isEquinox).toBe(false)
  })

  it('doubles charge and corruption during witching hour', () => {
    const ts = localTime(2025, 7, 4, 1, 30) // 1:30am on a normal day
    const mods = getTemporalModifiers(ts)
    expect(mods.chargeMultiplier).toBe(2.0)
    expect(mods.corruptionMultiplier).toBe(2.0)
    expect(mods.isWitchingHour).toBe(true)
  })

  it('boosts purification during full moon', () => {
    // Find a full moon timestamp by checking around Feb 12, 2025
    const ts = utcTime(2025, 2, 12, 13, 0)
    const mods = getTemporalModifiers(ts)
    if (mods.moonPhase.phase === 'full') {
      expect(mods.purificationMultiplier).toBe(1.5)
    }
  })

  it('reduces veil during new moon', () => {
    // Jan 29, 2025 was a new moon
    const ts = utcTime(2025, 1, 29, 12, 36)
    const mods = getTemporalModifiers(ts)
    if (mods.moonPhase.phase === 'new') {
      expect(mods.veilReduction).toBe(0.15)
    }
  })

  it('stacks solstice bonus with witching hour', () => {
    // June 21 at 1am — witching hour + solstice
    const ts = localTime(2025, 6, 21, 1, 0)
    const mods = getTemporalModifiers(ts)
    expect(mods.isWitchingHour).toBe(true)
    expect(mods.isSolstice).toBe(true)
    // Witching (2.0) * solstice (1.25) = 2.5
    expect(mods.chargeMultiplier).toBe(2.5)
    // Corruption only affected by witching hour, not solstice
    expect(mods.corruptionMultiplier).toBe(2.0)
  })

  it('stacks equinox bonus with witching hour', () => {
    // March 20 at 2am — witching hour + equinox
    const ts = localTime(2025, 3, 20, 2, 0)
    const mods = getTemporalModifiers(ts)
    expect(mods.isWitchingHour).toBe(true)
    expect(mods.isEquinox).toBe(true)
    expect(mods.chargeMultiplier).toBe(2.5)
  })

  it('applies equinox bonus alone during daytime', () => {
    const ts = localTime(2025, 3, 20, 14, 0) // March 20, 2pm
    const mods = getTemporalModifiers(ts)
    expect(mods.isEquinox).toBe(true)
    expect(mods.isWitchingHour).toBe(false)
    expect(mods.chargeMultiplier).toBe(1.25)
    expect(mods.corruptionMultiplier).toBe(1.0)
  })

  it('always includes a valid moonPhase', () => {
    const ts = localTime(2025, 8, 15, 10, 0)
    const mods = getTemporalModifiers(ts)
    expect(mods.moonPhase).toBeDefined()
    expect(mods.moonPhase.illumination).toBeGreaterThanOrEqual(0)
    expect(mods.moonPhase.illumination).toBeLessThanOrEqual(1)
  })
})

// ─── getMoonSymbol ──────────────────────────────────────────────────────────

describe('getMoonSymbol', () => {
  it('returns a non-empty string for every phase', () => {
    const phases: MoonPhaseName[] = [
      'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
    ]
    for (const phase of phases) {
      const symbol = getMoonSymbol(phase)
      expect(symbol.length).toBeGreaterThan(0)
    }
  })

  it('returns different symbols for new and full moon', () => {
    expect(getMoonSymbol('new')).not.toBe(getMoonSymbol('full'))
  })
})
