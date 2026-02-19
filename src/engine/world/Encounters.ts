import type { ThinPlace } from './ThinPlaces'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Encounter {
  id: string
  /** ID of the unbound demon manifesting */
  demonId: string
  thinPlaceId: string
  startedAt: number
  /** 0–1: how strongly the demon is interfering with rituals */
  interferenceLevel: number
  /** Whether the player has successfully bound the demon */
  bound: boolean
}

export interface InterferenceEffects {
  /** Node position jitter in normalised units (0–0.05) */
  nodePositionNoise: number
  /** Seal geometry transparency reduction (0–0.4) */
  sealAlphaReduction: number
  /** Canvas colour tint (hex) or null */
  colourTint: number | null
  /** Glyph recognition threshold increase (makes recognition harder) */
  glyphThresholdBump: number
}

// ─── Demon pool for encounters ──────────────────────────────────────────────

// The 6 unbound demons that haunt thin places (not in starter registry)
// These are seeded to appear in Phase 4 encounters until the player researches them
const ENCOUNTER_DEMON_IDS = [
  'bael', 'agares', 'vassago', 'gamygyn', 'marbas', 'valefor',
]

// ─── Constants ─────────────────────────────────────────────────────────────

/** Base encounter probability per veil check (before veilStrength scaling). */
const BASE_ENCOUNTER_CHANCE = 0.15

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Rolls for a PvE encounter when a player enters a thin place.
 * Lower veilStrength = higher chance of encounter.
 * Returns null if no encounter this visit.
 *
 * `seed` is an optional deterministic value for testing (defaults to Math.random()).
 */
export function generateEncounter(
  thinPlace: ThinPlace,
  now: number,
  seed = Math.random(),
): Encounter | null {
  // Probability scales with veil thinness: veilStrength 0 → 100%, 1 → 15%
  const encounterChance = BASE_ENCOUNTER_CHANCE + (1 - thinPlace.veilStrength) * (1 - BASE_ENCOUNTER_CHANCE)

  if (seed > encounterChance) return null

  // Select a demon from the pool deterministically via seed
  const demonIndex = Math.floor(seed * ENCOUNTER_DEMON_IDS.length)
  const demonId = ENCOUNTER_DEMON_IDS[Math.min(demonIndex, ENCOUNTER_DEMON_IDS.length - 1)]

  // Interference scales with veil strength (thinner = stronger interference)
  const interferenceLevel = 0.3 + (1 - thinPlace.veilStrength) * 0.7

  return {
    id: `enc-${thinPlace.id}-${now}`,
    demonId,
    thinPlaceId: thinPlace.id,
    startedAt: now,
    interferenceLevel,
    bound: false,
  }
}

/**
 * Calculates the visual and mechanical interference effects for an encounter.
 * Scales all effects with the encounter's interferenceLevel.
 */
export function calculateInterference(encounter: Encounter): InterferenceEffects {
  const i = encounter.interferenceLevel

  return {
    nodePositionNoise: i * 0.05,
    sealAlphaReduction: i * 0.4,
    colourTint: i > 0.5 ? 0x330011 : null,
    glyphThresholdBump: i * 0.15,
  }
}

/**
 * Marks an encounter as resolved (demon successfully bound).
 * The caller is responsible for awarding research XP.
 */
export function resolveEncounter(encounter: Encounter): Encounter {
  return { ...encounter, bound: true }
}

/**
 * Returns true if the encounter is still ongoing (not bound, started < 10min ago).
 */
export function isEncounterActive(encounter: Encounter, now: number): boolean {
  if (encounter.bound) return false
  return now - encounter.startedAt < 10 * 60 * 1000
}
