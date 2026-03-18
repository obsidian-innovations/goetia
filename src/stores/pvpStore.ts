import { createStore } from 'zustand/vanilla'
import type { Sigil, Demon } from '@engine/sigil/Types'
import type { ClashResult } from '@engine/pvp/ClashResolver'
import {
  castHex as engineCastHex,
  castWard as engineCastWard,
  deactivateHex,
  isHexActive,
  resolveHexWithWard,
  type Hex,
} from '@engine/pvp/HexSystem'
import {
  createCoven,
  inviteMember,
  contributeSigil,
  removeMember,
  exposeSigil,
  type CovenState,
} from '@engine/social/CovenEngine'
import {
  createGlobalMemory,
  recordHexUse,
  recordBinding,
  recordPurification,
  getDemonPersonality,
  type GlobalDemonMemory,
  type DemonPersonality,
} from '@engine/social/Anamnesis'
import {
  createCollectiveRitual,
  addContribution,
  isRitualComplete,
  completeRitual,
  betrayRitual,
  type CollectiveRitualState,
  type RitualContribution,
} from '@engine/social/CollectiveRitual'
import {
  createHierarchy,
  initFromCoven,
  recordContribution,
  recordParticipation,
  tickHierarchy as tickHierarchyFn,
  type HierarchyState,
} from '@engine/social/InnerCircle'
import {
  createObservationState,
  observeClash,
  recordObservation,
  clearObservations,
  type SpectralObservationState,
} from '@engine/social/SpectralObservation'

// ─── Store shape ───────────────────────────────────────────────────────────

interface PvPStoreState {
  /** Hexes cast by the local player, currently active */
  activeHexes: Hex[]
  /** Wards placed by the local player, currently active */
  activeWards: Hex[]
  /** Incoming hexes not yet resolved */
  incomingHexes: Hex[]
  /** Result of the most recent clash (null until first clash) */
  lastClashResult: ClashResult | null
  /** The local player's coven state, or null if not in a coven */
  covenState: CovenState | null
  /** Local player ID (null until authenticated) */
  playerId: string | null
  /** Aggregated demon treatment history (Anamnesis) */
  globalMemory: GlobalDemonMemory
  /** Active collective ritual, or null */
  collectiveRitual: CollectiveRitualState | null
  /** Inner circle hierarchy weights */
  hierarchy: HierarchyState
  /** Spectral observation state */
  observationState: SpectralObservationState
}

interface PvPStoreActions {
  /** Set the local player ID */
  setPlayerId: (id: string) => void
  /** Cast an offensive hex at a target */
  castHex: (targetId: string, sigil: Sigil, demon: Demon) => Hex
  /** Place a defensive ward */
  castWard: (sigil: Sigil, demon: Demon) => Hex
  /** Handle an incoming hex — auto-resolves against wards if available */
  receiveIncomingHex: (hex: Hex) => void
  /** Mark an incoming hex as manually resolved */
  resolveIncomingHex: (hexId: string) => void
  /** Store the result of the latest clash */
  setLastClashResult: (result: ClashResult) => void
  /** Create a new coven */
  createCoven: (name: string) => void
  /** Replace coven state (e.g., after syncing from server) */
  setCoven: (covenState: CovenState) => void
  /** Invite a player to the current coven */
  inviteToCoven: (playerId: string) => void
  /** Contribute a sigil to the coven's shared grimoire */
  contributeToCovenGrimoire: (sigil: Sigil) => void
  /** Remove a player from the coven */
  removeFromCoven: (playerId: string) => void
  /** Expose a coven sigil to an external player (betrayal) */
  exposeSigilToCoven: (sigilId: string, targetPlayerId: string) => void
  /** Tick: expire old hexes, wards, and incoming hexes */
  tick: (now: number) => void

  // ── Anamnesis ──────────────────────────────────────────────────────────
  recordDemonHexUse: (demonId: string) => void
  recordDemonBinding: (demonId: string) => void
  recordDemonPurification: (demonId: string) => void
  getDemonPersonalityModifiers: (demonId: string) => DemonPersonality

  // ── CollectiveRitual ───────────────────────────────────────────────────
  startCollectiveRitual: (demonId: string, now: number) => void
  contributeToRitual: (contribution: RitualContribution) => void
  completeCollectiveRitual: (now: number) => void
  betrayCollectiveRitual: (betrayerId: string, now: number) => void

  // ── InnerCircle ────────────────────────────────────────────────────────
  initHierarchy: () => void
  recordMemberContribution: (playerId: string, quality: number) => void
  recordMemberParticipation: (playerId: string) => void
  tickHierarchy: () => void

  // ── SpectralObservation ────────────────────────────────────────────────
  processObservedClash: (clashResult: ClashResult, inRange: boolean) => void
  clearObservedClashes: () => void
}

