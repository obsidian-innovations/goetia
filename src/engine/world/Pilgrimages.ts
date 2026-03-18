import { haversineDistance, bearingDeg, compassLabel, type Coord } from './ThinPlaces'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CompassDirection {
  /** Bearing in degrees (0–360) derived from demon's Ars Goetia position */
  bearing: number
  /** Human-readable compass label (N, NE, E, etc.) */
  label: string
}

export interface PilgrimageProgress {
  /** Demon this pilgrimage is for */
  demonId: string
  /** Starting position when pilgrimage began */
  startPosition: Coord
  /** Current furthest position in the correct direction */
  furthestPosition: Coord | null
  /** Distance traveled in the correct direction (metres) */
  distanceTraveled: number
  /** Whether the 1km threshold has been reached */
  completed: boolean
  /** Timestamp when pilgrimage bonus expires */
  bonusExpiresAt: number | null
  /** Cardinal directions completed (N, E, S, W) for the four-direction challenge */
  completedCardinals: Set<string>
}

export interface PilgrimageState {
  /** Active pilgrimages keyed by demon ID */
  pilgrimages: Map<string, PilgrimageProgress>
  /** Position history for compass line rendering (last N positions) */
  positionHistory: Coord[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Minimum distance (metres) to qualify as a pilgrimage. */
const PILGRIMAGE_THRESHOLD_M = 1000

/** Duration of research bonus after completing a pilgrimage (ms). */
const BONUS_DURATION_MS = 60 * 60 * 1000 // 1 hour

/** Research progress multiplier during pilgrimage bonus. */
export const PILGRIMAGE_RESEARCH_MULTIPLIER = 3

/** Maximum bearing deviation (degrees) to count as traveling in the right direction. */
const MAX_BEARING_DEVIATION = 45

/** Maximum positions kept in history for compass rendering. */
const MAX_HISTORY_LENGTH = 100

// ─── Factory ───────────────────────────────────────────────────────────────

export function createPilgrimageState(): PilgrimageState {
  return {
    pilgrimages: new Map(),
    positionHistory: [],
  }
}

// ─── Demon Direction ───────────────────────────────────────────────────────

/**
 * Derive a demon's compass direction from its position in the Ars Goetia.
 * Uses the demon's index (1–72) mapped to 360 degrees.
 */
export function getDemonDirection(demonIndex: number): CompassDirection {
  // Map 1–72 to 0–360 degrees
  const bearing = ((demonIndex - 1) / 72) * 360
  return { bearing, label: compassLabel(bearing) }
}

// ─── Pilgrimage Tracking ───────────────────────────────────────────────────

/**
 * Start tracking a pilgrimage for a demon.
 * No-op if already tracking.
 */
export function startPilgrimage(
  state: PilgrimageState,
  demonId: string,
  currentPosition: Coord,
): PilgrimageState {
  if (state.pilgrimages.has(demonId)) return state

  const pilgrimages = new Map(state.pilgrimages)
  pilgrimages.set(demonId, {
    demonId,
    startPosition: currentPosition,
    furthestPosition: null,
    distanceTraveled: 0,
    completed: false,
    bonusExpiresAt: null,
    completedCardinals: new Set(),
  })
  return { ...state, pilgrimages }
}

/**
 * Update pilgrimage progress based on new player position.
 * Checks whether the player is moving in the demon's direction.
 */
export function updatePilgrimage(
  state: PilgrimageState,
  demonId: string,
  demonDirection: CompassDirection,
  currentPosition: Coord,
  now: number,
): PilgrimageState {
  const progress = state.pilgrimages.get(demonId)
  if (!progress || progress.completed) return state

  // Calculate bearing from start to current position
  const travelBearing = bearingDeg(progress.startPosition, currentPosition)
  const deviation = angleDifference(travelBearing, demonDirection.bearing)

  // Only count if traveling roughly in the right direction
  if (deviation > MAX_BEARING_DEVIATION) return state

  const distance = haversineDistance(progress.startPosition, currentPosition)

  // Only update if this is further than previous best
  if (distance <= progress.distanceTraveled) return state

  const completed = distance >= PILGRIMAGE_THRESHOLD_M
  const cardinal = compassLabel(travelBearing)

  const updatedProgress: PilgrimageProgress = {
    ...progress,
    furthestPosition: currentPosition,
    distanceTraveled: distance,
    completed,
    bonusExpiresAt: completed ? now + BONUS_DURATION_MS : null,
    completedCardinals: completed
      ? new Set([...progress.completedCardinals, cardinal])
      : progress.completedCardinals,
  }

  const pilgrimages = new Map(state.pilgrimages)
  pilgrimages.set(demonId, updatedProgress)

  // Update position history
  const positionHistory = [...state.positionHistory, currentPosition]
    .slice(-MAX_HISTORY_LENGTH)

  return { pilgrimages, positionHistory }
}

/**
 * Check if the research bonus is active for a demon's pilgrimage.
 */
export function isPilgrimageBonusActive(
  state: PilgrimageState,
  demonId: string,
  now: number,
): boolean {
  const progress = state.pilgrimages.get(demonId)
  if (!progress?.bonusExpiresAt) return false
  return now < progress.bonusExpiresAt
}

/**
 * Get the research multiplier for a demon (1x normally, 3x during pilgrimage bonus).
 */
export function getResearchMultiplier(
  state: PilgrimageState,
  demonId: string,
  now: number,
): number {
  return isPilgrimageBonusActive(state, demonId, now)
    ? PILGRIMAGE_RESEARCH_MULTIPLIER
    : 1
}

/**
 * Check if all four cardinal directions have been completed for a demon.
 * Unlocks the hidden fifth lore fragment.
 */
export function hasCompletedAllCardinals(
  state: PilgrimageState,
  demonId: string,
): boolean {
  const progress = state.pilgrimages.get(demonId)
  if (!progress) return false
  const cardinals = ['N', 'E', 'S', 'W']
  return cardinals.every(c => progress.completedCardinals.has(c))
}

/**
 * Reset a completed pilgrimage so the player can start a new direction.
 */
export function resetPilgrimage(
  state: PilgrimageState,
  demonId: string,
  currentPosition: Coord,
): PilgrimageState {
  const progress = state.pilgrimages.get(demonId)
  if (!progress) return state

  const pilgrimages = new Map(state.pilgrimages)
  pilgrimages.set(demonId, {
    ...progress,
    startPosition: currentPosition,
    furthestPosition: null,
    distanceTraveled: 0,
    completed: false,
    bonusExpiresAt: progress.bonusExpiresAt, // preserve existing bonus
  })
  return { ...state, pilgrimages }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Compute the smallest angle difference between two bearings (0–180). */
function angleDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}
