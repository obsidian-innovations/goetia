import type { DemonRank } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChargingState {
  sigilId: string
  demonRank: DemonRank
  startedAt: number
  /** 0–1; how far along the charging process the sigil is */
  chargeProgress: number
  lastAttentionAt: number
  attentionCount: number
  /** Progress lost per second when no attention is given */
  decayRate: number
}

// ─── Charge time by rank ───────────────────────────────────────────────────

/** Returns the total charging time in milliseconds for a given demon rank. */
export function getRequiredChargeTime(rank: DemonRank): number {
  switch (rank) {
    case 'Baron':     return 480_000       //  8 minutes
    case 'Knight':
    case 'President': return 720_000       // 12 minutes
    case 'Earl':
    case 'Marquis':   return 1_080_000     // 18 minutes
    case 'Duke':      return 1_500_000     // 25 minutes
    case 'Prince':    return 2_700_000     // 45 minutes
    case 'King':      return 5_400_000     // 90 minutes
  }
}

// ─── Decay configuration ───────────────────────────────────────────────────

/** Inactivity threshold before decay begins (1 minute). */
const DECAY_IDLE_THRESHOLD_MS = 60_000

/** Progress lost per second while decaying (~12%/min). */
const DECAY_RATE_PER_SEC = 0.002

// ─── Factory ───────────────────────────────────────────────────────────────

export function createChargingState(sigilId: string, demonRank: DemonRank): ChargingState {
  const now = Date.now()
  return {
    sigilId,
    demonRank,
    startedAt: now,
    chargeProgress: 0,
    lastAttentionAt: now,
    attentionCount: 0,
    decayRate: DECAY_RATE_PER_SEC,
  }
}

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Advances the charging state by the elapsed time since the last tick.
 * Applies decay if the player hasn't given attention within DECAY_IDLE_THRESHOLD_MS.
 * `chargeMultiplier` (default 1.0) scales effective elapsed time — use >1 inside Thin Places.
 */
export function tick(state: ChargingState, now: number, chargeMultiplier = 1.0): ChargingState {
  const required = getRequiredChargeTime(state.demonRank)
  const elapsed = Math.max(0, now - state.startedAt)
  const idleMs = now - state.lastAttentionAt

  // Natural progress based on effective elapsed time (multiplied by thin place boost)
  const naturalProgress = Math.min(1, (elapsed * Math.max(1, chargeMultiplier)) / required)

  // Decay if idle for more than the threshold
  let decayLoss = 0
  if (idleMs > DECAY_IDLE_THRESHOLD_MS) {
    const decayingForMs = idleMs - DECAY_IDLE_THRESHOLD_MS
    decayLoss = (decayingForMs / 1000) * state.decayRate
  }

  const newProgress = Math.max(0, Math.min(1, naturalProgress - decayLoss))

  return { ...state, chargeProgress: newProgress }
}

/**
 * Records an attention gesture, resetting the decay timer.
 */
export function registerAttention(state: ChargingState, now: number): ChargingState {
  return {
    ...state,
    lastAttentionAt: now,
    attentionCount: state.attentionCount + 1,
  }
}

/** Returns true when the sigil has finished charging. */
export function isFullyCharged(state: ChargingState): boolean {
  return state.chargeProgress >= 1
}

/**
 * Returns how much progress would be lost due to decay at the given timestamp.
 * Returns 0 if within the idle threshold.
 */
export function getDecayAmount(state: ChargingState, now: number): number {
  const idleMs = now - state.lastAttentionAt
  if (idleMs <= DECAY_IDLE_THRESHOLD_MS) return 0
  const decayingForMs = idleMs - DECAY_IDLE_THRESHOLD_MS
  return (decayingForMs / 1000) * state.decayRate
}
