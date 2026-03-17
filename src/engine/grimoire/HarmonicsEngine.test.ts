import { describe, it, expect } from 'vitest'
import {
  findResonances,
  getDomainEffect,
  calculatePassiveCharge,
  calculateCorruptionSpread,
} from './HarmonicsEngine'
import type { DemonDomain, Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000

function makeSigil(id: string, demonId: string, overrides: Partial<Sigil> = {}): Sigil {
  return {
    id,
    demonId,
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.85,
    visualState: 'healthy',
    status: 'resting',
    createdAt: NOW,
    statusChangedAt: NOW,
    ...overrides,
  }
}

function makePages(entries: Array<{ demonId: string; sigils?: Partial<Sigil>[] }>) {
  return entries.map(e => ({
    demonId: e.demonId,
    sigils: (e.sigils ?? [{}]).map((s, i) => makeSigil(`sig-${e.demonId}-${i}`, e.demonId, s)),
  }))
}

function makeDemons(entries: Array<{ id: string; domains: DemonDomain[] }>) {
  return entries.map(e => ({ id: e.id, domains: e.domains }))
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('HarmonicsEngine', () => {
  describe('findResonances', () => {
    it('detects resonance when 2+ demons share a domain', () => {
      const pages = makePages([{ demonId: 'bael' }, { demonId: 'agares' }])
      const demons = makeDemons([
        { id: 'bael', domains: ['knowledge', 'destruction'] },
        { id: 'agares', domains: ['knowledge'] },
      ])

      const resonances = findResonances(pages, demons)
      expect(resonances).toHaveLength(1)
      expect(resonances[0].domain).toBe('knowledge')
      expect(resonances[0].resonatingDemonIds).toEqual(['bael', 'agares'])
    })

    it('returns empty when no shared domains', () => {
      const pages = makePages([{ demonId: 'bael' }, { demonId: 'agares' }])
      const demons = makeDemons([
        { id: 'bael', domains: ['knowledge'] },
        { id: 'agares', domains: ['destruction'] },
      ])

      expect(findResonances(pages, demons)).toHaveLength(0)
    })

    it('ignores demons not in grimoire', () => {
      const pages = makePages([{ demonId: 'bael' }])
      const demons = makeDemons([
        { id: 'bael', domains: ['knowledge'] },
        { id: 'agares', domains: ['knowledge'] }, // not in pages
      ])

      expect(findResonances(pages, demons)).toHaveLength(0)
    })

    it('detects multiple resonances', () => {
      const pages = makePages([{ demonId: 'a' }, { demonId: 'b' }, { demonId: 'c' }])
      const demons = makeDemons([
        { id: 'a', domains: ['knowledge', 'binding'] },
        { id: 'b', domains: ['knowledge'] },
        { id: 'c', domains: ['binding'] },
      ])

      const resonances = findResonances(pages, demons)
      expect(resonances).toHaveLength(2)
      const domains = resonances.map(r => r.domain).sort()
      expect(domains).toEqual(['binding', 'knowledge'])
    })

    it('includes domain-specific rates', () => {
      const pages = makePages([{ demonId: 'a' }, { demonId: 'b' }])
      const demons = makeDemons([
        { id: 'a', domains: ['destruction'] },
        { id: 'b', domains: ['destruction'] },
      ])

      const [res] = findResonances(pages, demons)
      // destruction: chargeBonus=0.05, corruptionPenalty=0.15
      expect(res.passiveChargeRate).toBeCloseTo(0.05 + 0.05) // base + bonus
      expect(res.corruptionSpreadRate).toBeCloseTo(0.20 + 0.15) // base + penalty
    })

    it('protection domain reduces corruption spread', () => {
      const pages = makePages([{ demonId: 'a' }, { demonId: 'b' }])
      const demons = makeDemons([
        { id: 'a', domains: ['protection'] },
        { id: 'b', domains: ['protection'] },
      ])

      const [res] = findResonances(pages, demons)
      // protection: corruptionPenalty = -0.05
      expect(res.corruptionSpreadRate).toBeCloseTo(0.20 - 0.05)
    })
  })

  describe('getDomainEffect', () => {
    it('returns effects for each domain', () => {
      const domains: DemonDomain[] = [
        'knowledge', 'destruction', 'binding', 'illusion',
        'transformation', 'discord', 'protection', 'revelation', 'liberation',
      ]
      for (const domain of domains) {
        const effect = getDomainEffect(domain)
        expect(effect.domain).toBe(domain)
        expect(typeof effect.chargeBonus).toBe('number')
        expect(typeof effect.corruptionPenalty).toBe('number')
      }
    })

    it('destruction has highest corruption penalty', () => {
      const destruction = getDomainEffect('destruction')
      const knowledge = getDomainEffect('knowledge')
      expect(destruction.corruptionPenalty).toBeGreaterThan(knowledge.corruptionPenalty)
    })
  })

  describe('calculatePassiveCharge', () => {
    it('charges resting sigils in resonating domains', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ status: 'resting' as const }] },
        { demonId: 'b', sigils: [{ status: 'resting' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      const charges = calculatePassiveCharge(resonances, pages, 60_000) // 1 minute
      expect(charges.size).toBe(2)
      for (const [, charge] of charges) {
        expect(charge).toBeGreaterThan(0)
      }
    })

    it('skips sigils that are not resting or awakened', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ status: 'spent' as const }] },
        { demonId: 'b', sigils: [{ status: 'resting' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      const charges = calculatePassiveCharge(resonances, pages, 60_000)
      expect(charges.size).toBe(1)
      expect(charges.has('sig-b-0')).toBe(true)
    })

    it('scales charge with interval', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ status: 'resting' as const }] },
        { demonId: 'b', sigils: [{ status: 'resting' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      const shortCharge = calculatePassiveCharge(resonances, pages, 60_000)
      const longCharge = calculatePassiveCharge(resonances, pages, 300_000)

      const shortVal = shortCharge.get('sig-a-0')!
      const longVal = longCharge.get('sig-a-0')!
      expect(longVal).toBeCloseTo(shortVal * 5)
    })

    it('accumulates charge from multiple resonances', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ status: 'resting' as const }] },
        { demonId: 'b', sigils: [{ status: 'resting' as const }] },
      ])
      // Both share knowledge AND binding → 2 resonances, each adds charge to 'a'
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge', 'binding'] },
        { id: 'b', domains: ['knowledge', 'binding'] },
      ]))

      expect(resonances).toHaveLength(2)
      const charges = calculatePassiveCharge(resonances, pages, 60_000)
      const singleRes = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))
      const singleCharge = calculatePassiveCharge(singleRes, pages, 60_000)

      expect(charges.get('sig-a-0')!).toBeGreaterThan(singleCharge.get('sig-a-0')!)
    })
  })

  describe('calculateCorruptionSpread', () => {
    it('returns 0 when no corrupted sigils', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ overallIntegrity: 0.8, visualState: 'healthy' as const }] },
        { demonId: 'b', sigils: [{ overallIntegrity: 0.7, visualState: 'healthy' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      expect(calculateCorruptionSpread(resonances, pages)).toBe(0)
    })

    it('spreads corruption from corrupted sigils', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ overallIntegrity: 0.15, visualState: 'corrupted' as const }] },
        { demonId: 'b', sigils: [{ overallIntegrity: 0.8, visualState: 'healthy' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      const spread = calculateCorruptionSpread(resonances, pages)
      expect(spread).toBeGreaterThan(0)
      // (1 - 0.15) * (0.20 + 0.00) = 0.85 * 0.20 = 0.17
      expect(spread).toBeCloseTo(0.17)
    })

    it('uses worst-case corruption among resonating sigils', () => {
      const pages = makePages([
        { demonId: 'a', sigils: [{ overallIntegrity: 0.10, visualState: 'corrupted' as const }] },
        { demonId: 'b', sigils: [{ overallIntegrity: 0.25, visualState: 'corrupted' as const }] },
      ])
      const resonances = findResonances(pages, makeDemons([
        { id: 'a', domains: ['knowledge'] },
        { id: 'b', domains: ['knowledge'] },
      ]))

      const spread = calculateCorruptionSpread(resonances, pages)
      // Worst = 0.10 → maxCorruption = 0.90
      expect(spread).toBeCloseTo(0.90 * 0.20)
    })
  })
})
