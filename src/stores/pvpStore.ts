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
    set({ covenState: createCoven(name, playerId, Date.now()) })
  },

  setCoven(covenState: CovenState) {
    set({ covenState })
  },

  inviteToCoven(playerId: string) {
    const { covenState } = get()
    if (!covenState) return
    set({ covenState: inviteMember(covenState, playerId) })
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
}))
