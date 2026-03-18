import type { ClashResult } from '@engine/pvp/ClashResolver'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ObservationResult {
  /** The clash that was witnessed */
  clashResult: ClashResult
  /** Corruption absorbed by the observer's most recent sigil */
  corruptionAbsorbed: number
  /** Whether the observer was in the same thin place */
  wasInRange: boolean
  /** XP gained from observation (contributes to familiarity) */
  observationXp: number
}

export interface SpectralObservationState {
  /** Active observations being witnessed */
  activeObservations: ObservationResult[]
  /** Total observation XP accumulated (persisted) */
  totalXp: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Corruption absorption rate: 2% of each side's clash damage. */
const CORRUPTION_ABSORPTION_RATE = 0.02

/** Base XP gained per observation. */
const BASE_OBSERVATION_XP = 1.0

/** XP multiplier for high-intensity clashes. */
const INTENSITY_XP_MULTIPLIER = 2.0

/** Threshold for a clash to be considered "high-intensity". */
const HIGH_INTENSITY_THRESHOLD = 0.5

// ─── Factory ───────────────────────────────────────────────────────────────

export function createObservationState(): SpectralObservationState {
  return {
    activeObservations: [],
    totalXp: 0,
  }
}

// ─── Core Logic ────────────────────────────────────────────────────────────

/**
 * Process an observed clash. Observation is involuntary — if you're in the thin place,
 * you witness it and pay the corruption cost.
 *
 * Returns the observation result with corruption absorbed and XP gained.
 */
export function observeClash(
  clashResult: ClashResult,
  observerInRange: boolean,
): ObservationResult {
  if (!observerInRange) {
    return {
      clashResult,
      corruptionAbsorbed: 0,
      wasInRange: false,
      observationXp: 0,
    }
  }

  // 2% of each side's damage absorbed by observer's most recent sigil
  const totalDamage = clashResult.attackerDamage + clashResult.defenderDamage
  const corruptionAbsorbed = totalDamage * CORRUPTION_ABSORPTION_RATE

  // XP scales with clash intensity
  const intensity = Math.abs(clashResult.score)
  const xpMultiplier = intensity > HIGH_INTENSITY_THRESHOLD ? INTENSITY_XP_MULTIPLIER : 1.0
  const observationXp = BASE_OBSERVATION_XP * xpMultiplier

  return {
    clashResult,
    corruptionAbsorbed,
    wasInRange: true,
    observationXp,
  }
}

/**
 * Apply an observation to the state: record it and accumulate XP.
 */
export function recordObservation(
  state: SpectralObservationState,
  observation: ObservationResult,
): SpectralObservationState {
  if (!observation.wasInRange) return state

  return {
    activeObservations: [...state.activeObservations, observation],
    totalXp: state.totalXp + observation.observationXp,
  }
}

/**
 * Clear expired observations (e.g., after being displayed to the observer).
 */
export function clearObservations(
  state: SpectralObservationState,
): SpectralObservationState {
  return {
    ...state,
    activeObservations: [],
  }
}

/**
 * Get the total corruption a sigil has absorbed from observations.
 */
export function getTotalCorruptionAbsorbed(
  state: SpectralObservationState,
): number {
  return state.activeObservations.reduce(
    (sum, obs) => sum + obs.corruptionAbsorbed,
    0,
  )
}
