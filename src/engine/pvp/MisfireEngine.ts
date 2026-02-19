import type { Sigil } from '@engine/sigil/Types'
import type { ClashResult } from './ClashResolver'

// ─── Types ─────────────────────────────────────────────────────────────────

export type MisfireEffect =
  | 'corruption_gain'
  | 'sigil_destroyed'
  | 'demand_issued'
  | 'canvas_distortion'

export interface MisfireResult {
  /** 0–1; higher = more severe rebound */
  severity: number
  effects: MisfireEffect[]
  /** Additional corruption beyond the clash's base attackerDamage */
  corruptionGain: number
  narrative: string
}

// ─── Core calculation ───────────────────────────────────────────────────────

/**
 * Calculate the misfire result for a sigil that lost a clash.
 *
 * Per plan: `misfireSeverity = (1 - integrity) * 1.5`, clamped to [0, 1].
 * Low-integrity sigils rebound harder.
 */
export function calculateMisfire(sigil: Sigil, clashResult: ClashResult): MisfireResult {
  const severity = Math.min(1, (1 - sigil.overallIntegrity) * 1.5)

  const effects: MisfireEffect[] = ['corruption_gain', 'canvas_distortion']

  // Moderate severity: the rebound issues a demonic demand
  if (severity > 0.4) {
    effects.push('demand_issued')
  }

  // High severity: the sigil is destroyed outright
  if (severity > 0.7) {
    effects.push('sigil_destroyed')
  }

  // Each contradiction in the loser's sigil amplifies corruption
  const contradictionPenalty = sigil.intentCoherence.contradictions.length * 0.05
  const corruptionGain = clashResult.attackerDamage + severity * 0.1 + contradictionPenalty

  const narrative = _buildNarrative(severity, clashResult)

  return { severity, effects, corruptionGain, narrative }
}

// ─── Narrative ─────────────────────────────────────────────────────────────

function _buildNarrative(severity: number, clashResult: ClashResult): string {
  if (severity > 0.7) {
    return `The sigil disintegrates violently, its bindings unravelling. ${clashResult.details}`
  }
  if (severity > 0.4) {
    return `The sigil fractures under the rebound. A demand echoes from beyond. ${clashResult.details}`
  }
  return `The sigil shivers, corruption seeping into its edges. ${clashResult.details}`
}
