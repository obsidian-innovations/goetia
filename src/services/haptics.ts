// ─── Haptic pattern identifiers ───────────────────────────────────────────────

export type HapticPattern =
  | 'nodeConnect'
  | 'glyphRecognized'
  | 'glyphFailed'
  | 'ringComplete'
  | 'sigilSettle'
  | 'misfire'

// ─── Vibration patterns (millisecond sequences: vibrate, pause, vibrate, …) ──

const PATTERNS: Record<HapticPattern, number[]> = {
  /** Short double-tap — snap confirmation when a seal node is connected */
  nodeConnect:     [10, 15, 10],
  /** Two medium pulses — glyph successfully recognised */
  glyphRecognized: [30, 15, 40],
  /** Single weak tap — glyph not recognised */
  glyphFailed:     [5],
  /** Three-part crescendo — binding ring closed */
  ringComplete:    [30, 20, 50, 20, 80],
  /** Two heavy pulses — sigil composed and settled */
  sigilSettle:     [80, 40, 120],
  /** Three brief taps — action failed or ignored */
  misfire:         [5, 25, 5, 25, 5],
}

// ─── haptic() ────────────────────────────────────────────────────────────────

/**
 * Fires a haptic feedback pattern using the Web Vibration API.
 * Silently no-ops on devices / browsers that don't support vibration.
 */
export function haptic(pattern: HapticPattern): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(PATTERNS[pattern])
  }
}
