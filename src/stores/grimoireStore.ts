import { createStore } from 'zustand/vanilla'
import { grimoireDB } from '@db/grimoire'
import type { GrimoirePage } from '@db/grimoire'
import type { Sigil, SigilStatus } from '@engine/sigil/Types'
import type { DecayState } from '@engine/sigil/DecayEngine'
import { processInteraction } from '@engine/familiarity/FamiliarityEngine'
import type { FamiliarityState, FamiliarityEventType } from '@engine/familiarity/FamiliarityEngine'

// ─── Store shape ───────────────────────────────────────────────────────────

interface GrimoireState {
  pages: GrimoirePage[]
  decayStates: Record<string, DecayState>
  familiarityStates: Record<string, FamiliarityState>
  isLoaded: boolean
}

interface GrimoireActions {
  load: () => void
  saveSigil: (sigil: Sigil) => void
  updateSigilStatus: (sigilId: string, status: SigilStatus) => void
  getPageForDemon: (demonId: string) => GrimoirePage | undefined
  /** Batch-update decayed sigils and their decay states. */
  applyDecayBatch: (updatedSigils: Sigil[], updatedDecayStates: Record<string, DecayState>) => void
  /** Record a familiarity event for a demon (atomic read-modify-write). */
  recordFamiliarity: (demonId: string, eventType: FamiliarityEventType) => void
}

type GrimoireStore = GrimoireState & GrimoireActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGrimoireStore = createStore<GrimoireStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  pages: [],
  decayStates: {},
  familiarityStates: {},
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  load() {
    const pages = grimoireDB.getAll()
    const decayStates = grimoireDB.getAllDecayStates()
    const familiarityStates = grimoireDB.getAllFamiliarity()
    set({ pages, decayStates, familiarityStates, isLoaded: true })
  },

  saveSigil(sigil: Sigil) {
    grimoireDB.saveSigil(sigil)
    set({ pages: grimoireDB.getAll() })
  },

  updateSigilStatus(sigilId: string, status: SigilStatus) {
    grimoireDB.updateSigilStatus(sigilId, status)
    set({ pages: grimoireDB.getAll() })
  },

  getPageForDemon(demonId: string): GrimoirePage | undefined {
    return get().pages.find(p => p.demonId === demonId)
  },

  applyDecayBatch(updatedSigils: Sigil[], updatedDecayStates: Record<string, DecayState>) {
    // Single load/persist cycle for both sigils and decay states
    const pages = grimoireDB.saveDecayBatch(updatedSigils, updatedDecayStates)
    set({ pages, decayStates: updatedDecayStates })
  },

  recordFamiliarity(demonId: string, eventType: FamiliarityEventType) {
    const { updatedState } = processInteraction(get().familiarityStates, demonId, eventType, Date.now())
    grimoireDB.saveFamiliarity(updatedState)
    set({ familiarityStates: { ...get().familiarityStates, [demonId]: updatedState } })
  },
}))
