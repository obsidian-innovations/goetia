import { createStore } from 'zustand/vanilla'
import { grimoireDB } from '@db/grimoire'
import type { GrimoirePage } from '@db/grimoire'
import type { Sigil, SigilStatus } from '@engine/sigil/Types'
import type { DecayState } from '@engine/sigil/DecayEngine'

// ─── Store shape ───────────────────────────────────────────────────────────

interface GrimoireState {
  pages: GrimoirePage[]
  decayStates: Record<string, DecayState>
  isLoaded: boolean
}

interface GrimoireActions {
  load: () => void
  saveSigil: (sigil: Sigil) => void
  updateSigilStatus: (sigilId: string, status: SigilStatus) => void
  getPageForDemon: (demonId: string) => GrimoirePage | undefined
  /** Batch-update decayed sigils and their decay states. */
  applyDecayBatch: (updatedSigils: Sigil[], updatedDecayStates: Record<string, DecayState>) => void
}

type GrimoireStore = GrimoireState & GrimoireActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGrimoireStore = createStore<GrimoireStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  pages: [],
  decayStates: {},
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  load() {
    const pages = grimoireDB.getAll()
    const decayStates = grimoireDB.getAllDecayStates()
    set({ pages, decayStates, isLoaded: true })
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
    // Persist each decayed sigil
    for (const sigil of updatedSigils) {
      grimoireDB.saveSigil(sigil)
    }
    // Persist all decay states in one write
    grimoireDB.saveAllDecayStates(updatedDecayStates)
    set({ pages: grimoireDB.getAll(), decayStates: updatedDecayStates })
  },
}))
