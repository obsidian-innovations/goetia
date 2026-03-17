// ─── Negotiation Engine ──────────────────────────────────────────────────────
// Pure engine: generates demon offers, handles accept/reject/counter.
// Offers only appear for awakened+ sigils with acquaintance+ familiarity.

import type { Demon, DemonRank, Sigil, SigilStatus } from '@engine/sigil/Types'
import type { FamiliarityTier } from '@engine/familiarity/FamiliarityEngine'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BenefitType = 'charge_speed' | 'hex_resist' | 'corruption_shield'
export type CostType = 'doubled_corruption' | 'shifted_geometry' | 'permanent_demand'

export interface DemonOffer {
  id: string
  demonId: string
  benefit: { type: BenefitType; value: number }
  cost: { type: CostType; description: string }
  expiresAt: number
}

export interface AcceptResult {
  offer: DemonOffer
  activeBenefit: { type: BenefitType; value: number; expiresAt: number | null }
  activeCost: { type: CostType; description: string }
}

export interface RejectResult {
  offer: DemonOffer
  familiarityPenalty: number
  demandEscalation: number
}

export interface CounterResult {
  originalOffer: DemonOffer
  counterOffer: DemonOffer
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum sigil status to receive an offer. */
const OFFER_MIN_STATUSES: SigilStatus[] = ['awakened', 'charged']

/** Minimum familiarity tier to receive an offer. */
const OFFER_MIN_TIERS: FamiliarityTier[] = ['acquaintance', 'familiar', 'bonded']

/** Offer duration (ms) — 5 minutes. */
const OFFER_DURATION_MS = 5 * 60 * 1000

/** Chance of generating an offer when conditions are met. */
const OFFER_CHANCE = 0.15

/** Familiarity penalty for rejecting an offer. */
const REJECT_FAMILIARITY_PENALTY = -15

/** Demand escalation multiplier for rejecting an offer. */
const REJECT_DEMAND_ESCALATION = 1.5

/** Counter-offer benefit reduction factor. */
const COUNTER_BENEFIT_REDUCTION = 0.6

/** Counter-offer cost reduction factor. */
const COUNTER_COST_REDUCTION = 0.5

const RANK_BENEFIT_SCALE: Record<DemonRank, number> = {
  King: 0.40,
  Prince: 0.35,
  Duke: 0.30,
  Marquis: 0.25,
  Earl: 0.20,
  President: 0.18,
  Knight: 0.15,
  Baron: 0.12,
}

const BENEFIT_TYPES: BenefitType[] = ['charge_speed', 'hex_resist', 'corruption_shield']
const COST_TYPES: CostType[] = ['doubled_corruption', 'shifted_geometry', 'permanent_demand']

const COST_DESCRIPTIONS: Record<CostType, string> = {
  doubled_corruption: 'All corruption from this demon is doubled',
  shifted_geometry: 'The seal geometry shifts permanently',
  permanent_demand: 'A demand that can never be dismissed',
}

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Check if a demon can make an offer given the sigil status and familiarity.
 */
export function canGenerateOffer(
  sigilStatus: SigilStatus,
  familiarityTier: FamiliarityTier,
): boolean {
  return (
    OFFER_MIN_STATUSES.includes(sigilStatus) &&
    OFFER_MIN_TIERS.includes(familiarityTier)
  )
}

/**
 * Generate a demon offer. Returns null if conditions are not met or random
 * chance fails.
 */
export function generateOffer(
  demon: Demon,
  sigil: Sigil,
  familiarityTier: FamiliarityTier,
  now: number,
): DemonOffer | null {
  if (!canGenerateOffer(sigil.status, familiarityTier)) return null
  if (Math.random() >= OFFER_CHANCE) return null

  const benefitType = BENEFIT_TYPES[Math.floor(Math.random() * BENEFIT_TYPES.length)]
  const costType = COST_TYPES[Math.floor(Math.random() * COST_TYPES.length)]

  const baseValue = RANK_BENEFIT_SCALE[demon.rank]
  // Scale benefit by sigil integrity
  const value = Math.round((baseValue + sigil.overallIntegrity * 0.1) * 100) / 100

  return {
    id: `offer-${demon.id}-${now}`,
    demonId: demon.id,
    benefit: { type: benefitType, value },
    cost: { type: costType, description: COST_DESCRIPTIONS[costType] },
    expiresAt: now + OFFER_DURATION_MS,
  }
}

/**
 * Accept an offer. Returns the active benefit and cost to apply.
 */
export function acceptOffer(offer: DemonOffer): AcceptResult {
  return {
    offer,
    activeBenefit: {
      type: offer.benefit.type,
      value: offer.benefit.value,
      expiresAt: null, // Permanent benefit
    },
    activeCost: {
      type: offer.cost.type,
      description: offer.cost.description,
    },
  }
}

/**
 * Reject an offer. Returns familiarity penalty and demand escalation.
 */
export function rejectOffer(offer: DemonOffer): RejectResult {
  return {
    offer,
    familiarityPenalty: REJECT_FAMILIARITY_PENALTY,
    demandEscalation: REJECT_DEMAND_ESCALATION,
  }
}

/**
 * Counter an offer. Returns a new offer with reduced benefit and cost.
 */
export function counterOffer(offer: DemonOffer, now: number): CounterResult {
  const counterBenefit = {
    type: offer.benefit.type,
    value: Math.round(offer.benefit.value * COUNTER_BENEFIT_REDUCTION * 100) / 100,
  }
  const otherCosts = COST_TYPES.filter(t => t !== offer.cost.type)
  const counterCostType = otherCosts[Math.floor(Math.random() * otherCosts.length)]

  const newOffer: DemonOffer = {
    id: `counter-${offer.id}-${now}`,
    demonId: offer.demonId,
    benefit: counterBenefit,
    cost: { type: counterCostType, description: COST_DESCRIPTIONS[counterCostType] },
    expiresAt: now + OFFER_DURATION_MS * COUNTER_COST_REDUCTION,
  }

  return { originalOffer: offer, counterOffer: newOffer }
}

/**
 * Check if an offer has expired.
 */
export function isOfferExpired(offer: DemonOffer, now: number): boolean {
  return now >= offer.expiresAt
}
