import { createStore } from 'zustand/vanilla'
import { grimoireDB } from '@db/grimoire'
import {
  initResearch,
  addResearchProgress,
  getVisibleGeometry,
  type ResearchState,
} from '@engine/research/ResearchEngine'
import { getDemon } from '@engine/demons/DemonRegistry'
import type { SealGeometry } from '@engine/sigil/Types'

// ─── Store shape ───────────────────────────────────────────────────────────

interface ResearchStoreState {
  researching: Record<string, ResearchState>
  isLoaded: boolean
}

interface ResearchStoreActions {
  /** Load all research states from the DB */
  load: () => void
  /** Add research progress for a demon and persist */
  addProgress: (demonId: string, amount: number) => void
  /** Get the visible (discovered) portion of a demon's seal, or null if not yet researched */
  getVisibleGeometry: (demonId: string) => SealGeometry | null
  /** Get research state for a demon, or null if none */
  getResearch: (demonId: string) => ResearchState | null
}

type ResearchStore = ResearchStoreState & ResearchStoreActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useResearchStore = createStore<ResearchStore>((set, get) => ({
  researching: {},
  isLoaded: false,

  load() {
    const all = grimoireDB.getAllResearch()
    set({ researching: all, isLoaded: true })
  },

  addProgress(demonId: string, amount: number) {
    let demon
    try {
      demon = getDemon(demonId)
    } catch {
      return // Unknown demon — silently ignore
    }

    const { researching } = get()
    const existing = researching[demonId] ?? initResearch(demonId)
    const updated = addResearchProgress(existing, amount, demon)

    grimoireDB.saveResearch(updated)
    set(state => ({
      researching: { ...state.researching, [demonId]: updated },
    }))
  },

  getVisibleGeometry(demonId: string): SealGeometry | null {
    const { researching } = get()
    const researchState = researching[demonId]
    if (!researchState) return null

    let demon
    try {
      demon = getDemon(demonId)
    } catch {
      return null
    }

    return getVisibleGeometry(researchState, demon)
  },

  getResearch(demonId: string): ResearchState | null {
    return get().researching[demonId] ?? null
  },
}))