type PvPStore = PvPStoreState & PvPStoreActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const usePvPStore = createStore<PvPStore>((set, get) => ({
  activeHexes:     [],
  activeWards:     [],
  incomingHexes:   [],
  lastClashResult: null,
  covenState:      null,
  playerId:        null,
  globalMemory:    createGlobalMemory(),
  collectiveRitual: null,
  hierarchy:       createHierarchy(),
  observationState: createObservationState(),

  setPlayerId(id: string) {
    set({ playerId: id })
  },

  castHex(targetId: string, sigil: Sigil, demon: Demon): Hex {
    const now = Date.now()
    const hex = engineCastHex(get().playerId ?? 'local', targetId, sigil, demon, now)
    set(state => ({ activeHexes: [...state.activeHexes, hex] }))
    return hex
  },

  castWard(sigil: Sigil, demon: Demon): Hex {
    const now = Date.now()
    const ward = engineCastWard(get().playerId ?? 'local', sigil, demon, now)
    set(state => ({ activeWards: [...state.activeWards, ward] }))
    return ward
  },

  receiveIncomingHex(hex: Hex) {
    const { activeWards } = get()
    const now = Date.now()
    const resolution = resolveHexWithWard(hex, activeWards, now)

    if (resolution) {
      // Ward intercepted the hex — record result and deactivate the ward
      set(state => ({
        lastClashResult: resolution.clashResult,
        activeWards: state.activeWards.map(w =>
          w.id === resolution.wardActivated.id ? deactivateHex(w) : w,
        ),
      }))
    } else {
      // No ward available — queue for manual resolution
      set(state => ({ incomingHexes: [...state.incomingHexes, hex] }))
    }
  },

  resolveIncomingHex(hexId: string) {
    set(state => ({
      incomingHexes: state.incomingHexes.map(h => h.id === hexId ? deactivateHex(h) : h),
    }))
  },

  setLastClashResult(result: ClashResult) {
    set({ lastClashResult: result })
  },

  createCoven(name: string) {
    const { playerId } = get()
    if (!playerId) return
    const covenState = createCoven(name, playerId, Date.now())
    set({
      covenState,
      hierarchy: initFromCoven(covenState),
    })
  },

  setCoven(covenState: CovenState) {
    set({
      covenState,
      hierarchy: initFromCoven(covenState),
    })
  },

  inviteToCoven(playerId: string) {
    const { covenState } = get()
    if (!covenState) return
    const updated = inviteMember(covenState, playerId)
    set({
      covenState: updated,
      hierarchy: initFromCoven(updated),
    })
  },

  contributeToCovenGrimoire(sigil: Sigil) {
    const { covenState } = get()
    if (!covenState) return
    set({ covenState: contributeSigil(covenState, sigil) })
  },

  removeFromCoven(playerId: string) {
    const { covenState } = get()
    if (!covenState) return
    set({ covenState: removeMember(covenState, playerId) })
  },

  exposeSigilToCoven(sigilId: string, targetPlayerId: string) {
    const { covenState, playerId } = get()
    if (!covenState || !playerId) return
    set({ covenState: exposeSigil(covenState, playerId, sigilId, targetPlayerId, Date.now()) })
  },

  tick(now: number) {
    set(state => ({
      activeHexes:   state.activeHexes.filter(h => isHexActive(h, now)),
      activeWards:   state.activeWards.filter(w => isHexActive(w, now)),
      incomingHexes: state.incomingHexes.filter(h => isHexActive(h, now)),
    }))
  },

  // ── Anamnesis ────────────────────────────────────────────────────────────

  recordDemonHexUse(demonId: string) {
    set(state => ({ globalMemory: recordHexUse(state.globalMemory, demonId) }))
  },

  recordDemonBinding(demonId: string) {
    set(state => ({ globalMemory: recordBinding(state.globalMemory, demonId) }))
  },

  recordDemonPurification(demonId: string) {
    set(state => ({ globalMemory: recordPurification(state.globalMemory, demonId) }))
  },

  getDemonPersonalityModifiers(demonId: string): DemonPersonality {
    return getDemonPersonality(get().globalMemory, demonId)
  },

  // ── CollectiveRitual ─────────────────────────────────────────────────────

  startCollectiveRitual(demonId: string, now: number) {
    const { covenState } = get()
    if (!covenState) return
    set({ collectiveRitual: createCollectiveRitual(covenState.coven.name, demonId, now) })
  },

  contributeToRitual(contribution: RitualContribution) {
    set(state => {
      if (!state.collectiveRitual) return {}
      return { collectiveRitual: addContribution(state.collectiveRitual, contribution) }
    })
  },

  completeCollectiveRitual(now: number) {
    set(state => {
      if (!state.collectiveRitual) return {}
      if (!isRitualComplete(state.collectiveRitual)) return {}
      return { collectiveRitual: completeRitual(state.collectiveRitual, now) }
    })
  },

  betrayCollectiveRitual(betrayerId: string, now: number) {
    set(state => {
      if (!state.collectiveRitual || !state.covenState) return {}
      const { ritualState, covenState: updatedCoven } = betrayRitual(
        state.collectiveRitual, betrayerId, state.covenState, now,
      )
      return { collectiveRitual: ritualState, covenState: updatedCoven }
    })
  },

  // ── InnerCircle ──────────────────────────────────────────────────────────

  initHierarchy() {
    const { covenState } = get()
    if (!covenState) return
    set({ hierarchy: initFromCoven(covenState) })
  },

  recordMemberContribution(playerId: string, quality: number) {
    set(state => ({ hierarchy: recordContribution(state.hierarchy, playerId, quality) }))
  },

  recordMemberParticipation(playerId: string) {
    set(state => ({ hierarchy: recordParticipation(state.hierarchy, playerId) }))
  },

  tickHierarchy() {
    set(state => ({ hierarchy: tickHierarchyFn(state.hierarchy) }))
  },

  // ── SpectralObservation ──────────────────────────────────────────────────

  processObservedClash(clashResult: ClashResult, inRange: boolean) {
    set(state => {
      const obs = observeClash(clashResult, inRange)
      return { observationState: recordObservation(state.observationState, obs) }
    })
  },

  clearObservedClashes() {
    set(state => ({ observationState: clearObservations(state.observationState) }))
  },
}))
