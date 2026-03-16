import type { Sigil, SigilVisualState } from './Types'
import type { TemporalModifiers } from '@engine/temporal/TemporalEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DecayState {
  sigilId: string
  lastDecayCheck: number
  rebindCount: number       // >= 3 = "ancient"
  totalDecayed: number      // cumulative integrity lost
}

export interface DecayResult {
  newIntegrity: number
  decayed: number           // amount lost this tick
  needsRebinding: boolean   // integrity < 0.30
  isAncient: boolean        // rebindCount >= 3
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000

/** Base decay rate: 0.01 integrity per real day. */
const BASE_DECAY_PER_DAY = 0.01

/** Corruption scar amplification factor. */
const SCAR_DECAY_MULTIPLIER = 1.5

/** Integrity threshold below which rebinding is needed. */
const REBIND_THRESHOLD = 0.30

/** Number of rebindings required for "ancient" status. */
const ANCIENT_REBIND_COUNT = 3

/** Statuses that are subject to decay. */
const DECAYABLE_STATUSES = new Set(['charged', 'awakened'])

// ─── Factory ───────────────────────────────────────────────────────────────

export function createDecayState(sigilId: string, now: number): DecayState {
  return {
    sigilId,
    lastDecayCheck: now,
    rebindCount: 0,
    totalDecayed: 0,
  }
}

// ─── Core decay logic ──────────────────────────────────────────────────────

/**
 * Calculate decay for a sigil since its last check.
 *
 * Decay only applies to "charged" or "awakened" sigils.
 * Rate: 0.01/day base, doubled during witching hour, 1.5x with corruption scars.
 * Returns null if the sigil is not in a decayable status.
 */
export function calculateDecay(
  sigil: Sigil,
  decayState: DecayState,
  now: number,
  temporalModifiers?: TemporalModifiers,
  hasCorruptionScar?: boolean,
): DecayResult | null {
  if (!DECAYABLE_STATUSES.has(sigil.status)) return null

  const elapsed = now - decayState.lastDecayCheck
  if (elapsed <= 0) return null

  const days = elapsed / MS_PER_DAY

  // Base decay rate, scaled by temporal and corruption effects
  let ratePerDay = BASE_DECAY_PER_DAY

  // Witching hour doubles decay
  if (temporalModifiers?.isWitchingHour) {
    ratePerDay *= 2.0
  }

  // Corruption scars amplify decay
  if (hasCorruptionScar) {
    ratePerDay *= SCAR_DECAY_MULTIPLIER
  }

  // Ancient sigils decay at half rate
  const ancient = decayState.rebindCount >= ANCIENT_REBIND_COUNT
  if (ancient) {
    ratePerDay *= 0.5
  }

  const decayed = Math.min(ratePerDay * days, sigil.overallIntegrity)
  const newIntegrity = Math.max(0, sigil.overallIntegrity - decayed)

  return {
    newIntegrity,
    decayed,
    needsRebinding: newIntegrity < REBIND_THRESHOLD,
    isAncient: ancient,
  }
}

// ─── Apply decay ───────────────────────────────────────────────────────────

/** Returns a new Sigil with reduced integrity and updated visual state. */
export function applyDecay(sigil: Sigil, result: DecayResult): Sigil {
  const visualState = getDecayedVisualState(result.newIntegrity, result.isAncient)
  return {
    ...sigil,
    overallIntegrity: result.newIntegrity,
    visualState,
    rebindCount: sigil.rebindCount,
    isAncient: result.isAncient,
  }
}

function getDecayedVisualState(integrity: number, isAncient: boolean): SigilVisualState {
  if (isAncient) return 'healthy' // ancient sigils always show as healthy
  if (integrity >= 0.85) return 'charged'
  if (integrity >= 0.60) return 'healthy'
  if (integrity >= 0.30) return 'unstable'
  return 'corrupted'
}

// ─── Rebinding ─────────────────────────────────────────────────────────────

/** Record a rebinding, incrementing the count. Returns updated DecayState. */
export function recordRebind(decayState: DecayState, now: number): DecayState {
  return {
    ...decayState,
    rebindCount: decayState.rebindCount + 1,
    lastDecayCheck: now,
  }
}

/** Check if a sigil qualifies as ancient (3+ rebindings). */
export function isAncient(decayState: DecayState): boolean {
  return decayState.rebindCount >= ANCIENT_REBIND_COUNT
}

// ─── Batch processing ──────────────────────────────────────────────────────

/**
 * Process decay for all eligible sigils. Returns updated sigils and decay states.
 * Designed to be called periodically (e.g. every 60 seconds in the tick loop).
 */
export function processDecayBatch(
  sigils: Sigil[],
  decayStates: Record<string, DecayState>,
  now: number,
  temporalModifiers?: TemporalModifiers,
  scarredSigilIds?: Set<string>,
): { updatedSigils: Sigil[]; updatedDecayStates: Record<string, DecayState> } {
  const updatedSigils: Sigil[] = []
  const updatedDecayStates = { ...decayStates }

  for (const sigil of sigils) {
    if (!DECAYABLE_STATUSES.has(sigil.status)) continue

    // Ensure decay state exists
    if (!updatedDecayStates[sigil.id]) {
      updatedDecayStates[sigil.id] = createDecayState(sigil.id, now)
      continue // Skip decay on first encounter — start tracking from now
    }

    const state = updatedDecayStates[sigil.id]
    const hasScar = scarredSigilIds?.has(sigil.id) ?? false
    const result = calculateDecay(sigil, state, now, temporalModifiers, hasScar)

    if (result && result.decayed > 0) {
      updatedSigils.push(applyDecay(sigil, result))
      updatedDecayStates[sigil.id] = {
        ...state,
        lastDecayCheck: now,
        totalDecayed: state.totalDecayed + result.decayed,
      }
    } else {
      // Update check time even if no meaningful decay
      updatedDecayStates[sigil.id] = { ...state, lastDecayCheck: now }
    }
  }

  return { updatedSigils, updatedDecayStates }
}
