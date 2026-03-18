import type { Sigil } from '@engine/sigil/Types'
import { computeVisualState } from '@engine/sigil/SigilComposer'
import type { CovenState } from './CovenEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RitualContribution {
  playerId: string
  /** Which layer this player drew: seal, glyphs, or ring */
  layer: 'seal' | 'glyphs' | 'ring'
  /** 0–1 quality of this player's contribution */
  quality: number
}

export interface BetrayalShatter {
  betrayerId: string
  /** Corruption each participant receives (equal to the betrayer's solo cost) */
  corruptionPerPlayer: number
  shatteredAt: number
}

export type CollectiveRitualPhase = 'gathering' | 'drawing' | 'complete' | 'shattered'

export interface CollectiveRitualState {
  id: string
  covenId: string
  demonId: string
  phase: CollectiveRitualPhase
  contributions: RitualContribution[]
  /** The composed coven sigil, set on completion */
  result: Sigil | null
  betrayal: BetrayalShatter | null
  startedAt: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Base corruption cost for a collective ritual (split among participants) */
const BASE_CORRUPTION_COST = 0.15

/** All three layers required for a complete collective ritual */
const ALL_LAYERS: RitualContribution['layer'][] = ['seal', 'glyphs', 'ring']

// ─── Factory ───────────────────────────────────────────────────────────────

/** Create a new collective ritual for a coven. */
export function createCollectiveRitual(
  covenId: string,
  demonId: string,
  now: number,
): CollectiveRitualState {
  return {
    id: `crit-${covenId}-${now}`,
    covenId,
    demonId,
    phase: 'gathering',
    contributions: [],
    result: null,
    betrayal: null,
    startedAt: now,
  }
}

// ─── Contribution ──────────────────────────────────────────────────────────

/** Add a player's contribution to a specific layer. Transitions to 'drawing' on first contribution. */
export function addContribution(
  state: CollectiveRitualState,
  contribution: RitualContribution,
): CollectiveRitualState {
  if (state.phase === 'complete' || state.phase === 'shattered') return state

  // One contribution per layer
  if (state.contributions.some(c => c.layer === contribution.layer)) return state

  const contributions = [...state.contributions, contribution]
  const phase = state.phase === 'gathering' ? 'drawing' : state.phase
  return { ...state, contributions, phase }
}

// ─── Integrity ─────────────────────────────────────────────────────────────

/**
 * Calculate the average integrity from all contributions.
 * Returns 0 if no contributions exist.
 */
export function getAverageIntegrity(state: CollectiveRitualState): number {
  if (state.contributions.length === 0) return 0
  const sum = state.contributions.reduce((acc, c) => acc + c.quality, 0)
  return sum / state.contributions.length
}

/**
 * Calculate corruption cost per participant.
 * Corruption is split equally among contributors.
 */
export function getCorruptionPerPlayer(state: CollectiveRitualState): number {
  const count = state.contributions.length
  if (count === 0) return 0
  return BASE_CORRUPTION_COST / count
}

// ─── Completion ────────────────────────────────────────────────────────────

/** Check whether all three layers have been contributed. */
export function isRitualComplete(state: CollectiveRitualState): boolean {
  return ALL_LAYERS.every(layer =>
    state.contributions.some(c => c.layer === layer),
  )
}

/**
 * Complete the collective ritual, producing a coven sigil.
 * The sigil's overallIntegrity is the average of all contributions.
 * Returns unchanged state if not all layers are present.
 */
export function completeRitual(
  state: CollectiveRitualState,
  now: number,
): CollectiveRitualState {
  if (!isRitualComplete(state)) return state
  if (state.phase === 'complete' || state.phase === 'shattered') return state

  const integrity = getAverageIntegrity(state)

  const sigil: Sigil = {
    id: `coven-sigil-${state.id}`,
    demonId: state.demonId,
    sealIntegrity: state.contributions.find(c => c.layer === 'seal')?.quality ?? 0,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 1, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: integrity,
    visualState: computeVisualState(integrity),
    status: 'complete',
    createdAt: now,
    statusChangedAt: now,
  }

  return { ...state, phase: 'complete', result: sigil }
}

// ─── Betrayal ──────────────────────────────────────────────────────────────

/**
 * Shatter the ritual due to betrayal.
 * All participants receive corruption equal to the full solo cost (not split).
 * The sigil is destroyed.
 */
export function betrayRitual(
  state: CollectiveRitualState,
  betrayerId: string,
  covenState: CovenState,
  now: number,
): { ritualState: CollectiveRitualState; covenState: CovenState } {
  if (state.phase === 'shattered') return { ritualState: state, covenState }

  const shatter: BetrayalShatter = {
    betrayerId,
    corruptionPerPlayer: BASE_CORRUPTION_COST,
    shatteredAt: now,
  }

  // Record betrayal for each other contributor
  let updatedCoven = covenState
  for (const contribution of state.contributions) {
    if (contribution.playerId !== betrayerId) {
      updatedCoven = {
        ...updatedCoven,
        betrayals: [
          ...updatedCoven.betrayals,
          {
            betrayerId,
            sigilId: state.id,
            targetPlayerId: contribution.playerId,
            exposedAt: now,
          },
        ],
      }
    }
  }

  return {
    ritualState: { ...state, phase: 'shattered', betrayal: shatter, result: null },
    covenState: updatedCoven,
  }
}

/**
 * Apply inner circle weights to contribution quality.
 * Higher-weighted members' contributions count more toward final integrity.
 */
export function getWeightedIntegrity(
  state: CollectiveRitualState,
  memberWeights: Map<string, number>,
): number {
  if (state.contributions.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const c of state.contributions) {
    const w = memberWeights.get(c.playerId) ?? 1.0
    weightedSum += c.quality * w
    totalWeight += w
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}
