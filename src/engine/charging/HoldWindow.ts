import type { Sigil } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HoldWindowState {
  /** Timestamp when the sigil became fully charged */
  chargedAt: number
  /** How long the sigil remains stable after being fully charged (ms) */
  windowDurationMs: number
  /** Rate at which destabilisation increases once the window closes (0–1 per ms) */
  destabilisationRate: number
}

// ─── Duration by integrity ──────────────────────────────────────────────────

/**
 * Returns the hold window duration in milliseconds based on sigil integrity:
 * - integrity < 0.5  → 2 hours
 * - integrity 0.5–0.8 → 3 hours
 * - integrity > 0.8  → 4 hours
 */
export function getHoldWindowDuration(sigil: Sigil): number {
  if (sigil.overallIntegrity > 0.8) return 4 * 60 * 60 * 1000  // 4 hours
  if (sigil.overallIntegrity >= 0.5) return 3 * 60 * 60 * 1000 // 3 hours
  return 2 * 60 * 60 * 1000                                     // 2 hours
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createHoldWindowState(sigil: Sigil, chargedAt: number): HoldWindowState {
  const windowDurationMs = getHoldWindowDuration(sigil)
  // Full collapse 1 hour after window ends → rate = 1 / (60 * 60 * 1000)
  const destabilisationRate = 1 / (60 * 60 * 1000)
  return { chargedAt, windowDurationMs, destabilisationRate }
}

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Returns the destabilisation level (0–1) at the given timestamp.
 * - 0 while within the hold window
 * - Increases linearly once the window expires
 * - Reaches 1.0 approximately 1 hour after window ends (full collapse)
 */
export function getDestabilisation(state: HoldWindowState, now: number): number {
  const windowEnd = state.chargedAt + state.windowDurationMs
  if (now <= windowEnd) return 0
  const overtime = now - windowEnd
  return Math.min(1, overtime * state.destabilisationRate)
}

/**
 * Returns true when the sigil has fully destabilised (collapsed).
 */
export function isCollapsed(state: HoldWindowState, now: number): boolean {
  return getDestabilisation(state, now) >= 1
}
