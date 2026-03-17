import type { Demon, NodeId, SealEdge, SealGeometry } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export type FamiliarityTier = 'stranger' | 'acquaintance' | 'familiar' | 'bonded'

export interface FamiliarityState {
  demonId: string
  score: number            // hidden, 0–1
  tier: FamiliarityTier
  interactionCount: number
  lastInteractionAt: number
  simplifiedEdges: Array<{ from: NodeId; to: NodeId }>
}

export type FamiliarityEventType =
  | 'ritual_complete'
  | 'demand_fulfilled'
  | 'demand_ignored'
  | 'charge_complete'
  | 'study'
  | 'hex_cast'

export interface FamiliarityEvent {
  type: FamiliarityEventType
  amount: number
}

export type DemandPersonalization = 'generic' | 'personalized' | 'offers' | 'unrefusable'

// ─── Constants ─────────────────────────────────────────────────────────────

const TIER_THRESHOLDS: Array<{ min: number; tier: FamiliarityTier }> = [
  { min: 0.80, tier: 'bonded' },
  { min: 0.50, tier: 'familiar' },
  { min: 0.25, tier: 'acquaintance' },
  { min: 0.00, tier: 'stranger' },
]

const EVENT_AMOUNTS: Record<FamiliarityEventType, number> = {
  ritual_complete:  +0.05,
  charge_complete:  +0.04,
  demand_fulfilled: +0.03,
  hex_cast:         +0.02,
  study:            +0.01,
  demand_ignored:   -0.02,
}

const DEMAND_PERSONALIZATION: Record<FamiliarityTier, DemandPersonalization> = {
  stranger:     'generic',
  acquaintance: 'personalized',
  familiar:     'offers',
  bonded:       'unrefusable',
}

/** Flavor text shown in the grimoire per tier. */
export const TIER_FLAVOR: Record<FamiliarityTier, string> = {
  stranger:     "A stranger's seal",
  acquaintance: 'It recognizes your hand',
  familiar:     'The demon speaks your name',
  bonded:       'You are bound together',
}

/** Number of edges simplified at bonded tier. */
const BONDED_SIMPLIFY_COUNT = 2

// ─── Factory ───────────────────────────────────────────────────────────────

export function createFamiliarityState(demonId: string, now: number): FamiliarityState {
  return {
    demonId,
    score: 0,
    tier: 'stranger',
    interactionCount: 0,
    lastInteractionAt: now,
    simplifiedEdges: [],
  }
}

// ─── Tier calculation ──────────────────────────────────────────────────────

/** Map a raw familiarity score (0–1) to a tier. */
export function getTier(score: number): FamiliarityTier {
  for (const { min, tier } of TIER_THRESHOLDS) {
    if (score >= min) return tier
  }
  return 'stranger'
}

// ─── Interaction ───────────────────────────────────────────────────────────

/** Get the event definition for a familiarity event type. */
export function getEventAmount(type: FamiliarityEventType): number {
  return EVENT_AMOUNTS[type]
}

/**
 * Record an interaction and update familiarity score/tier.
 * Returns a new FamiliarityState (immutable).
 */
export function addInteraction(
  state: FamiliarityState,
  event: FamiliarityEvent,
  now: number,
): FamiliarityState {
  const newScore = Math.max(0, Math.min(1, state.score + event.amount))
  const newTier = getTier(newScore)
  return {
    ...state,
    score: newScore,
    tier: newTier,
    interactionCount: state.interactionCount + 1,
    lastInteractionAt: now,
  }
}

// ─── Demand personalization ────────────────────────────────────────────────

/** Get the demand personalization style for a given tier. */
export function getDemandPersonalization(tier: FamiliarityTier): DemandPersonalization {
  return DEMAND_PERSONALIZATION[tier]
}

// ─── Seal simplification ──────────────────────────────────────────────────

