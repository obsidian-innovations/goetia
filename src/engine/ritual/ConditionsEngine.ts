// ─── Ritual Conditions Engine ─────────────────────────────────────────────────
// Pure engine: detects environmental conditions and computes modifiers for
// ritual accuracy (seal, ring, coherence) and charging.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RitualConditions {
  darkness: number            // 0-1 from camera luminance (1 = total darkness)
  movement: number            // 0-1 from geolocation velocity
  silence: number             // 0-1 from microphone (1 = total silence)
  rhythmic: boolean           // from microphone onset detection
  thinPlaceMultiplier: number // from world engine
  temporalMultiplier: number  // from temporal engine
}

export interface ConditionModifiers {
  ringBonus: number           // +0.05 in darkness
  sealPenalty: number         // -0.03 during movement
  coherenceBonus: number      // +0.05 during movement OR rhythmic sound
  chargeBonus: number         // from silence
  chargePenalty: number       // from noise (inverse of silence)
  coherenceRhythmBonus: number // from rhythmic sound
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Darkness threshold above which ring bonus applies. */
const DARKNESS_THRESHOLD = 0.6

/** Maximum ring bonus from darkness. */
const MAX_RING_BONUS = 0.05

/** Movement threshold above which seal penalty / coherence bonus apply. */
const MOVEMENT_THRESHOLD = 0.3

/** Maximum seal penalty from movement. */
const MAX_SEAL_PENALTY = 0.03

/** Maximum coherence bonus from movement. */
const MAX_COHERENCE_BONUS = 0.05

/** Silence threshold above which charge bonus applies. */
const SILENCE_THRESHOLD = 0.5

/** Maximum charge bonus from silence. */
const MAX_CHARGE_BONUS = 0.04

/** Maximum charge penalty from noise. */
const MAX_CHARGE_PENALTY = 0.03

/** Coherence bonus from rhythmic sound. */
const RHYTHM_COHERENCE_BONUS = 0.05

/** Movement velocity (m/s) that maps to movement=1.0. */
const MAX_VELOCITY_MS = 3.0

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Create a default (neutral) RitualConditions with no environmental input.
 */
export function createDefaultConditions(): RitualConditions {
  return {
    darkness: 0,
    movement: 0,
    silence: 0.5, // neutral — no mic input means no bonus or penalty
    rhythmic: false,
    thinPlaceMultiplier: 1.0,
    temporalMultiplier: 1.0,
  }
}

/**
 * Convert geolocation speed (m/s) to a 0-1 movement value.
 * Returns 0 if speed is null or negative.
 */
export function velocityToMovement(speedMs: number | null): number {
  if (speedMs == null || speedMs <= 0) return 0
  return Math.min(1, speedMs / MAX_VELOCITY_MS)
}

/**
 * Convert average frame luminance (0-255) to a 0-1 darkness value.
 * 0 luminance → darkness 1, 255 luminance → darkness 0.
 */
export function luminanceToDarkness(avgLuminance: number): number {
  return Math.max(0, Math.min(1, 1 - avgLuminance / 255))
}

/**
 * Convert audio level (0-1, where 1 = loud) to a 0-1 silence value.
 */
export function audioLevelToSilence(level: number): number {
  return Math.max(0, Math.min(1, 1 - level))
}

/**
 * Calculate condition modifiers from the current ritual conditions.
 * All modifiers are additive adjustments to the base ritual evaluation.
 */
export function calculateConditionModifiers(conditions: RitualConditions): ConditionModifiers {
  // Darkness → ring bonus (drawing circles in the dark feels more powerful)
  const ringBonus = conditions.darkness >= DARKNESS_THRESHOLD
    ? MAX_RING_BONUS * ((conditions.darkness - DARKNESS_THRESHOLD) / (1 - DARKNESS_THRESHOLD))
    : 0

  // Movement → seal penalty + coherence bonus (harder precision, better flow)
  const movementFactor = conditions.movement >= MOVEMENT_THRESHOLD
    ? (conditions.movement - MOVEMENT_THRESHOLD) / (1 - MOVEMENT_THRESHOLD)
    : 0
  const sealPenalty = MAX_SEAL_PENALTY * movementFactor
  const coherenceBonus = MAX_COHERENCE_BONUS * movementFactor

  // Silence → charge bonus; noise → charge penalty
  const chargeBonus = conditions.silence >= SILENCE_THRESHOLD
    ? MAX_CHARGE_BONUS * ((conditions.silence - SILENCE_THRESHOLD) / (1 - SILENCE_THRESHOLD))
    : 0
  const chargePenalty = conditions.silence < (1 - SILENCE_THRESHOLD)
    ? MAX_CHARGE_PENALTY * (1 - conditions.silence - SILENCE_THRESHOLD) / (1 - SILENCE_THRESHOLD)
    : 0

  // Rhythmic sound → coherence rhythm bonus
  const coherenceRhythmBonus = conditions.rhythmic ? RHYTHM_COHERENCE_BONUS : 0

  return {
    ringBonus,
    sealPenalty,
    coherenceBonus,
    chargeBonus,
    chargePenalty: Math.max(0, chargePenalty),
    coherenceRhythmBonus,
  }
}

/**
 * Stack condition modifiers with thin-place and temporal multipliers.
 * Returns a combined charge multiplier that can be applied to the base charge rate.
 */
export function getStackedChargeMultiplier(conditions: RitualConditions, modifiers: ConditionModifiers): number {
  const base = 1.0 + modifiers.chargeBonus - modifiers.chargePenalty
  return Math.max(0, base * conditions.thinPlaceMultiplier * conditions.temporalMultiplier)
}
