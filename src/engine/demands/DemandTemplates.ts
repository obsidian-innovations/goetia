import type { DemonDomain, DemonRank } from '@engine/sigil/Types'

// ─── Template types ─────────────────────────────────────────────────────────

export type DemandType =
  | 'silence'
  | 'darkness'
  | 'sacrifice'
  | 'revelation'
  | 'isolation'
  | 'offering'

interface DemandTemplate {
  type: DemandType
  description: string
  /** Base duration for ongoing demands (null = one-shot) */
  baseDurationMs: number | null
}

// ─── Template registry ──────────────────────────────────────────────────────

const TEMPLATES_BY_DOMAIN: Record<DemonDomain, DemandTemplate[]> = {
  knowledge: [
    {
      type: 'silence',
      description: 'Spend 10 minutes in complete silence',
      baseDurationMs: 10 * 60 * 1000,
    },
    {
      type: 'revelation',
      description: 'Write down a secret you have never told anyone',
      baseDurationMs: null,
    },
    {
      type: 'darkness',
      description: 'Be in complete darkness for 20 minutes',
      baseDurationMs: 20 * 60 * 1000,
    },
  ],
  destruction: [
    {
      type: 'sacrifice',
      description: 'Destroy something of minor value',
      baseDurationMs: null,
    },
    {
      type: 'sacrifice',
      description: 'Delete a saved sigil from your grimoire',
      baseDurationMs: null,
    },
  ],
  illusion: [
    {
      type: 'isolation',
      description: 'Do not look at a mirror for 6 hours',
      baseDurationMs: 6 * 60 * 60 * 1000,
    },
    {
      type: 'revelation',
      description: 'Lie to someone today',
      baseDurationMs: null,
    },
  ],
  binding: [
    {
      type: 'isolation',
      description: 'Do not leave your current location for 1 hour',
      baseDurationMs: 60 * 60 * 1000,
    },
    {
      type: 'offering',
      description: 'Record the names of those bound to you',
      baseDurationMs: null,
    },
  ],
  revelation: [
    {
      type: 'revelation',
      description: 'Tell someone a truth they do not want to hear',
      baseDurationMs: null,
    },
  ],
  transformation: [
    {
      type: 'offering',
      description: 'Change your appearance in some way today',
      baseDurationMs: null,
    },
  ],
  discord: [
    {
      type: 'isolation',
      description: 'Do not speak to another person for 6 hours',
      baseDurationMs: 6 * 60 * 60 * 1000,
    },
  ],
  protection: [
    {
      type: 'offering',
      description: 'Guard a place of significance for 30 minutes',
      baseDurationMs: 30 * 60 * 1000,
    },
  ],
  liberation: [
    {
      type: 'sacrifice',
      description: 'Release something you have been holding onto',
      baseDurationMs: null,
    },
  ],
}

// ─── Deadline by rank ───────────────────────────────────────────────────────

/** Returns the demand deadline in milliseconds for a given rank. */
export function getDeadlineMs(rank: DemonRank): number {
  switch (rank) {
    case 'Baron':
    case 'Knight':
    case 'President': return 24 * 60 * 60 * 1000 // 24 hours
    case 'Earl':
    case 'Marquis':
    case 'Duke':      return 12 * 60 * 60 * 1000 // 12 hours
    case 'Prince':
    case 'King':      return 6 * 60 * 60 * 1000  //  6 hours
  }
}

// ─── Selector ──────────────────────────────────────────────────────────────

/**
 * Picks a demand template for the given domain and escalation level.
 * Higher escalation selects later templates in the list.
 */
export function getTemplate(domain: DemonDomain, escalation: number): DemandTemplate {
  const templates = TEMPLATES_BY_DOMAIN[domain]
  const idx = Math.min(escalation, templates.length - 1)
  return templates[idx]
}

export type { DemandTemplate }