/**
 * At bonded tier, simplify the demon's seal geometry by reducing control
 * points on the 2 easiest (lowest-weight) edges to straight lines.
 * Returns a new SealGeometry with simplified edges, plus the list of
 * simplified edge keys for persistence.
 */
export function getSimplifiedGeometry(
  state: FamiliarityState,
  demon: Demon,
): { geometry: SealGeometry; simplifiedEdges: Array<{ from: NodeId; to: NodeId }> } {
  const geo = demon.sealGeometry

  if (state.tier !== 'bonded') {
    return { geometry: geo, simplifiedEdges: [] }
  }

  // If already computed, use cached edge keys
  if (state.simplifiedEdges.length > 0) {
    return {
      geometry: applySimplification(geo, state.simplifiedEdges),
      simplifiedEdges: state.simplifiedEdges,
    }
  }

  // Find the N lowest-weight edges to simplify
  const sorted = [...geo.edges].sort((a, b) => a.weight - b.weight)
  const toSimplify = sorted.slice(0, BONDED_SIMPLIFY_COUNT)
  const keys = toSimplify.map(e => ({ from: e.fromNode, to: e.toNode }))

  return {
    geometry: applySimplification(geo, keys),
    simplifiedEdges: keys,
  }
}

function applySimplification(
  geo: SealGeometry,
  simplifiedEdges: Array<{ from: NodeId; to: NodeId }>,
): SealGeometry {
  const simplified = new Set(
    simplifiedEdges.map(e => `${e.from}-${e.to}`),
  )

  const nodeMap = new Map(geo.nodes.map(n => [n.id, n]))

  const edges: SealEdge[] = geo.edges.map(edge => {
    const key = `${edge.fromNode}-${edge.toNode}`
    if (simplified.has(key)) {
      // Reduce to a straight line (2-point canonical path)
      const fromNode = nodeMap.get(edge.fromNode)!
      const toNode = nodeMap.get(edge.toNode)!
      return {
        ...edge,
        canonicalPath: [fromNode.position, toNode.position],
      }
    }
    return edge
  })

  return { nodes: geo.nodes, edges }
}

// ─── Unsolicited offers ────────────────────────────────────────────────────

const OFFER_POOL = [
  'I can show you where {enemy} is weakest.',
  'Let me absorb some of that corruption for you.',
  'There is a seal nearby that resonates with yours.',
  'I will guard this sigil while you rest.',
  'The witching hour approaches — I can amplify your next ritual.',
  'A rival coven stirs. I can shield you.',
]

/**
 * At familiar+ tier, the demon may offer unsolicited help.
 * Returns an offer string or null (roughly 20% chance per call).
 */
export function getUnsolicitedOffer(
  state: FamiliarityState,
  demon: Demon,
): string | null {
  if (state.tier !== 'familiar' && state.tier !== 'bonded') return null

  // Deterministic-ish pseudo-random based on interaction count
  const roll = ((state.interactionCount * 7 + demon.id.length * 13) % 100) / 100
  if (roll > 0.20) return null

  const idx = (state.interactionCount + demon.id.length) % OFFER_POOL.length
  return OFFER_POOL[idx].replace('{enemy}', 'your enemy')
}

// ─── Batch helpers ─────────────────────────────────────────────────────────

/**
 * Process a familiarity event for a demon. Creates state if not yet tracked.
 * Returns the updated state.
 */
export function processInteraction(
  states: Record<string, FamiliarityState>,
  demonId: string,
  eventType: FamiliarityEventType,
  now: number,
): { updatedState: FamiliarityState; allStates: Record<string, FamiliarityState> } {
  const existing = states[demonId] ?? createFamiliarityState(demonId, now)
  const event: FamiliarityEvent = { type: eventType, amount: getEventAmount(eventType) }
  const updatedState = addInteraction(existing, event, now)
  const allStates = { ...states, [demonId]: updatedState }
  return { updatedState, allStates }
}
