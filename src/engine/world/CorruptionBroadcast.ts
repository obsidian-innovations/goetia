import { haversineDistance } from './ThinPlaces'
import type { ThinPlace, Coord } from './ThinPlaces'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BroadcastState {
  /** Player's current corruption level (0–1) */
  corruptionLevel: number
  /** Position when last broadcasting */
  position: Coord | null
  /** Timestamp of last broadcast tick */
  lastBroadcastAt: number
}

export interface BroadcastEffect {
  /** Thin place ID affected */
  thinPlaceId: string
  /** Veil strength reduction applied */
  veilReduction: number
}

export interface TemporaryThinPlace {
  id: string
  center: Coord
  radiusMeters: number
  createdAt: number
  /** Vessel-created temporary places expire after this duration */
  expiresAt: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Corruption threshold to begin broadcasting. */
const BROADCAST_THRESHOLD = 0.50

/** Veil strength reduction per broadcast tick (per 24h cycle). */
const VEIL_REDUCTION_PER_DAY = 0.05

/** Broadcast radius in meters. */
const BROADCAST_RADIUS_M = 500

/** Vessel-stage temporary thin place radius in meters. */
const VESSEL_PLACE_RADIUS_M = 100

/** Duration of vessel-created temporary thin places (ms). */
const VESSEL_PLACE_DURATION_MS = 30 * 60 * 1000 // 30 minutes

/** Corruption level considered vessel stage. */
const VESSEL_THRESHOLD = 0.80

/** Whisper interval reduction factor at vessel stage. */
const VESSEL_WHISPER_FACTOR = 0.5

/** Whisper interval reduction factor at broadcast (non-vessel) stage. */
const BROADCAST_WHISPER_FACTOR = 0.75

// ─── Factory ───────────────────────────────────────────────────────────────

export function createBroadcastState(corruptionLevel: number, now: number): BroadcastState {
  return {
    corruptionLevel,
    position: null,
    lastBroadcastAt: now,
  }
}

// ─── Core Logic ────────────────────────────────────────────────────────────

/** Check whether the player is broadcasting corruption. */
export function isBroadcasting(state: BroadcastState): boolean {
  return state.corruptionLevel >= BROADCAST_THRESHOLD
}

/** Check whether the player is at vessel stage (stronger broadcast). */
export function isVesselBroadcasting(state: BroadcastState): boolean {
  return state.corruptionLevel >= VESSEL_THRESHOLD
}

/**
 * Calculate veil reduction for visited thin places based on time elapsed.
 * Reduction is 0.05 per 24h, scaled linearly for partial periods.
 */
export function calculateVeilReduction(elapsedMs: number): number {
  const dayFraction = elapsedMs / (24 * 60 * 60 * 1000)
  return VEIL_REDUCTION_PER_DAY * dayFraction
}

/**
 * Apply corruption broadcast to nearby thin places.
 * Returns the affected places with reduced veil strength.
 */
export function broadcastCorruption(
  state: BroadcastState,
  nearbyPlaces: ThinPlace[],
  playerPosition: Coord,
  now: number,
): { effects: BroadcastEffect[]; updatedPlaces: ThinPlace[] } {
  if (!isBroadcasting(state)) return { effects: [], updatedPlaces: nearbyPlaces }

  const elapsed = now - state.lastBroadcastAt
  if (elapsed <= 0) return { effects: [], updatedPlaces: nearbyPlaces }

  const reduction = calculateVeilReduction(elapsed)
  const effects: BroadcastEffect[] = []
  const updatedPlaces = nearbyPlaces.map(tp => {
    // Only affect places within broadcast radius
    const dist = haversineDistance(playerPosition, tp.center)
    if (dist > BROADCAST_RADIUS_M) return tp

    const newVeil = Math.max(0.05, tp.veilStrength - reduction)
    if (newVeil < tp.veilStrength) {
      effects.push({ thinPlaceId: tp.id, veilReduction: tp.veilStrength - newVeil })
    }
    return { ...tp, veilStrength: newVeil }
  })

  return { effects, updatedPlaces }
}

/**
 * Create a temporary thin place at the vessel player's position.
 * Only created if the player is at vessel stage.
 */
export function createVesselThinPlace(
  state: BroadcastState,
  position: Coord,
  now: number,
): TemporaryThinPlace | null {
  if (!isVesselBroadcasting(state)) return null

  return {
    id: `vessel-tp-${now}`,
    center: position,
    radiusMeters: VESSEL_PLACE_RADIUS_M,
    createdAt: now,
    expiresAt: now + VESSEL_PLACE_DURATION_MS,
  }
}

/** Check if a temporary thin place has expired. */
export function isTemporaryPlaceExpired(place: TemporaryThinPlace, now: number): boolean {
  return now >= place.expiresAt
}

/**
 * Get the whisper interval multiplier for nearby players.
 * At vessel stage, whisper intervals are halved.
 */
export function getWhisperIntervalMultiplier(state: BroadcastState): number {
  if (isVesselBroadcasting(state)) return VESSEL_WHISPER_FACTOR
  if (isBroadcasting(state)) return BROADCAST_WHISPER_FACTOR
  return 1.0
}

/** Update broadcast state with new corruption level and position. */
export function updateBroadcast(
  _state: BroadcastState,
  corruptionLevel: number,
  position: Coord | null,
  now: number,
): BroadcastState {
  return {
    corruptionLevel,
    position,
    lastBroadcastAt: now,
  }
}

