import type { Demon, DemonDomain, DemonRank, Sigil } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ClashInput {
  attacker: { sigil: Sigil; demon: Demon }
  defender: { sigil: Sigil; demon: Demon }
}

export type ClashOutcome =
  | 'clean_win'
  | 'contested_win'
  | 'mutual_destruction'
  | 'catastrophic_loss'
  | 'absorption'

export interface ClashResult {
  outcome: ClashOutcome
  /** null for mutual_destruction */
  winner: 'attacker' | 'defender' | null
  /** Corruption gained by the attacker */
  attackerDamage: number
  /** Corruption gained by the defender */
  defenderDamage: number
  /** Numeric score: positive = attacker advantage, negative = defender advantage */
  score: number
  /** Human-readable narrative */
  details: string
}

// ─── Rank power ────────────────────────────────────────────────────────────

const RANK_POWER: Record<DemonRank, number> = {
  King:      8,
  Prince:    7,
  Duke:      6,
  Marquis:   5,
  Earl:      4,
  Knight:    3,
  President: 3,
  Baron:     2,
}

const MAX_RANK_POWER = 8

/** Return the base power of a demon rank. */
export function getRankPower(rank: DemonRank): number {
  return RANK_POWER[rank]
}

// ─── Domain advantage ──────────────────────────────────────────────────────

/**
 * Domain modifier on a -2 to +2 scale.
 * Positive = attacker has the advantage.
 * Checks only primary domains (index 0) to keep interactions clean.
 */
export function getDomainModifier(
  attackerDomains: DemonDomain[],
  defenderDomains: DemonDomain[],
  defenderIntegrity: number,
): number {
  const atk = attackerDomains[0]
  const def = defenderDomains[0]
  if (!atk || !def) return 0

  if (atk === 'binding'     && def === 'liberation')  return  2
  if (atk === 'illusion'    && def === 'revelation')  return  2
  if (atk === 'destruction' && def === 'protection')  return defenderIntegrity >= 0.7 ? -1 : 2
  if (atk === 'liberation'  && def === 'binding')     return -2
  if (atk === 'revelation'  && def === 'illusion')    return -2
  if (atk === 'protection'  && def === 'destruction') return defenderIntegrity >= 0.7 ?  1 : -2
  return 0
}

// ─── Axis calculations ─────────────────────────────────────────────────────

/**
 * Axis 1 — Demonic Hierarchy (weight 0.35).
 * Returns score in [-1, 1] combining rank power difference + domain modifier.
 */
function calcHierarchyAxis(input: ClashInput): number {
  const atkPower = getRankPower(input.attacker.demon.rank)
  const defPower = getRankPower(input.defender.demon.rank)
  const rankNorm = (atkPower - defPower) / (MAX_RANK_POWER - 2)  // max diff = 6
  const domainMod = getDomainModifier(
    input.attacker.demon.domains,
    input.defender.demon.domains,
    input.defender.sigil.overallIntegrity,
  )
  const domainNorm = domainMod / 2  // scale ±2 to ±1
  return Math.max(-1, Math.min(1, rankNorm + domainNorm))
}

/**
 * Axis 2 — Execution Quality (weight 0.40).
 * Returns score in [-1, 1] from integrity difference (amplified ×2 per plan).
 */
function calcQualityAxis(input: ClashInput): number {
  const diff = input.attacker.sigil.overallIntegrity - input.defender.sigil.overallIntegrity
  return Math.max(-1, Math.min(1, diff * 2))
}

/**
 * Axis 3 — Intent Coherence (weight 0.25).
 * Returns score in [-1, 1] from coherence difference.
 */
function calcCoherenceAxis(input: ClashInput): number {
  const atkCoh = input.attacker.sigil.intentCoherence.score
  const defCoh = input.defender.sigil.intentCoherence.score
  return Math.max(-1, Math.min(1, atkCoh - defCoh))
}

// ─── Outcome mapping ───────────────────────────────────────────────────────

function outcomeFromScore(score: number, attackerHasBinding: boolean): ClashOutcome {
  // Special case: binding domain + dominant win → absorption
  if (attackerHasBinding && score > 0.5) return 'absorption'

  if (score >  0.6) return 'clean_win'
  if (score >  0.2) return 'contested_win'
  if (score > -0.2) return 'mutual_destruction'
  if (score >= -0.6) return 'catastrophic_loss'
  return 'catastrophic_loss'
}

const DAMAGE: Record<ClashOutcome, { attacker: number; defender: number }> = {
  clean_win:            { attacker: 0.02, defender: 0.15 },
  contested_win:        { attacker: 0.05, defender: 0.08 },
  mutual_destruction:   { attacker: 0.05, defender: 0.05 },
  catastrophic_loss:    { attacker: 0.15, defender: 0.02 },
  absorption:           { attacker: 0.00, defender: 0.20 },
}

const WINNER: Record<ClashOutcome, 'attacker' | 'defender' | null> = {
  clean_win:          'attacker',
  contested_win:      'attacker',
  mutual_destruction: null,
  catastrophic_loss:  'defender',
  absorption:         'attacker',
}

function buildDetails(
  outcome: ClashOutcome,
  attacker: Demon,
  defender: Demon,
  score: number,
): string {
  const scoreTag = score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)
  switch (outcome) {
    case 'clean_win':
      return `${attacker.name} overwhelms ${defender.name}. The defender's sigil shatters. (${scoreTag})`
    case 'contested_win':
      return `${attacker.name} prevails after a hard struggle against ${defender.name}. (${scoreTag})`
    case 'mutual_destruction':
      return `${attacker.name} and ${defender.name} tear each other apart. Both sigils are destroyed. (${scoreTag})`
    case 'catastrophic_loss':
      return `${defender.name} repels ${attacker.name}. The attacker's sigil rebounds with devastating force. (${scoreTag})`
    case 'absorption':
      return `${attacker.name}'s binding is absolute. ${defender.name} is subsumed into the pact. (${scoreTag})`
  }
}

// ─── Main resolution function ───────────────────────────────────────────────

/**
 * Resolves a clash between two sigils. Pure function — no side effects.
 */
export function resolveClash(input: ClashInput): ClashResult {
  const axis1 = calcHierarchyAxis(input)
  const axis2 = calcQualityAxis(input)
  const axis3 = calcCoherenceAxis(input)

  const score = axis1 * 0.35 + axis2 * 0.40 + axis3 * 0.25

  const attackerHasBinding = input.attacker.demon.domains.includes('binding')
  const outcome = outcomeFromScore(score, attackerHasBinding)
  const { attacker: attackerDamage, defender: defenderDamage } = DAMAGE[outcome]
  const winner = WINNER[outcome]
  const details = buildDetails(outcome, input.attacker.demon, input.defender.demon, score)

  return { outcome, winner, attackerDamage, defenderDamage, score, details }
}
