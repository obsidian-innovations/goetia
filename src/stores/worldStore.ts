import { createStore } from 'zustand/vanilla'
import {
  isInThinPlace,
  getNearbyThinPlaces,
  type ThinPlace,
  type Coord,
} from '@engine/world/ThinPlaces'
import {
  createGeneratorState,
  addActivityToCell,
  spawnDynamicPlaces,
  decayDynamicPlaces,
  getAllDynamicPlaces,
  type GeneratorState,
} from '@engine/world/ThinPlaceGenerator'
import {
  generateEncounter,
  resolveEncounter,
  isEncounterActive,
  type Encounter,
} from '@engine/world/Encounters'
import { FIXED_THIN_PLACES } from '@engine/world/FixedThinPlaces'

// ─── Store shape ───────────────────────────────────────────────────────────

interface WorldStoreState {
  playerPosition: Coord | null
  /** All thin places visible to the player (fixed + dynamic within range) */
  nearbyThinPlaces: ThinPlace[]
  /** The thin place the player is currently standing inside, or null */
  currentThinPlace: ThinPlace | null
  locationPermission: PermissionState
  /** Internal generator state for dynamic thin place tracking */
  generatorState: GeneratorState
  /** Active PvE encounters (cleared when bound or expired) */
  activeEncounters: Encounter[]
}

interface WorldStoreActions {
  /** Called when the geolocation API gives a new position */
  updatePosition: (coord: Coord) => void
  /** Called when permission state changes */
  setLocationPermission: (state: PermissionState) => void
  /** Record a completed ritual (updates activity cells + potentially spawns places) */
  recordRitual: (position: Coord, intensity: number, demonId: string) => void
  /** Roll for an encounter upon entering a thin place */
  rollEncounter: (thinPlace: ThinPlace) => Encounter | null
  /** Mark an encounter as resolved (demon bound) */
  resolveEncounter: (encounterId: string) => void
  /** Tick: decay dynamic places + expire old encounters */
  tick: (now: number) => void
  /** Returns the charge multiplier at the player's current position */
  getChargeMultiplier: () => number
}

type WorldStore = WorldStoreState & WorldStoreActions

// ─── Nearby range ──────────────────────────────────────────────────────────

const NEARBY_RADIUS_M = 5_000 // 5km radar range

// ─── Store ─────────────────────────────────────────────────────────────────

export const useWorldStore = createStore<WorldStore>((set, get) => ({
  playerPosition: null,
  nearbyThinPlaces: [],
  currentThinPlace: null,
  locationPermission: 'prompt',
  generatorState: createGeneratorState(),
  activeEncounters: [],

  updatePosition(coord: Coord) {
    const { generatorState } = get()
    const allDynamic = getAllDynamicPlaces(generatorState)
    const allPlaces = [...FIXED_THIN_PLACES, ...allDynamic]

    const nearby = getNearbyThinPlaces(coord, allPlaces, NEARBY_RADIUS_M)
    const current = isInThinPlace(coord, allPlaces)

    set({ playerPosition: coord, nearbyThinPlaces: nearby, currentThinPlace: current })
  },

  setLocationPermission(state: PermissionState) {
    set({ locationPermission: state })
  },

  recordRitual(position: Coord, intensity: number, demonId: string) {
    const now = Date.now()
    let { generatorState } = get()

    generatorState = addActivityToCell(generatorState, position, intensity, demonId, now)
    generatorState = spawnDynamicPlaces(generatorState, now)

    // Update nearby places with new dynamic set
    const allDynamic = getAllDynamicPlaces(generatorState)
    const allPlaces = [...FIXED_THIN_PLACES, ...allDynamic]
    const { playerPosition } = get()
    const nearby = playerPosition ? getNearbyThinPlaces(playerPosition, allPlaces, NEARBY_RADIUS_M) : []
    const current = playerPosition ? isInThinPlace(playerPosition, allPlaces) : null

    set({ generatorState, nearbyThinPlaces: nearby, currentThinPlace: current })
  },

  rollEncounter(thinPlace: ThinPlace): Encounter | null {
    const encounter = generateEncounter(thinPlace, Date.now())
    if (!encounter) return null
    set(state => ({ activeEncounters: [...state.activeEncounters, encounter] }))
    return encounter
  },

  resolveEncounter(encounterId: string) {
    set(state => ({
      activeEncounters: state.activeEncounters.map(enc =>
        enc.id === encounterId ? resolveEncounter(enc) : enc,
      ),
    }))
  },

  tick(now: number) {
    let { generatorState, activeEncounters } = get()

    // Decay dynamic places
    generatorState = decayDynamicPlaces(generatorState, now)

    // Expire finished encounters
    const aliveEncounters = activeEncounters.filter(enc => isEncounterActive(enc, now))

    // Refresh nearby based on updated dynamic places
    const allDynamic = getAllDynamicPlaces(generatorState)
    const allPlaces = [...FIXED_THIN_PLACES, ...allDynamic]
    const { playerPosition } = get()
    const nearby = playerPosition ? getNearbyThinPlaces(playerPosition, allPlaces, NEARBY_RADIUS_M) : []
    const current = playerPosition ? isInThinPlace(playerPosition, allPlaces) : null

    set({ generatorState, activeEncounters: aliveEncounters, nearbyThinPlaces: nearby, currentThinPlace: current })
  },

  getChargeMultiplier(): number {
    const { currentThinPlace } = get()
    if (!currentThinPlace) return 1.0
    return 1.5 + (1 - currentThinPlace.veilStrength) * 1.5
  },
}))
