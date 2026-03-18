// ─── Types ─────────────────────────────────────────────────────────────────

export interface DemonTreatment {
  /** Times used in offensive hexes */
  hexUses: number
  /** Times sigil was purified */
  purifications: number
  /** Times successfully bound */
  bindings: number
  /** Times used in clashes */
  clashUses: number
  /** Cumulative familiarity across all players */
  collectiveFamiliarity: number
}

export interface DemonPersonality {
  /** Demand escalation shift (-0.2 to +0.2 from baseline) */
  demandShift: number
  /** Whether this demon should appear in unexpected encounters */
  anomalousEncounters: boolean
  /** Binding difficulty modifier (1.0 = baseline) */
  bindingDifficultyMultiplier: number
}

export interface GlobalDemonMemory {
  /** Aggregated treatment data per demon ID */
  treatments: Map<string, DemonTreatment>
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Hex uses required before demand escalation begins shifting. */
const HEX_AGGRESSION_THRESHOLD = 10

/** Purifications required before binding difficulty starts increasing. */
const PURIFICATION_RESISTANCE_THRESHOLD = 5

/** Collective familiarity threshold for anomalous encounters. */
const ANOMALOUS_ENCOUNTER_THRESHOLD = 50

/** Maximum demand shift (positive = more aggressive). */
const MAX_DEMAND_SHIFT = 0.20

/** Minimum demand shift. */
const MIN_DEMAND_SHIFT = -0.20

// ─── Factory ───────────────────────────────────────────────────────────────

export function createGlobalMemory(): GlobalDemonMemory {
  return { treatments: new Map() }
}

function defaultTreatment(): DemonTreatment {
  return {
    hexUses: 0,
    purifications: 0,
    bindings: 0,
    clashUses: 0,
    collectiveFamiliarity: 0,
  }
}

// ─── Recording Events ──────────────────────────────────────────────────────

function getTreatment(memory: GlobalDemonMemory, demonId: string): DemonTreatment {
  return memory.treatments.get(demonId) ?? defaultTreatment()
}

function setTreatment(
  memory: GlobalDemonMemory,
  demonId: string,
  treatment: DemonTreatment,
): GlobalDemonMemory {
  const treatments = new Map(memory.treatments)
  treatments.set(demonId, treatment)
  return { treatments }
}

/** Record that a demon's sigil was used in an offensive hex. */
export function recordHexUse(memory: GlobalDemonMemory, demonId: string): GlobalDemonMemory {
  const t = getTreatment(memory, demonId)
  return setTreatment(memory, demonId, { ...t, hexUses: t.hexUses + 1 })
}

/** Record that a demon's sigil was purified. */
export function recordPurification(memory: GlobalDemonMemory, demonId: string): GlobalDemonMemory {
  const t = getTreatment(memory, demonId)
  return setTreatment(memory, demonId, { ...t, purifications: t.purifications + 1 })
}

/** Record a successful binding. */
export function recordBinding(memory: GlobalDemonMemory, demonId: string): GlobalDemonMemory {
  const t = getTreatment(memory, demonId)
  return setTreatment(memory, demonId, { ...t, bindings: t.bindings + 1 })
}

/** Record a clash use. */
export function recordClashUse(memory: GlobalDemonMemory, demonId: string): GlobalDemonMemory {
  const t = getTreatment(memory, demonId)
  return setTreatment(memory, demonId, { ...t, clashUses: t.clashUses + 1 })
}

/** Add familiarity points from a player interaction. */
export function addFamiliarity(
  memory: GlobalDemonMemory,
  demonId: string,
  amount: number,
): GlobalDemonMemory {
  const t = getTreatment(memory, demonId)
  return setTreatment(memory, demonId, {
    ...t,
    collectiveFamiliarity: t.collectiveFamiliarity + amount,
  })
}

// ─── Personality Derivation ────────────────────────────────────────────────

/**
 * Derive a demon's personality modifiers from its global treatment history.
 * Effects are subtle (10–20% shifts) but cumulative over real weeks.
 */
export function getDemonPersonality(
  memory: GlobalDemonMemory,
  demonId: string,
): DemonPersonality {
  const t = getTreatment(memory, demonId)

  // Hex aggression: more hex use → more aggressive demands
  const hexShift = t.hexUses > HEX_AGGRESSION_THRESHOLD
    ? Math.min(MAX_DEMAND_SHIFT, (t.hexUses - HEX_AGGRESSION_THRESHOLD) * 0.01)
    : 0

  // Purification resistance: frequently purified → harder to bind
  const purificationPenalty = t.purifications > PURIFICATION_RESISTANCE_THRESHOLD
    ? (t.purifications - PURIFICATION_RESISTANCE_THRESHOLD) * 0.02
    : 0

  // Binding familiarity: many bindings → slightly easier demands (demon is cooperative)
  const bindingBonus = t.bindings > 10 ? Math.min(0.10, t.bindings * 0.005) : 0

  const demandShift = Math.max(MIN_DEMAND_SHIFT, Math.min(MAX_DEMAND_SHIFT, hexShift - bindingBonus))

  return {
    demandShift,
    anomalousEncounters: t.collectiveFamiliarity >= ANOMALOUS_ENCOUNTER_THRESHOLD,
    bindingDifficultyMultiplier: 1.0 + purificationPenalty,
  }
}

/**
 * Get the adjusted demand escalation for a demon.
 * Returns baseline + personality shift.
 */
export function getAdjustedEscalation(
  memory: GlobalDemonMemory,
  demonId: string,
  baselineEscalation: number,
): number {
  const personality = getDemonPersonality(memory, demonId)
  return Math.max(0, baselineEscalation + personality.demandShift)
}
