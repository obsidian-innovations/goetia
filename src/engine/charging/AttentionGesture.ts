import type { StrokeResult, RingResult } from '@engine/sigil/Types'
import type { ChargingState } from './ChargingEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export type AttentionGestureType = 'trace_ring' | 'hold_seal' | 'tap_glyph'

export interface AttentionGesture {
  type: AttentionGestureType
  /** Whether this gesture must be performed in the current cycle */
  required: boolean
  /** Human-readable description for UI display */
  description: string
  /** Milliseconds before this gesture can be used again */
  cooldownMs: number
}

// ─── Gesture definitions ───────────────────────────────────────────────────

const GESTURE_DEFS: Record<AttentionGestureType, Omit<AttentionGesture, 'required'>> = {
  trace_ring: {
    type: 'trace_ring',
    description: 'Trace a circle around the sigil to maintain focus',
    cooldownMs: 30_000,
  },
  hold_seal: {
    type: 'hold_seal',
    description: 'Touch and hold the centre of the seal for 2 seconds',
    cooldownMs: 45_000,
  },
  tap_glyph: {
    type: 'tap_glyph',
    description: 'Tap each glyph once in sequence',
    cooldownMs: 20_000,
  },
}

/** Ordered cycle of gestures used for scheduling */
const GESTURE_CYCLE: AttentionGestureType[] = ['trace_ring', 'hold_seal', 'tap_glyph']

// ─── Attention interval by rank (ms between required gestures) ─────────────

function getAttentionIntervalMs(state: ChargingState): number {
  switch (state.demonRank) {
    case 'Baron':     return 90_000   // 90s — least frequent
    case 'Knight':
    case 'President': return 75_000   // 75s
    case 'Earl':
    case 'Marquis':   return 60_000   // 60s
    case 'Duke':      return 45_000   // 45s
    case 'Prince':    return 35_000   // 35s
    case 'King':      return 30_000   // 30s — most frequent
  }
}

// ─── Core functions ────────────────────────────────────────────────────────

/**
 * Selects the next attention gesture the player should perform.
 * Cycles through trace_ring → hold_seal → tap_glyph based on attention count.
 * Required flag is set when the player is overdue for attention.
 */
export function getNextGesture(
  chargingState: ChargingState,
  _demonId: string,
): AttentionGesture {
  const idx = chargingState.attentionCount % GESTURE_CYCLE.length
  const type = GESTURE_CYCLE[idx]
  const def = GESTURE_DEFS[type]

  const now = Date.now()
  const intervalMs = getAttentionIntervalMs(chargingState)
  const overdue = now - chargingState.lastAttentionAt > intervalMs

  return {
    ...def,
    required: overdue,
  }
}

/**
 * Validates whether a player's stroke satisfies the given gesture type.
 *
 * - trace_ring: checks that a RingResult with overallStrength ≥ 0.4 was provided
 * - hold_seal: checks that the stroke duration was ≥ 1500ms (held for a moment)
 * - tap_glyph: checks that the stroke is a short, low-velocity tap (length < 20px equivalent, duration < 300ms)
 */
export function validateGesture(
  type: AttentionGestureType,
  stroke: StrokeResult,
  context: { ringResult?: RingResult } = {},
): boolean {
  switch (type) {
    case 'trace_ring': {
      const ring = context.ringResult
      return ring != null && ring.overallStrength >= 0.4
    }
    case 'hold_seal': {
      // A hold gesture: stroke must be very short (no movement) and held for ≥ 1.5s
      return stroke.duration >= 1500 && stroke.totalLength < 0.05
    }
    case 'tap_glyph': {
      // A quick tap: short duration and minimal movement
      return stroke.duration < 300 && stroke.totalLength < 0.05
    }
  }
}
