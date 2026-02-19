import type { DemonRank } from '../sigil/Types.ts'

// ─── Types ─────────────────────────────────────────────────────────────────

export type CorruptionStage = 'clean' | 'tainted' | 'compromised' | 'vessel'

export interface CorruptionSource {
  type: 'pact' | 'sigil_cast' | 'clash_loss' | 'misfire' | 'demand_ignored'
  amount: number
  timestamp: number
}

export interface CorruptionState {
  /** Current level 0–1. Never decreases on its own. */
  level: number
  sources: CorruptionSource[]
  stage: CorruptionStage
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Stage thresholds — lower-bound inclusive */
const THRESHOLDS = { tainted: 0.25, compromised: 0.50, vessel: 0.80 }

const RANK_MULT: Record<DemonRank, number> = {
  Baron: 1.0, Knight: 1.0, President: 1.2, Earl: 1.3,
  Marquis: 1.5, Duke: 1.8, Prince: 2.0, King: 2.5,
}

/** Base corruption per source type before rank multiplier. */
const BASE_AMOUNTS: Record<CorruptionSource['type'], number> = {
  sigil_cast:     0.020,
  clash_loss:     0.080,
  misfire:        0.050,
  demand_ignored: 0.040,
  pact:           0.080,
}

// ─── Functions ─────────────────────────────────────────────────────────────

export function createCorruptionState(): CorruptionState {
  return { level: 0, sources: [], stage: 'clean' }
}

/** Derive stage from a corruption level. */
export function getStage(level: number): CorruptionStage {
  if (level >= THRESHOLDS.vessel)      return 'vessel'
  if (level >= THRESHOLDS.compromised) return 'compromised'
  if (level >= THRESHOLDS.tainted)     return 'tainted'
  return 'clean'
}

/**
 * Get the corruption amount for an action at a given demon rank.
 * Clamped to [0, 0.20] as per plan.
 */
export function getCorruptionAmount(
  type: CorruptionSource['type'],
  rank: DemonRank,
): number {
  return Math.min(0.20, BASE_AMOUNTS[type] * RANK_MULT[rank])
}

/**
 * Add corruption. Level never exceeds 1.0 and never decreases.
 */
export function addCorruption(
  state: CorruptionState,
  source: CorruptionSource,
): CorruptionState {
  const newLevel = Math.min(1, state.level + source.amount)
  return {
    level:   newLevel,
    sources: [...state.sources, source],
    stage:   getStage(newLevel),
  }
}

/** Returns true when the player's corruption has reached vessel stage. */
export function isVessel(state: CorruptionState): boolean {
  return state.level >= THRESHOLDS.vessel
}

/** Returns true when the player has fully crossed into the vessel state (level = 1). */
export function isFullyVessel(state: CorruptionState): boolean {
  return state.level >= 1.0
}
