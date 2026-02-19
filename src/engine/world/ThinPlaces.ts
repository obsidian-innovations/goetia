// ─── Types ─────────────────────────────────────────────────────────────────

export interface Coord {
  lat: number
  lng: number
}

export type ThinPlaceType = 'fixed' | 'dynamic' | 'player_created'

export interface ThinPlace {
  id: string
  type: ThinPlaceType
  center: Coord
  radiusMeters: number
  /** 0–1: lower = thinner veil = more potent rituals */
  veilStrength: number
  createdAt: number
  /** null for fixed and dynamic; playerId for player_created */
  createdBy: string | null
  /** Accumulated ritual energy (dynamic + player_created places grow stronger) */
  ritualActivity: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000

// ─── Geometry ──────────────────────────────────────────────────────────────

/** Haversine distance in metres between two WGS-84 coordinates. */
export function haversineDistance(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/**
 * Bearing in degrees from `a` to `b`.
 * 0 = north, 90 = east, 180 = south, 270 = west.
 */
export function bearingDeg(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const dLng = toRad(b.lng - a.lng)
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Returns the ThinPlace the player is currently inside, or null.
 * When inside multiple, returns the most potent (lowest veilStrength).
 */
export function isInThinPlace(
  playerPos: Coord,
  thinPlaces: ThinPlace[],
): ThinPlace | null {
  let best: ThinPlace | null = null
  for (const tp of thinPlaces) {
    if (haversineDistance(playerPos, tp.center) <= tp.radiusMeters) {
      if (best === null || tp.veilStrength < best.veilStrength) {
        best = tp
      }
    }
  }
  return best
}

/**
 * Returns ThinPlaces within `radiusMeters` of the player position,
 * sorted nearest-first.
 */
export function getNearbyThinPlaces(
  playerPos: Coord,
  thinPlaces: ThinPlace[],
  radiusMeters: number,
): ThinPlace[] {
  return thinPlaces
    .map(tp => ({ tp, dist: haversineDistance(playerPos, tp.center) }))
    .filter(({ dist }) => dist <= radiusMeters)
    .sort((a, b) => a.dist - b.dist)
    .map(({ tp }) => tp)
}

/**
 * Charge progress multiplier when inside a thin place.
 * Returns 1.0 outside; 1.5–3.0 inside, scaling with potency.
 */
export function getChargeMultiplier(thinPlace: ThinPlace | null): number {
  if (!thinPlace) return 1.0
  // veilStrength 0 → 3.0, veilStrength 1 → 1.5
  return 1.5 + (1 - thinPlace.veilStrength) * 1.5
}

/**
 * Corruption increase multiplier when inside a thin place.
 * Same scaling as the charge multiplier — the veil cuts both ways.
 */
export function getCorruptionMultiplier(thinPlace: ThinPlace | null): number {
  return getChargeMultiplier(thinPlace)
}

/**
 * Adds ritual activity to a thin place, progressively thinning its veil.
 * Every 10 units of activity reduces veilStrength by 0.01 (minimum 0.05).
 */
export function addRitualActivity(
  thinPlace: ThinPlace,
  intensity: number,
): ThinPlace {
  const newActivity = thinPlace.ritualActivity + intensity
  // Reduction based on total activity level
  const reductionSteps = Math.floor(newActivity / 10)
  const baseVeil = thinPlace.type === 'fixed' ? 0.2 : 0.6  // fixed places start potent
  const reduced = baseVeil - reductionSteps * 0.01
  const newVeil = Math.max(0.05, Math.min(thinPlace.veilStrength, reduced))
  return { ...thinPlace, ritualActivity: newActivity, veilStrength: newVeil }
}

/** Returns a compass direction label (N / NE / E / SE / S / SW / W / NW). */
export function compassLabel(bearingDegrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(bearingDegrees / 45) % 8]
}
