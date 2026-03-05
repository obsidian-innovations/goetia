import type { Sigil, SigilStatus } from '@engine/sigil/Types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface GrimoirePageLike {
  demonId: string
  sigils: Sigil[]
}

// ─── Pure grimoire query functions ──────────────────────────────────────────

const BOUND_STATUSES: SigilStatus[] = ['complete', 'resting', 'awakened', 'charged']

/** Find the sigil with the highest overallIntegrity across all pages. */
export function getBestSigil(pages: GrimoirePageLike[]): Sigil | null {
  let best: Sigil | null = null
  for (const page of pages) {
    for (const sigil of page.sigils) {
      if (!best || sigil.overallIntegrity > best.overallIntegrity) {
        best = sigil
      }
    }
  }
  return best
}

/** Total number of sigils across all grimoire pages. */
export function getSigilCount(pages: GrimoirePageLike[]): number {
  let count = 0
  for (const page of pages) {
    count += page.sigils.length
  }
  return count
}

/** Get demon IDs that have at least one bound (non-draft, non-spent) sigil. */
export function getBoundDemonIds(pages: GrimoirePageLike[]): string[] {
  const ids: string[] = []
  for (const page of pages) {
    const hasBound = page.sigils.some(s => BOUND_STATUSES.includes(s.status))
    if (hasBound) ids.push(page.demonId)
  }
  return ids
}

/** Sum of all sigil integrities across the grimoire. */
export function getGrimoirePower(pages: GrimoirePageLike[]): number {
  let power = 0
  for (const page of pages) {
    for (const sigil of page.sigils) {
      power += sigil.overallIntegrity
    }
  }
  return power
}
