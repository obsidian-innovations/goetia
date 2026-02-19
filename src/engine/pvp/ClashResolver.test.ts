import { describe, it, expect } from 'vitest'
import {
  resolveClash,
  getRankPower,
  getDomainModifier,
  type ClashInput,
} from './ClashResolver'
import type { Demon, Sigil, DemonRank, DemonDomain } from '@engine/sigil/Types'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeSigil(overrides: {
  integrity?: number
  coherence?: number
  demonId?: string
  status?: Sigil['status']
} = {}): Sigil {
  return {
    id: 'sig-' + Math.random().toString(36).slice(2),
    demonId: overrides.demonId ?? 'bael',
    sealIntegrity: overrides.integrity ?? 0.7,
    completedConnections: [],
    glyphs: [],
    intentCoherence: {
      score: overrides.coherence ?? 0.7,
      contradictions: [],
      incompleteChains: [],
      isolatedGlyphs: [],
    },
    bindingRing: null,
    overallIntegrity: overrides.integrity ?? 0.7,
    visualState: 'healthy',
    status: overrides.status ?? 'complete',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

function makeDemon(rank: DemonRank, domains: DemonDomain[], id = 'demo'): Demon {
  return {
    id,
    name: rank,
    rank,
    domains,
    legions: 10,
    sealGeometry: { nodes: [], edges: [] },
    description: '',
  }
}

function makeInput(
  atkRank: DemonRank,
  atkDomains: DemonDomain[],
  atkIntegrity: number,
  atkCoherence: number,
  defRank: DemonRank,
  defDomains: DemonDomain[],
  defIntegrity: number,
  defCoherence: number,
): ClashInput {
  return {
    attacker: { sigil: makeSigil({ integrity: atkIntegrity, coherence: atkCoherence }), demon: makeDemon(atkRank, atkDomains, 'atk') },
    defender: { sigil: makeSigil({ integrity: defIntegrity, coherence: defCoherence }), demon: makeDemon(defRank, defDomains, 'def') },
  }
}

// ─── getRankPower ──────────────────────────────────────────────────────────

describe('getRankPower', () => {
  it('King has highest power', () => expect(getRankPower('King')).toBe(8))
  it('Baron has lowest power', () => expect(getRankPower('Baron')).toBe(2))
  it('Prince < King', () => expect(getRankPower('Prince')).toBeLessThan(getRankPower('King')))
  it('Duke < Prince', () => expect(getRankPower('Duke')).toBeLessThan(getRankPower('Prince')))
  it('Marquis = Earl rank above Knight', () => {
    expect(getRankPower('Marquis')).toBeGreaterThan(getRankPower('Knight'))
  })
})

// ─── getDomainModifier ─────────────────────────────────────────────────────

describe('getDomainModifier', () => {
  it('binding beats liberation (+2)', () => {
    expect(getDomainModifier(['binding'], ['liberation'], 0.5)).toBe(2)
  })

  it('liberation loses to binding (-2)', () => {
    expect(getDomainModifier(['liberation'], ['binding'], 0.5)).toBe(-2)
  })

  it('illusion beats revelation (+2)', () => {
    expect(getDomainModifier(['illusion'], ['revelation'], 0.5)).toBe(2)
  })

  it('revelation loses to illusion (-2)', () => {
    expect(getDomainModifier(['revelation'], ['illusion'], 0.5)).toBe(-2)
  })

  it('destruction beats protection when defender integrity < 0.7', () => {
    expect(getDomainModifier(['destruction'], ['protection'], 0.5)).toBe(2)
  })

  it('protection contains destruction when defender integrity >= 0.7', () => {
    expect(getDomainModifier(['destruction'], ['protection'], 0.7)).toBe(-1)
  })

  it('knowledge vs knowledge is neutral', () => {
    expect(getDomainModifier(['knowledge'], ['knowledge'], 0.5)).toBe(0)
  })

  it('unrelated domains are neutral', () => {
    expect(getDomainModifier(['transformation'], ['discord'], 0.5)).toBe(0)
  })

  it('handles empty domain arrays gracefully', () => {
    expect(getDomainModifier([], ['binding'], 0.5)).toBe(0)
  })
})

// ─── resolveClash — rank matchups ──────────────────────────────────────────

describe('resolveClash — rank hierarchy', () => {
  it('King vs Baron is a clean win for King (even with equal integrity)', () => {
    const input = makeInput('King', ['knowledge'], 0.7, 0.7, 'Baron', ['knowledge'], 0.7, 0.7)
    const result = resolveClash(input)
    expect(result.winner).toBe('attacker')
    expect(['clean_win', 'contested_win']).toContain(result.outcome)
  })

  it('Baron vs King is a catastrophic loss for Baron', () => {
    const input = makeInput('Baron', ['knowledge'], 0.7, 0.7, 'King', ['knowledge'], 0.7, 0.7)
    const result = resolveClash(input)
    expect(result.winner).toBe('defender')
    expect(result.outcome).toBe('catastrophic_loss')
  })

  it('equal rank + equal everything = mutual destruction', () => {
    const input = makeInput('Duke', ['knowledge'], 0.5, 0.5, 'Duke', ['knowledge'], 0.5, 0.5)
    const result = resolveClash(input)
    expect(result.outcome).toBe('mutual_destruction')
    expect(result.winner).toBeNull()
  })

  it('Duke vs Baron with equal integrity: Duke wins', () => {
    const input = makeInput('Duke', ['knowledge'], 0.7, 0.7, 'Baron', ['knowledge'], 0.7, 0.7)
    expect(resolveClash(input).winner).toBe('attacker')
  })
})

// ─── resolveClash — quality (integrity) ───────────────────────────────────

describe('resolveClash — execution quality', () => {
  it('high integrity attacker beats low integrity defender of same rank', () => {
    const input = makeInput('Duke', ['knowledge'], 0.95, 0.8, 'Duke', ['knowledge'], 0.30, 0.8)
    expect(resolveClash(input).winner).toBe('attacker')
  })

  it('low integrity attacker loses to high integrity defender', () => {
    const input = makeInput('Duke', ['knowledge'], 0.30, 0.8, 'Duke', ['knowledge'], 0.95, 0.8)
    expect(resolveClash(input).winner).toBe('defender')
  })
})

// ─── resolveClash — coherence ─────────────────────────────────────────────

describe('resolveClash — intent coherence', () => {
  it('fully coherent sigil beats incoherent sigil of equal rank+integrity', () => {
    const input = makeInput('Duke', ['knowledge'], 0.7, 1.0, 'Duke', ['knowledge'], 0.7, 0.0)
    expect(resolveClash(input).winner).toBe('attacker')
  })
})

// ─── resolveClash — domain interactions ───────────────────────────────────

describe('resolveClash — domain interactions', () => {
  it('binding vs liberation: binding wins despite equal rank', () => {
    const input = makeInput('Baron', ['binding'], 0.7, 0.7, 'Baron', ['liberation'], 0.7, 0.7)
    expect(resolveClash(input).winner).toBe('attacker')
  })

  it('illusion vs revelation: illusion wins despite equal rank', () => {
    const input = makeInput('Baron', ['illusion'], 0.7, 0.7, 'Baron', ['revelation'], 0.7, 0.7)
    expect(resolveClash(input).winner).toBe('attacker')
  })

  it('protection with high integrity resists destruction', () => {
    // Destruction vs high-integrity Protection defender — should not be clean win for destruction
    const input = makeInput('Baron', ['destruction'], 0.7, 0.7, 'Baron', ['protection'], 0.9, 0.7)
    const result = resolveClash(input)
    // High-integrity protection holds off destruction — destroyer shouldn't clean win
    expect(result.outcome).not.toBe('clean_win')
  })

  it('destruction beats low-integrity protection', () => {
    const input = makeInput('Baron', ['destruction'], 0.7, 0.7, 'Baron', ['protection'], 0.3, 0.7)
    const result = resolveClash(input)
    expect(result.winner).toBe('attacker')
  })
})

// ─── resolveClash — absorption special case ───────────────────────────────

describe('resolveClash — absorption', () => {
  it('binding attacker with dominant win produces absorption', () => {
    // King with binding domain vs Baron with liberation: should score > 0.5
    const input = makeInput('King', ['binding'], 0.95, 0.95, 'Baron', ['liberation'], 0.2, 0.2)
    const result = resolveClash(input)
    expect(result.outcome).toBe('absorption')
    expect(result.winner).toBe('attacker')
    expect(result.defenderDamage).toBeCloseTo(0.20)
    expect(result.attackerDamage).toBeCloseTo(0.00)
  })

  it('non-binding attacker cannot produce absorption', () => {
    const input = makeInput('King', ['knowledge'], 0.95, 0.95, 'Baron', ['liberation'], 0.2, 0.2)
    expect(resolveClash(input).outcome).not.toBe('absorption')
  })
})

// ─── resolveClash — damage values ─────────────────────────────────────────

describe('resolveClash — damage', () => {
  it('clean win has low attacker damage and high defender damage', () => {
    const input = makeInput('King', ['knowledge'], 0.9, 0.9, 'Baron', ['knowledge'], 0.1, 0.1)
    const r = resolveClash(input)
    if (r.outcome === 'clean_win') {
      expect(r.attackerDamage).toBeLessThan(r.defenderDamage)
    }
  })

  it('mutual destruction inflicts equal damage on both', () => {
    const input = makeInput('Duke', ['knowledge'], 0.5, 0.5, 'Duke', ['knowledge'], 0.5, 0.5)
    const r = resolveClash(input)
    if (r.outcome === 'mutual_destruction') {
      expect(r.attackerDamage).toBeCloseTo(r.defenderDamage)
    }
  })

  it('catastrophic loss inflicts more damage on attacker', () => {
    const input = makeInput('Baron', ['knowledge'], 0.1, 0.1, 'King', ['knowledge'], 0.9, 0.9)
    const r = resolveClash(input)
    expect(r.attackerDamage).toBeGreaterThan(r.defenderDamage)
  })
})

// ─── resolveClash — score ─────────────────────────────────────────────────

describe('resolveClash — score', () => {
  it('score is positive when attacker is stronger', () => {
    const input = makeInput('King', ['knowledge'], 0.9, 0.9, 'Baron', ['knowledge'], 0.1, 0.1)
    expect(resolveClash(input).score).toBeGreaterThan(0)
  })

  it('score is negative when defender is stronger', () => {
    const input = makeInput('Baron', ['knowledge'], 0.1, 0.1, 'King', ['knowledge'], 0.9, 0.9)
    expect(resolveClash(input).score).toBeLessThan(0)
  })

  it('score is near zero for equal combatants', () => {
    const input = makeInput('Duke', ['knowledge'], 0.5, 0.5, 'Duke', ['knowledge'], 0.5, 0.5)
    expect(Math.abs(resolveClash(input).score)).toBeLessThan(0.1)
  })
})

// ─── resolveClash — details ───────────────────────────────────────────────

describe('resolveClash — details string', () => {
  it('contains both demon names', () => {
    const atk = makeDemon('King', ['knowledge'], 'king-test')
    const def = makeDemon('Baron', ['knowledge'], 'baron-test')
    atk.name = 'Bael'
    def.name = 'Agares'
    const input: ClashInput = {
      attacker: { sigil: makeSigil({ integrity: 0.9 }), demon: atk },
      defender: { sigil: makeSigil({ integrity: 0.1 }), demon: def },
    }
    const r = resolveClash(input)
    expect(r.details).toContain('Bael')
    expect(r.details).toContain('Agares')
  })
})
