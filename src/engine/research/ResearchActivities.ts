import type { Sigil } from '@engine/sigil/Types'

// ─── XP constants ──────────────────────────────────────────────────────────

/** Max XP from completing a ritual (scales with integrity). */
const RITUAL_MAX_XP = 0.15

/** XP from studying a saved sigil. */
const STUDY_XP = 0.02

/** XP from discovering a lore fragment. */
const FRAGMENT_XP = 0.05

/** XP from trading knowledge with another player (future Phase 5 tie-in). */
const TRADE_BASE_XP = 0.03

// ─── Activity functions ────────────────────────────────────────────────────

/**
 * Returns research XP earned by completing a ritual.
 * Higher integrity → more XP, proportional to overall quality.
 */
export function completedRitual(integrity: number): number {
  return Math.max(0, Math.min(RITUAL_MAX_XP, integrity * RITUAL_MAX_XP))
}

/**
 * Returns research XP earned by studying a saved sigil.
 * Small fixed amount — capped by caller's cooldown logic.
 */
export function studiedSigil(_sigil: Sigil): number {
  return STUDY_XP
}

/**
 * Returns research XP earned by discovering a lore fragment.
 * `fragmentId` is kept for future use (different fragments could award different XP).
 */
export function discoveredFragment(_fragmentId: string): number {
  return FRAGMENT_XP
}

/**
 * Returns research XP earned by trading knowledge with another player.
 * The more advanced the other player's research, the more can be learned.
 * Phase 5 tie-in — for now returns a fixed bonus.
 */
export function tradedKnowledge(otherPlayerProgress: number): number {
  // Diminishing returns: learn more from someone who knows more
  return TRADE_BASE_XP * Math.max(0, otherPlayerProgress)
}
