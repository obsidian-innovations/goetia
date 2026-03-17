import type { DemonDomain, Sigil } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResonanceState {
  domain: DemonDomain
  resonatingDemonIds: string[]
  passiveChargeRate: number
  corruptionSpreadRate: number
}

export interface DomainEffect {
  domain: DemonDomain
  chargeBonus: number
  corruptionPenalty: number
}

interface PageLike {
  demonId: string
  sigils: Sigil[]
}

interface DemonLike {
  id: string
  domains: DemonDomain[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Base passive charge rate for resonating sigils (5% of normal). */
const BASE_PASSIVE_CHARGE = 0.05

/** Base corruption spread rate between resonating sigils. */
const BASE_CORRUPTION_SPREAD = 0.20

/** Minimum number of demons sharing a domain to trigger resonance. */
const MIN_RESONANCE_COUNT = 2

// ─── Domain-specific effects ──────────────────────────────────────────────

const DOMAIN_EFFECTS: Record<DemonDomain, Omit<DomainEffect, 'domain'>> = {
  binding:        { chargeBonus: 0.10, corruptionPenalty: 0.05 },
  knowledge:      { chargeBonus: 0.03, corruptionPenalty: 0.00 },
  destruction:    { chargeBonus: 0.05, corruptionPenalty: 0.15 },
  illusion:       { chargeBonus: 0.02, corruptionPenalty: 0.02 },
  transformation: { chargeBonus: 0.04, corruptionPenalty: 0.03 },
  discord:        { chargeBonus: 0.01, corruptionPenalty: 0.10 },
  protection:     { chargeBonus: 0.06, corruptionPenalty: -0.05 },
  revelation:     { chargeBonus: 0.04, corruptionPenalty: 0.01 },
  liberation:     { chargeBonus: 0.03, corruptionPenalty: 0.04 },
}

// ─── Internal helpers ─────────────────────────────────────────────────────

function buildPageIndex(pages: PageLike[]): Map<string, PageLike> {
  const index = new Map<string, PageLike>()
  for (const page of pages) index.set(page.demonId, page)
  return index
}

// ─── Core functions ───────────────────────────────────────────────────────

/**
 * Find all active resonances across grimoire pages.
 * A resonance occurs when 2+ bound demons share a domain.
 */
export function findResonances(
  pages: PageLike[],
  demons: DemonLike[],
): ResonanceState[] {
  // Map demon IDs in the grimoire to their domains
  const grimoireDemonIds = new Set(pages.map(p => p.demonId))
  const domainGroups = new Map<DemonDomain, string[]>()

  for (const demon of demons) {
    if (!grimoireDemonIds.has(demon.id)) continue
    for (const domain of demon.domains) {
      const group = domainGroups.get(domain)
      if (group) {
        group.push(demon.id)
      } else {
        domainGroups.set(domain, [demon.id])
      }
    }
  }

  const resonances: ResonanceState[] = []
  for (const [domain, demonIds] of domainGroups) {
    if (demonIds.length < MIN_RESONANCE_COUNT) continue
    const effect = DOMAIN_EFFECTS[domain]
    resonances.push({
      domain,
      resonatingDemonIds: demonIds,
      passiveChargeRate: BASE_PASSIVE_CHARGE + effect.chargeBonus,
      corruptionSpreadRate: BASE_CORRUPTION_SPREAD + effect.corruptionPenalty,
    })
  }

  return resonances
}

/**
 * Get the domain-specific effect for a given domain.
 */
export function getDomainEffect(domain: DemonDomain): DomainEffect {
  return { domain, ...DOMAIN_EFFECTS[domain] }
}

/**
 * Calculate passive charge gained by resonating sigils over a time interval.
 * Returns a map of sigilId → charge delta.
 */
export function calculatePassiveCharge(
  resonances: ResonanceState[],
  pages: PageLike[],
  intervalMs: number,
): Map<string, number> {
  const charges = new Map<string, number>()
  const intervalMinutes = intervalMs / 60_000
  const pageIndex = buildPageIndex(pages)

  for (const resonance of resonances) {
    const rate = resonance.passiveChargeRate * intervalMinutes
    for (const demonId of resonance.resonatingDemonIds) {
      const page = pageIndex.get(demonId)
      if (!page) continue
      for (const sigil of page.sigils) {
        // Only resting or awakened sigils gain passive charge
        if (sigil.status !== 'resting' && sigil.status !== 'awakened') continue
        const existing = charges.get(sigil.id) ?? 0
        charges.set(sigil.id, existing + rate)
      }
    }
  }

  return charges
}

/**
 * Calculate corruption spread between resonating sigils.
 * Returns total corruption delta for the player (proportional to highest
 * corruption among resonating sigils).
 */
export function calculateCorruptionSpread(
  resonances: ResonanceState[],
  pages: PageLike[],
): number {
  let totalSpread = 0
  const pageIndex = buildPageIndex(pages)

  for (const resonance of resonances) {
    // Find the highest-corruption sigil among resonating demons
    let maxCorruption = 0
    for (const demonId of resonance.resonatingDemonIds) {
      const page = pageIndex.get(demonId)
      if (!page) continue
      for (const sigil of page.sigils) {
        if (sigil.visualState === 'corrupted' || sigil.overallIntegrity < 0.30) {
          maxCorruption = Math.max(maxCorruption, 1 - sigil.overallIntegrity)
        }
      }
    }

    if (maxCorruption > 0) {
      totalSpread += maxCorruption * resonance.corruptionSpreadRate
    }
  }

  return totalSpread
}
