import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  canGenerateOffer,
  generateOffer,
  acceptOffer,
  rejectOffer,
  counterOffer,
  isOfferExpired,
} from './NegotiationEngine'
import type { DemonOffer } from './NegotiationEngine'
import type { Demon, Sigil } from '@engine/sigil/Types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDemon(overrides?: Partial<Demon>): Demon {
  return {
    id: 'demon-1',
    name: 'Baal',
    rank: 'King',
    domains: ['binding'],
    legions: 66,
    sealGeometry: { nodes: [], edges: [] },
    description: 'test',
    ...overrides,
  }
}

function makeSigil(overrides?: Partial<Sigil>): Sigil {
  return {
    id: 'sigil-1',
    demonId: 'demon-1',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.8, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.75,
    visualState: 'healthy',
    status: 'awakened',
    createdAt: Date.now(),
    statusChangedAt: Date.now(),
    ...overrides,
  }
}

describe('NegotiationEngine', () => {
  // ── Eligibility ─────────────────────────────────────────────────────────

  describe('canGenerateOffer', () => {
    it('allows awakened sigil with acquaintance familiarity', () => {
      expect(canGenerateOffer('awakened', 'acquaintance')).toBe(true)
    })

    it('allows charged sigil with bonded familiarity', () => {
      expect(canGenerateOffer('charged', 'bonded')).toBe(true)
    })

    it('rejects draft sigil', () => {
      expect(canGenerateOffer('draft', 'acquaintance')).toBe(false)
    })

    it('rejects complete sigil', () => {
      expect(canGenerateOffer('complete', 'familiar')).toBe(false)
    })

    it('rejects resting sigil', () => {
      expect(canGenerateOffer('resting', 'bonded')).toBe(false)
    })

    it('rejects stranger familiarity', () => {
      expect(canGenerateOffer('awakened', 'stranger')).toBe(false)
    })
  })

  // ── Offer generation ──────────────────────────────────────────────────

  describe('generateOffer', () => {
    beforeEach(() => { vi.spyOn(Math, 'random') })
    afterEach(() => { vi.restoreAllMocks() })

    it('returns null for ineligible sigil status', () => {
      const offer = generateOffer(makeDemon(), makeSigil({ status: 'draft' }), 'acquaintance', 1000)
      expect(offer).toBeNull()
    })

    it('returns null for ineligible familiarity', () => {
      const offer = generateOffer(makeDemon(), makeSigil(), 'stranger', 1000)
      expect(offer).toBeNull()
    })

    it('returns null when random chance fails', () => {
      vi.mocked(Math.random).mockReturnValue(0.99) // >= 0.15 → no offer
      const offer = generateOffer(makeDemon(), makeSigil(), 'acquaintance', 1000)
      expect(offer).toBeNull()
    })

    it('generates offer when conditions met and chance succeeds', () => {
      vi.mocked(Math.random)
        .mockReturnValueOnce(0.05)  // < 0.15 → offer generated
        .mockReturnValueOnce(0)     // benefit type index
        .mockReturnValueOnce(0)     // cost type index
      const offer = generateOffer(makeDemon(), makeSigil(), 'acquaintance', 1000)
      expect(offer).not.toBeNull()
      expect(offer!.demonId).toBe('demon-1')
      expect(offer!.benefit.type).toBe('charge_speed')
      expect(offer!.cost.type).toBe('doubled_corruption')
      expect(offer!.expiresAt).toBe(1000 + 5 * 60 * 1000)
    })

    it('scales benefit by demon rank', () => {
      vi.mocked(Math.random)
        .mockReturnValueOnce(0.05).mockReturnValueOnce(0).mockReturnValueOnce(0)
      const kingOffer = generateOffer(makeDemon({ rank: 'King' }), makeSigil(), 'acquaintance', 1000)

      vi.mocked(Math.random)
        .mockReturnValueOnce(0.05).mockReturnValueOnce(0).mockReturnValueOnce(0)
      const baronOffer = generateOffer(makeDemon({ rank: 'Baron' }), makeSigil(), 'acquaintance', 1000)

      expect(kingOffer!.benefit.value).toBeGreaterThan(baronOffer!.benefit.value)
    })
  })

  // ── Accept ──────────────────────────────────────────────────────────────

  describe('acceptOffer', () => {
    it('returns active benefit and cost', () => {
      const offer: DemonOffer = {
        id: 'offer-1',
        demonId: 'demon-1',
        benefit: { type: 'hex_resist', value: 0.3 },
        cost: { type: 'shifted_geometry', description: 'test' },
        expiresAt: 99999,
      }
      const result = acceptOffer(offer)
      expect(result.activeBenefit.type).toBe('hex_resist')
      expect(result.activeBenefit.value).toBe(0.3)
      expect(result.activeBenefit.expiresAt).toBeNull() // permanent
      expect(result.activeCost.type).toBe('shifted_geometry')
    })
  })

  // ── Reject ──────────────────────────────────────────────────────────────

  describe('rejectOffer', () => {
    it('returns familiarity penalty and demand escalation', () => {
      const offer: DemonOffer = {
        id: 'offer-1',
        demonId: 'demon-1',
        benefit: { type: 'charge_speed', value: 0.2 },
        cost: { type: 'doubled_corruption', description: 'test' },
        expiresAt: 99999,
      }
      const result = rejectOffer(offer)
      expect(result.familiarityPenalty).toBe(-15)
      expect(result.demandEscalation).toBe(1.5)
    })
  })

  // ── Counter ─────────────────────────────────────────────────────────────

  describe('counterOffer', () => {
    it('returns reduced benefit offer', () => {
      const offer: DemonOffer = {
        id: 'offer-1',
        demonId: 'demon-1',
        benefit: { type: 'corruption_shield', value: 0.40 },
        cost: { type: 'doubled_corruption', description: 'test' },
        expiresAt: 99999,
      }
      const result = counterOffer(offer, 2000)
      expect(result.counterOffer.benefit.value).toBeCloseTo(0.24, 2) // 0.40 * 0.6
      expect(result.counterOffer.cost.type).not.toBe('doubled_corruption') // different cost
      // Counter offer has half the standard duration (5min * 0.5 = 2.5min from now=2000)
      expect(result.counterOffer.expiresAt).toBe(2000 + 5 * 60 * 1000 * 0.5)
    })
  })

  // ── Expiry ──────────────────────────────────────────────────────────────

  describe('isOfferExpired', () => {
    it('returns false before expiry', () => {
      const offer: DemonOffer = {
        id: 'offer-1', demonId: 'd', benefit: { type: 'charge_speed', value: 0.1 },
        cost: { type: 'doubled_corruption', description: '' }, expiresAt: 10000,
      }
      expect(isOfferExpired(offer, 5000)).toBe(false)
    })

    it('returns true at expiry', () => {
      const offer: DemonOffer = {
        id: 'offer-1', demonId: 'd', benefit: { type: 'charge_speed', value: 0.1 },
        cost: { type: 'doubled_corruption', description: '' }, expiresAt: 10000,
      }
      expect(isOfferExpired(offer, 10000)).toBe(true)
    })
  })
})
