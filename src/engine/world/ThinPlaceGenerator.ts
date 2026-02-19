import type { ThinPlace, Coord } from './ThinPlaces'

// ─── Types ─────────────────────────────────────────────────────────────────

/** Geographic cell key: `"latCenti:lngCenti"` at 0.01° precision (~1.1km grid). */
type CellKey = string

export interface RitualCell {
  key: CellKey
  center: Coord
  /** Total ritual activity accumulated in this cell */
  totalActivity: number
  /** Timestamps of individual rituals, for density tracking */
  ritualTimestamps: number[]
  /** Demon IDs used in this cell */
  demonIds: Set<string>
  /** Player-created thin place candidate: days with any activity */
  activeDays: Set<string>
}

export interface GeneratorState {
  cells: Map<CellKey, RitualCell>
  dynamicPlaces: ThinPlace[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Activity threshold to spawn a dynamic thin place */
const SPAWN_THRESHOLD = 5

/** Half-life in ms (48h) for dynamic place decay */
const HALF_LIFE_MS = 48 * 60 * 60 * 1000

/** Minimum days + demon diversity to qualify for player_created promotion */
const PLAYER_CREATED_MIN_DAYS = 7
const PLAYER_CREATED_MIN_DEMON_TYPES = 3

// ─── Cell helpers ───────────────────────────────────────────────────────────

/** Encode a coordinate into a cell key at 0.01° precision. */
export function cellKey(coord: Coord): CellKey {
  const latCell = Math.round(coord.lat * 100)
  const lngCell = Math.round(coord.lng * 100)
  return `${latCell}:${lngCell}`
}

/** Return the centre of the cell containing `coord`. */
export function cellCenter(coord: Coord): Coord {
  return {
    lat: Math.round(coord.lat * 100) / 100,
    lng: Math.round(coord.lng * 100) / 100,
  }
}

/** Return a day string (YYYY-MM-DD) from a timestamp for dedup. */
function dayString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

// ─── State factory ──────────────────────────────────────────────────────────

export function createGeneratorState(): GeneratorState {
  return { cells: new Map(), dynamicPlaces: [] }
}

// ─── Activity recording ─────────────────────────────────────────────────────

/**
 * Records a completed ritual in the cell containing `position`.
 * `intensity` is the ritual's overallIntegrity (0–1).
 * Returns the updated state (never mutates).
 */
export function addActivityToCell(
  state: GeneratorState,
  position: Coord,
  intensity: number,
  demonId: string,
  now: number,
): GeneratorState {
  const key = cellKey(position)
  const existing = state.cells.get(key)

  const center = cellCenter(position)
  const day = dayString(now)

  const updatedCell: RitualCell = {
    key,
    center,
    totalActivity: (existing?.totalActivity ?? 0) + intensity,
    ritualTimestamps: [...(existing?.ritualTimestamps ?? []), now],
    demonIds: new Set([...(existing?.demonIds ?? []), demonId]),
    activeDays: new Set([...(existing?.activeDays ?? []), day]),
  }

  const newCells = new Map(state.cells)
  newCells.set(key, updatedCell)

  return { ...state, cells: newCells }
}

// ─── Spawning ───────────────────────────────────────────────────────────────

/**
 * Check all cells and spawn/promote dynamic thin places where warranted.
 * Returns updated state with new or promoted places.
 */
export function spawnDynamicPlaces(
  state: GeneratorState,
  now: number,
): GeneratorState {
  let newDynamicPlaces = [...state.dynamicPlaces]

  for (const cell of state.cells.values()) {
    if (cell.totalActivity < SPAWN_THRESHOLD) continue

    // Check if a dynamic place already exists for this cell
    const existing = newDynamicPlaces.find(
      p => cellKey(p.center) === cell.key && p.type !== 'fixed',
    )

    if (!existing) {
      // Spawn new dynamic thin place
      const newPlace: ThinPlace = {
        id: `dynamic-${cell.key}-${now}`,
        type: 'dynamic',
        center: cell.center,
        radiusMeters: 100 + Math.min(200, cell.totalActivity * 20),
        veilStrength: Math.max(0.30, 0.80 - cell.totalActivity * 0.05),
        createdAt: now,
        createdBy: null,
        ritualActivity: cell.totalActivity,
      }
      newDynamicPlaces = [...newDynamicPlaces, newPlace]
    } else if (
      existing.type === 'dynamic' &&
      cell.activeDays.size >= PLAYER_CREATED_MIN_DAYS &&
      cell.demonIds.size >= PLAYER_CREATED_MIN_DEMON_TYPES
    ) {
      // Promote to player_created
      newDynamicPlaces = newDynamicPlaces.map(p =>
        p.id === existing.id ? { ...p, type: 'player_created' as const } : p,
      )
    }
  }

  return { ...state, dynamicPlaces: newDynamicPlaces }
}

// ─── Decay ──────────────────────────────────────────────────────────────────

/**
 * Apply exponential decay to dynamic thin places.
 * Places that decay to veilStrength ≥ 0.95 are removed (effectively gone).
 */
export function decayDynamicPlaces(
  state: GeneratorState,
  now: number,
): GeneratorState {
  const surviving = state.dynamicPlaces
    .map(tp => {
      if (tp.type !== 'dynamic') return tp  // fixed + player_created don't decay
      const ageMs = now - tp.createdAt
      // Exponential decay: halvefStrength increase by half-life
      const decayFactor = Math.pow(2, ageMs / HALF_LIFE_MS)
      const decayedVeil = Math.min(0.95, tp.veilStrength * decayFactor)
      return { ...tp, veilStrength: decayedVeil }
    })
    .filter(tp => tp.veilStrength < 0.95)

  return { ...state, dynamicPlaces: surviving }
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Returns all known thin places (dynamic + player_created). */
export function getAllDynamicPlaces(state: GeneratorState): ThinPlace[] {
  return state.dynamicPlaces
}
