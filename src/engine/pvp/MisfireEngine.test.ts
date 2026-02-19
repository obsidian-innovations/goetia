import { describe, it, expect } from 'vitest'
import { calculateMisfire } from './MisfireEngine'
import type { Sigil } from '@engine/sigil/Types'
import type { ClashResult } from './ClashResolver'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(overrides: { integrity?: number; contradictions?: number } = {}): Sigil {
  const count = overrides.contradictions ?? 0
  // GlyphId is a branded string — use `as` to satisfy the type
  type GlidPair = [Sigil['intentCoherence']['contradictions'][0][0], Sigil['intentCoherence']['contradictions'][0][1]]
  const contradictions: GlidPair[] = Array.from(
    { length: count },
    (_, i) => [`g${i}a` as GlidPair[0], `g${i}b` as GlidPair[1]],
  )
  return {
    id: 'sig-test',
    demonId: 'bael',
    sealIntegrity: overrides.integrity ?? 0.7,
    completedConnections: [],
    glyphs: [],
    intentCoherence: {
      score: 0.7,
      contradictions,
      incompleteChains: [],
      isolatedGlyphs: [],
    },
    bindingRing: null,
    overallIntegrity: overrides.integrity ?? 0.7,
    visualState: 'healthy',
    status: 'complete',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

function makeClashResult(attackerDamage = 0.15): ClashResult {
  return {
    outcome: 'catastrophic_loss',
    winner: 'defender',
    attackerDamage,
    defenderDamage: 0.02,
    score: -0.5,
    details: 'The defender repels the attacker.',
  }
}

// ─── severity ───────────────────────────────────────────────────────────────

describe('calculateMisfire — severity', () => {
  it('severity is 0 for perfect integrity', () => {
    const result = calculateMisfire(makeSigil({ integrity: 1.0 }), makeClashResult())
    expect(result.severity).toBeCloseTo(0)
  })

  it('severity scales with low integrity', () => {
    const high = calculateMisfire(makeSigil({ integrity: 0.9 }), makeClashResult())
    const low  = calculateMisfire(makeSigil({ integrity: 0.2 }), makeClashResult())
    expect(low.severity).toBeGreaterThan(high.severity)
  })

  it('severity is capped at 1.0', () => {
    const result = calculateMisfire(makeSigil({ integrity: 0.0 }), makeClashResult())
    expect(result.severity).toBeLessThanOrEqual(1.0)
  })

  it('severity formula: (1 - integrity) * 1.5 clamped to 1', () => {
    // integrity=0.4 → (0.6)*1.5 = 0.9
    expect(calculateMisfire(makeSigil({ integrity: 0.4 }), makeClashResult()).severity).toBeCloseTo(0.9)
  })
})

// ─── effects ────────────────────────────────────────────────────────────────

describe('calculateMisfire — effects', () => {
  it('always includes corruption_gain', () => {
    expect(calculateMisfire(makeSigil({ integrity: 0.7 }), makeClashResult()).effects).toContain('corruption_gain')
  })

  it('always includes canvas_distortion', () => {
    expect(calculateMisfire(makeSigil({ integrity: 0.7 }), makeClashResult()).effects).toContain('canvas_distortion')
  })

  it('includes demand_issued when severity > 0.4', () => {
    // integrity=0.8 → severity=(0.2)*1.5=0.3 → no demand
    expect(calculateMisfire(makeSigil({ integrity: 0.8 }), makeClashResult()).effects).not.toContain('demand_issued')
    // integrity=0.3 → severity=(0.7)*1.5=1.05 capped at 1.0 → demand issued
    expect(calculateMisfire(makeSigil({ integrity: 0.3 }), makeClashResult()).effects).toContain('demand_issued')
  })

  it('does not include sigil_destroyed for moderate severity', () => {
    // integrity=0.7 → severity=0.45 → < 0.7
    expect(calculateMisfire(makeSigil({ integrity: 0.7 }), makeClashResult()).effects).not.toContain('sigil_destroyed')
  })

  it('includes sigil_destroyed when severity > 0.7', () => {
    // integrity=0.0 → severity=1.0 → > 0.7
    expect(calculateMisfire(makeSigil({ integrity: 0.0 }), makeClashResult()).effects).toContain('sigil_destroyed')
  })
})

// ─── corruptionGain ─────────────────────────────────────────────────────────

describe('calculateMisfire — corruptionGain', () => {
  it('includes the clash attackerDamage', () => {
    const r = calculateMisfire(makeSigil({ integrity: 0.7 }), makeClashResult(0.15))
    expect(r.corruptionGain).toBeGreaterThanOrEqual(0.15)
  })

  it('contradictions increase corruptionGain', () => {
    const none = calculateMisfire(makeSigil({ integrity: 0.5, contradictions: 0 }), makeClashResult())
    const some = calculateMisfire(makeSigil({ integrity: 0.5, contradictions: 3 }), makeClashResult())
    expect(some.corruptionGain).toBeGreaterThan(none.corruptionGain)
  })
})

// ─── narrative ──────────────────────────────────────────────────────────────

describe('calculateMisfire — narrative', () => {
  it('returns a non-empty string', () => {
    const r = calculateMisfire(makeSigil(), makeClashResult())
    expect(typeof r.narrative).toBe('string')
    expect(r.narrative.length).toBeGreaterThan(0)
  })

  it('describes destruction for high severity', () => {
    const r = calculateMisfire(makeSigil({ integrity: 0.0 }), makeClashResult())
    expect(r.narrative.toLowerCase()).toContain('disintegrat')
  })
})
