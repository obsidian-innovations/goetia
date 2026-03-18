import type { CovenState } from './CovenEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MemberWeight {
  /** Cumulative quality of contributions (rituals, sigils, clashes won) */
  contribution: number
  /** Fraction of events attended / rituals completed without dropping */
  reliability: number
  /** Derived influence: contribution × reliability */
  influence: number
}

export interface HierarchyState {
  /** Map from playerId to hidden member weights */
  weights: Map<string, MemberWeight>
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Betrayal permanently reduces contribution by this fraction. */
const BETRAYAL_PENALTY = 0.5

/** Maximum reliability (capped at 1.0). */
const MAX_RELIABILITY = 1.0

/** Contribution decay per tick (prevents runaway accumulation). */
const CONTRIBUTION_DECAY = 0.001

// ─── Factory ───────────────────────────────────────────────────────────────

/** Create an empty hierarchy state. */
export function createHierarchy(): HierarchyState {
  return { weights: new Map() }
}

/** Initialize a hierarchy from a coven's member list. */
export function initFromCoven(covenState: CovenState): HierarchyState {
  const weights = new Map<string, MemberWeight>()
  for (const memberId of covenState.coven.members) {
    weights.set(memberId, { contribution: 0, reliability: 1.0, influence: 0 })
  }
  return { weights }
}

// ─── Weight Updates ────────────────────────────────────────────────────────

/** Ensure a member exists in the hierarchy, initializing with defaults if not. */
function ensureMember(state: HierarchyState, playerId: string): HierarchyState {
  if (state.weights.has(playerId)) return state
  const weights = new Map(state.weights)
  weights.set(playerId, { contribution: 0, reliability: 1.0, influence: 0 })
  return { weights }
}

/** Record a contribution event (ritual completion, sigil quality, clash win). */
export function recordContribution(
  state: HierarchyState,
  playerId: string,
  quality: number,
): HierarchyState {
  state = ensureMember(state, playerId)
  const weights = new Map(state.weights)
  const current = weights.get(playerId)!
  const newContribution = current.contribution + quality
  const newInfluence = newContribution * current.reliability
  weights.set(playerId, { ...current, contribution: newContribution, influence: newInfluence })
  return { weights }
}

/** Record that a member participated (increases reliability toward 1.0). */
export function recordParticipation(
  state: HierarchyState,
  playerId: string,
): HierarchyState {
  state = ensureMember(state, playerId)
  const weights = new Map(state.weights)
  const current = weights.get(playerId)!
  const newReliability = Math.min(MAX_RELIABILITY, current.reliability + 0.02)
  const newInfluence = current.contribution * newReliability
  weights.set(playerId, { ...current, reliability: newReliability, influence: newInfluence })
  return { weights }
}

/** Record that a member missed an event (decreases reliability). */
export function recordAbsence(
  state: HierarchyState,
  playerId: string,
): HierarchyState {
  state = ensureMember(state, playerId)
  const weights = new Map(state.weights)
  const current = weights.get(playerId)!
  const newReliability = Math.max(0, current.reliability - 0.05)
  const newInfluence = current.contribution * newReliability
  weights.set(playerId, { ...current, reliability: newReliability, influence: newInfluence })
  return { weights }
}

/**
 * Apply betrayal penalty: permanently halves contribution.
 * This creates a "trust deficit" that can never be fully recovered.
 */
export function applyBetrayalPenalty(
  state: HierarchyState,
  playerId: string,
): HierarchyState {
  state = ensureMember(state, playerId)
  const weights = new Map(state.weights)
  const current = weights.get(playerId)!
  const newContribution = current.contribution * (1 - BETRAYAL_PENALTY)
  const newReliability = current.reliability * (1 - BETRAYAL_PENALTY)
  const newInfluence = newContribution * newReliability
  weights.set(playerId, { contribution: newContribution, reliability: newReliability, influence: newInfluence })
  return { weights }
}

// ─── Queries ───────────────────────────────────────────────────────────────

/** Get the normalized weight for a member (0–1 relative to highest in coven). */
export function getNormalizedWeight(state: HierarchyState, playerId: string): number {
  const member = state.weights.get(playerId)
  if (!member) return 0
  let maxInfluence = 0
  for (const w of state.weights.values()) {
    if (w.influence > maxInfluence) maxInfluence = w.influence
  }
  return maxInfluence > 0 ? member.influence / maxInfluence : 0
}

/** Get all member weights as a Map<playerId, normalizedWeight> for use in ritual weighting. */
export function getMemberWeights(state: HierarchyState): Map<string, number> {
  let maxInfluence = 0
  for (const w of state.weights.values()) {
    if (w.influence > maxInfluence) maxInfluence = w.influence
  }
  const result = new Map<string, number>()
  for (const [id, w] of state.weights) {
    result.set(id, maxInfluence > 0 ? w.influence / maxInfluence : 1.0)
  }
  return result
}

/** Rank members by influence, highest first. Returns player IDs. */
export function getRanking(state: HierarchyState): string[] {
  return [...state.weights.entries()]
    .sort((a, b) => b[1].influence - a[1].influence)
    .map(([id]) => id)
}

/** Tick: apply slow decay to prevent infinite accumulation. */
export function tickHierarchy(state: HierarchyState): HierarchyState {
  const weights = new Map<string, MemberWeight>()
  for (const [id, w] of state.weights) {
    const decayed = Math.max(0, w.contribution - CONTRIBUTION_DECAY)
    weights.set(id, { ...w, contribution: decayed, influence: decayed * w.reliability })
  }
  return { weights }
}
