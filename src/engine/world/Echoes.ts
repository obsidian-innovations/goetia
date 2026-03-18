// ─── Types ─────────────────────────────────────────────────────────────────

export interface Echo {
  /** Whisper text fragment left by a previous ritual */
  text: string
  /** Demon that generated this echo */
  demonId: string
  /** 0–1: how strongly the echo resonates (fades with time, grows with overlapping echoes) */
  intensity: number
  /** When the echo was embedded */
  createdAt: number
  /** Player who created the echo (anonymous to observers) */
  createdBy: string
}

export interface WhisperingWallState {
  /** Map from thin place ID to its embedded echoes */
  echoes: Map<string, Echo[]>
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Maximum echoes stored per thin place. */
const MAX_ECHOES_PER_PLACE = 50

/** Base intensity for a new echo. */
const BASE_ECHO_INTENSITY = 0.8

/** Intensity boost when echoes from the same demon overlap. */
const RESONANCE_BOOST = 0.1

/** Encounter chance increase per echo at a thin place. */
const ECHO_ENCOUNTER_BONUS = 0.02

/** Maximum encounter bonus from echoes. */
const MAX_ECHO_ENCOUNTER_BONUS = 0.30

// ─── Factory ───────────────────────────────────────────────────────────────

export function createWhisperingWall(): WhisperingWallState {
  return { echoes: new Map() }
}

// ─── Core Logic ────────────────────────────────────────────────────────────

/**
 * Embed a whisper echo at a thin place. Echoes are permanent.
 * If the same demon already has echoes at this location, existing echoes
 * receive a resonance boost.
 */
export function embedEcho(
  state: WhisperingWallState,
  thinPlaceId: string,
  text: string,
  demonId: string,
  playerId: string,
  now: number,
): WhisperingWallState {
  const echoes = new Map(state.echoes)
  const existing = echoes.get(thinPlaceId) ?? []

  // Boost existing echoes from the same demon
  const boosted = existing.map(e =>
    e.demonId === demonId
      ? { ...e, intensity: Math.min(1.0, e.intensity + RESONANCE_BOOST) }
      : e,
  )

  const newEcho: Echo = {
    text,
    demonId,
    intensity: BASE_ECHO_INTENSITY,
    createdAt: now,
    createdBy: playerId,
  }

  // Cap at max echoes (drop oldest when full)
  const updated = [...boosted, newEcho]
  echoes.set(thinPlaceId, updated.length > MAX_ECHOES_PER_PLACE
    ? updated.slice(updated.length - MAX_ECHOES_PER_PLACE)
    : updated)

  return { echoes }
}

/**
 * Get all echoes at a thin place.
 * Returns empty array if no echoes exist.
 */
export function getEchoes(
  state: WhisperingWallState,
  thinPlaceId: string,
): Echo[] {
  return state.echoes.get(thinPlaceId) ?? []
}

/**
 * Get the resonance modifier for a thin place.
 * More echoes = higher encounter chance (capped).
 */
export function getResonanceModifier(
  state: WhisperingWallState,
  thinPlaceId: string,
): number {
  const echoes = state.echoes.get(thinPlaceId) ?? []
  const totalIntensity = echoes.reduce((sum, e) => sum + e.intensity, 0)
  return Math.min(MAX_ECHO_ENCOUNTER_BONUS, totalIntensity * ECHO_ENCOUNTER_BONUS)
}

/**
 * Get unique demon IDs that have echoes at a thin place.
 * Useful for players encountering fragments of unknown demons.
 */
export function getEchoDemonIds(
  state: WhisperingWallState,
  thinPlaceId: string,
): string[] {
  const echoes = state.echoes.get(thinPlaceId) ?? []
  return [...new Set(echoes.map(e => e.demonId))]
}

/**
 * Count total echoes across all thin places.
 */
export function getTotalEchoCount(state: WhisperingWallState): number {
  let count = 0
  for (const echoes of state.echoes.values()) {
    count += echoes.length
  }
  return count
}
