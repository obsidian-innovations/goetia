import { createStore } from 'zustand/vanilla'
import { grimoireDB } from '@db/grimoire'
import type { GrimoirePage } from '@db/grimoire'
import type { Sigil, SigilStatus } from '@engine/sigil/Types'

// ─── Store shape ───────────────────────────────────────────────────────────

interface GrimoireState {
  pages: GrimoirePage[]
  isLoaded: boolean
}

interface GrimoireActions {
  load: () => void
  saveSigil: (sigil: Sigil) => void
  updateSigilStatus: (sigilId: string, status: SigilStatus) => void
  getPageForDemon: (demonId: string) => GrimoirePage | undefined
}

type GrimoireStore = GrimoireState & GrimoireActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGrimoireStore = createStore<GrimoireStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  pages: [],
  isLoaded: false,

  // ── Actions ────────────────────────────────────────────────────────────

  load() {
    const pages = grimoireDB.getAll()
    set({ pages, isLoaded: true })
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
}))
