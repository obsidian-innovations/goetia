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
import {
  createBroadcastState,
  updateBroadcast,
  broadcastCorruption,
  isVesselBroadcasting,
  createVesselThinPlace,
  isTemporaryPlaceExpired,
  type BroadcastState,
  type TemporaryThinPlace,
} from '@engine/world/CorruptionBroadcast'
import {
  createWhisperingWall,
  embedEcho as embedEchoFn,
  getResonanceModifier,
  type WhisperingWallState,
} from '@engine/world/Echoes'
import {
  createEntropyState,
  recordEntropyEvent,
  getEntropyEffects,
  type EntropyState,
  type EntropyEffects,
  type EntropyEventType,
} from '@engine/world/EntropyClock'
import {
  createPilgrimageState,
  startPilgrimage as startPilgrimageFn,
  updatePilgrimage as updatePilgrimageFn,
  getDemonDirection,
  type PilgrimageState,
} from '@engine/world/Pilgrimages'
import {
  createKingEvent,
  joinKingEvent as joinKingEventFn,
  updateParticipantProgress,
  isKingEventComplete,
  collapseKingEvent,
  isCollapseActive,
  resolveKingEvent,
  type KingEvent,
} from '@engine/world/KingEvent'
import type { Demon } from '@engine/sigil/Types'

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
  /** Corruption broadcast state (null until initialized) */
  broadcastState: BroadcastState | null
  /** Echoes left at thin places by previous rituals */
  echoState: WhisperingWallState
  /** World-level entropy accumulation */
  entropyState: EntropyState
  /** Cached entropy effects (recomputed on entropy change) */
  entropyEffects: EntropyEffects
  /** Active pilgrimages keyed by demon ID */
  pilgrimageState: PilgrimageState
  /** Active king demon world event, or null */
  activeKingEvent: KingEvent | null
  /** Temporary thin places created by vessel-stage players */
  temporaryThinPlaces: TemporaryThinPlace[]
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

  // ── CorruptionBroadcast ────────────────────────────────────────────────
  initBroadcast: (corruptionLevel: number, now: number) => void
  tickBroadcast: (corruptionLevel: number, playerPos: Coord, now: number) => void

  // ── Echoes ─────────────────────────────────────────────────────────────
  embedEcho: (thinPlaceId: string, text: string, demonId: string, playerId: string, now: number) => void
  getEchoResonance: (thinPlaceId: string) => number

  // ── EntropyClock ───────────────────────────────────────────────────────
  recordEntropy: (eventType: EntropyEventType) => void

  // ── Pilgrimages ────────────────────────────────────────────────────────
  startPilgrimage: (demonId: string, demonIndex: number, currentPos: Coord) => void
  tickPilgrimages: (playerPos: Coord, now: number) => void

  // ── KingEvent ──────────────────────────────────────────────────────────
  startKingEvent: (demon: Demon, initiatorId: string, now: number) => void
  joinKingEvent: (playerId: string) => void
  updateKingProgress: (playerId: string, progress: number) => void
  tickKingEvent: (now: number) => void
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
  broadcastState: null,
  echoState: createWhisperingWall(),
  entropyState: createEntropyState(),
  entropyEffects: getEntropyEffects(createEntropyState()),
  pilgrimageState: createPilgrimageState(),
  activeKingEvent: null,
  temporaryThinPlaces: [],

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

  // ── CorruptionBroadcast ──────────────────────────────────────────────────

  initBroadcast(corruptionLevel: number, now: number) {
    set({ broadcastState: createBroadcastState(corruptionLevel, now) })
  },

  tickBroadcast(corruptionLevel: number, playerPos: Coord, now: number) {
    const state = get()
    if (!state.broadcastState) {
      // Auto-initialize on first tick
      set({ broadcastState: createBroadcastState(corruptionLevel, now) })
      return
    }

    const updated = updateBroadcast(state.broadcastState, corruptionLevel, playerPos, now)

    // Broadcast corruption to nearby thin places
    const { effects, updatedPlaces } = broadcastCorruption(
      updated, state.nearbyThinPlaces, playerPos, now,
    )

    // Expire temporary thin places and create new ones for vessel players
    let tempPlaces = state.temporaryThinPlaces.filter(p => !isTemporaryPlaceExpired(p, now))
    if (isVesselBroadcasting(updated)) {
      const vesselPlace = createVesselThinPlace(updated, playerPos, now)
      if (vesselPlace) tempPlaces = [...tempPlaces, vesselPlace]
    }

    const updates: Partial<WorldStoreState> = {
      broadcastState: updated,
      temporaryThinPlaces: tempPlaces,
    }

    // Only update nearby places if broadcast actually changed them
    if (effects.length > 0) {
      updates.nearbyThinPlaces = updatedPlaces
    }

    set(updates)
  },

  // ── Echoes ───────────────────────────────────────────────────────────────

  embedEcho(thinPlaceId: string, text: string, demonId: string, playerId: string, now: number) {
    set(state => ({
      echoState: embedEchoFn(state.echoState, thinPlaceId, text, demonId, playerId, now),
    }))
  },

  getEchoResonance(thinPlaceId: string): number {
    return getResonanceModifier(get().echoState, thinPlaceId)
  },

  // ── EntropyClock ─────────────────────────────────────────────────────────

  recordEntropy(eventType: EntropyEventType) {
    set(state => {
      const newEntropyState = recordEntropyEvent(state.entropyState, eventType)
      return {
        entropyState: newEntropyState,
        entropyEffects: getEntropyEffects(newEntropyState),
      }
    })
  },

  // ── Pilgrimages ──────────────────────────────────────────────────────────

  startPilgrimage(demonId: string, demonIndex: number, currentPos: Coord) {
    set(state => ({
      pilgrimageState: startPilgrimageFn(state.pilgrimageState, demonId, currentPos),
    }))
    // demonIndex used for direction calculation at update time
    void demonIndex
  },

  tickPilgrimages(playerPos: Coord, now: number) {
    set(state => {
      let pilgrimageState = state.pilgrimageState
      for (const [demonId, progress] of pilgrimageState.pilgrimages) {
        if (progress.completed) continue
        // Derive direction from demon index (use hash of demonId as fallback)
        const demonIndex = demonIdToIndex(demonId)
        const direction = getDemonDirection(demonIndex)
        pilgrimageState = updatePilgrimageFn(pilgrimageState, demonId, direction, playerPos, now)
      }
      return { pilgrimageState }
    })
  },

  // ── KingEvent ────────────────────────────────────────────────────────────

  startKingEvent(demon: Demon, initiatorId: string, now: number) {
    set({ activeKingEvent: createKingEvent(demon, initiatorId, now) })
  },

  joinKingEvent(playerId: string) {
    const { activeKingEvent } = get()
    if (!activeKingEvent) return
    const { event } = joinKingEventFn(activeKingEvent, playerId)
    set({ activeKingEvent: event })
  },

  updateKingProgress(playerId: string, progress: number) {
    const { activeKingEvent } = get()
    if (!activeKingEvent) return
    const updated = updateParticipantProgress(activeKingEvent, playerId, progress)
    if (isKingEventComplete(updated)) {
      set({ activeKingEvent: resolveKingEvent(updated) })
    } else {
      set({ activeKingEvent: updated })
    }
  },

  tickKingEvent(now: number) {
    const { activeKingEvent } = get()
    if (!activeKingEvent) return
    if (activeKingEvent.phase === 'resolved') {
      set({ activeKingEvent: null })
      return
    }
    // Check for disconnected participants and collapse if needed
    const hasDisconnected = activeKingEvent.participants.some(p => !p.connected)
    if (hasDisconnected && activeKingEvent.phase === 'active') {
      set({ activeKingEvent: collapseKingEvent(activeKingEvent, now) })
      return
    }
    // Expire collapsed events
    if (activeKingEvent.phase === 'collapsed' && !isCollapseActive(activeKingEvent, now)) {
      set({ activeKingEvent: null })
    }
  },
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Derive a stable index (1–72) from a demon ID string. */
function demonIdToIndex(demonId: string): number {
  let hash = 0
  for (let i = 0; i < demonId.length; i++) {
    hash = (hash * 31 + demonId.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 72) + 1
}
