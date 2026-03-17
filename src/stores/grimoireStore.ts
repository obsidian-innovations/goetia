import { createStore } from 'zustand/vanilla'
import { grimoireDB } from '@db/grimoire'
import type { GrimoirePage } from '@db/grimoire'
import type { Sigil, SigilStatus } from '@engine/sigil/Types'
import type { DecayState } from '@engine/sigil/DecayEngine'
import { processInteraction } from '@engine/familiarity/FamiliarityEngine'
import type { FamiliarityState, FamiliarityEventType } from '@engine/familiarity/FamiliarityEngine'
import type { DreamState } from '@engine/sigil/DreamEngine'
import type { GrimoireMemory } from '@engine/grimoire/PalimpsestEngine'

// ─── Store shape ───────────────────────────────────────────────────────────

interface GrimoireState {
  pages: GrimoirePage[]
  decayStates: Record<string, DecayState>
  familiarityStates: Record<string, FamiliarityState>
  dreamStates: Record<string, DreamState>
  grimoireMemory: GrimoireMemory | null
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
  /** Batch-update dreamed sigils and their dream states. */
  applyDreamBatch: (updatedSigils: Sigil[], updatedDreamStates: Record<string, DreamState>) => void
  /** Save updated grimoire memory. */
  saveMemory: (memory: GrimoireMemory) => void
}

type GrimoireStore = GrimoireState & GrimoireActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGrimoireStore = createStore<GrimoireStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  pages: [],
  decayStates: {},
  familiarityStates: {},
  dreamStates: {},
  grimoireMemory: null,
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  load() {
    const pages = grimoireDB.getAll()
    const decayStates = grimoireDB.getAllDecayStates()
    const familiarityStates = grimoireDB.getAllFamiliarity()
    const dreamStates = grimoireDB.getAllDreamStates()
    const grimoireMemory = grimoireDB.getGrimoireMemory()
    set({ pages, decayStates, familiarityStates, dreamStates, grimoireMemory, isLoaded: true })
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
    const { updatedState, allStates } = processInteraction(get().familiarityStates, demonId, eventType, Date.now())
    grimoireDB.saveFamiliarity(updatedState)
    set({ familiarityStates: allStates })
  },

  applyDreamBatch(updatedSigils: Sigil[], updatedDreamStates: Record<string, DreamState>) {
    const pages = grimoireDB.saveDreamBatch(updatedSigils, updatedDreamStates)
    set({ pages, dreamStates: updatedDreamStates })
  },

  saveMemory(memory: GrimoireMemory) {
    grimoireDB.saveGrimoireMemory(memory)
    set({ grimoireMemory: memory })
  },
}))
