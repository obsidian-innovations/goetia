import type { DrawingPhase, Sigil } from './Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InvertedSigilResult {
  sigil: Sigil
  isDefensive: boolean
  corruptionMultiplier: number
}

export interface BrokenRiteResult {
  sacrificialValue: number       // 0–1, usable as purification component
  corruptionReduction: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Corruption multiplier for inverted sigils. */
const INVERTED_CORRUPTION_MULTIPLIER = 2.0

/** Seal integrity below this triggers broken rite evaluation. */
const BROKEN_RITE_SEAL_THRESHOLD = 0.5

/** Inverted composition weights (ring and seal swapped vs normal). */
const INVERTED_RING_WEIGHT = 0.40
const INVERTED_COHERENCE_WEIGHT = 0.35
const INVERTED_SEAL_WEIGHT = 0.25

// ─── Phase-order detection ────────────────────────────────────────────────

/**
 * Detect an inverted rite: RING drawn before SEAL.
 * Only the first occurrence of each phase matters.
 */
export function detectInvertedRite(phaseHistory: DrawingPhase[]): boolean {
  let ringIdx = -1
  let sealIdx = -1
  for (let i = 0; i < phaseHistory.length; i++) {
    if (phaseHistory[i] === 'RING' && ringIdx === -1) ringIdx = i
    if (phaseHistory[i] === 'SEAL' && sealIdx === -1) sealIdx = i
  }
  return ringIdx >= 0 && sealIdx >= 0 && ringIdx < sealIdx
}

// ─── Inverted composition ─────────────────────────────────────────────────

/**
 * Compose an inverted sigil — swap seal/ring weights.
 * Ring becomes dominant (0.40) and seal becomes minor (0.25).
 * Returns a new sigil with recalculated overallIntegrity.
 */
export function composeInvertedSigil(sigil: Sigil): InvertedSigilResult {
  const ringStrength = sigil.bindingRing?.overallStrength ?? 0
  const coherenceScore = sigil.intentCoherence.score

  const overallIntegrity =
    ringStrength * INVERTED_RING_WEIGHT +
    coherenceScore * INVERTED_COHERENCE_WEIGHT +
    sigil.sealIntegrity * INVERTED_SEAL_WEIGHT

  return {
    sigil: {
      ...sigil,
      overallIntegrity,
    },
    isDefensive: true,
    corruptionMultiplier: INVERTED_CORRUPTION_MULTIPLIER,
  }
}

// ─── Broken rite evaluation ───────────────────────────────────────────────

/**
 * Evaluate a broken rite — incomplete seal (< 0.5) with a binding ring.
 * The ring's strength becomes sacrificial, convertible to purification.
 * sacrificialValue = ringStrength * (1 - sealIntegrity)
 * corruptionReduction = sacrificialValue * 0.5
 */
export function evaluateBrokenRite(
  sealIntegrity: number,
  ringStrength: number,
): BrokenRiteResult | null {
  if (sealIntegrity >= BROKEN_RITE_SEAL_THRESHOLD || ringStrength <= 0) {
    return null
  }

  const sacrificialValue = ringStrength * (1 - sealIntegrity)
  const corruptionReduction = sacrificialValue * 0.5

  return { sacrificialValue, corruptionReduction }
}
