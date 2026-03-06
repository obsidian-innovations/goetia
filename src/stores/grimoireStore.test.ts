import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGrimoireStore } from './grimoireStore'
import { grimoireDB } from '@db/grimoire'
import type { Sigil } from '@engine/sigil/Types'

// ─── localStorage mock ─────────────────────────────────────────────────────

const storage = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value) },
  removeItem: (key: string) => { storage.delete(key) },
  clear: () => { storage.clear() },
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(id: string, demonId: string, status: Sigil['status'] = 'draft'): Sigil {
  return {
    id,
    demonId,
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.75,
    visualState: 'healthy',
    status,
    createdAt: Date.now(),
    statusChangedAt: Date.now(),
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('grimoireStore', () => {
  beforeEach(() => {
    storage.clear()
    useGrimoireStore.setState({ pages: [], isLoaded: false })
  })

  describe('load', () => {
    it('populates pages from grimoireDB and sets isLoaded', () => {
      grimoireDB.saveSigil(makeSigil('s1', 'bael'))
      useGrimoireStore.getState().load()
      const state = useGrimoireStore.getState()
      expect(state.isLoaded).toBe(true)
      expect(state.pages).toHaveLength(1)
      expect(state.pages[0].demonId).toBe('bael')
      expect(state.pages[0].sigils).toHaveLength(1)
    })

    it('loads empty when nothing is stored', () => {
      useGrimoireStore.getState().load()
      const state = useGrimoireStore.getState()
      expect(state.isLoaded).toBe(true)
      expect(state.pages).toEqual([])
    })
  })

  describe('saveSigil', () => {
    it('saves a sigil and updates pages', () => {
      useGrimoireStore.getState().saveSigil(makeSigil('s1', 'bael'))
      const state = useGrimoireStore.getState()
      expect(state.pages).toHaveLength(1)
      expect(state.pages[0].sigils[0].id).toBe('s1')
    })

    it('groups sigils by demon into the same page', () => {
      const store = useGrimoireStore.getState()
      store.saveSigil(makeSigil('s1', 'bael'))
      store.saveSigil(makeSigil('s2', 'bael'))
      const pages = useGrimoireStore.getState().pages
      expect(pages).toHaveLength(1)
      expect(pages[0].sigils).toHaveLength(2)
    })

    it('updates existing sigil when id matches', () => {
      const store = useGrimoireStore.getState()
      store.saveSigil(makeSigil('s1', 'bael'))
      const updated = makeSigil('s1', 'bael')
      updated.sealIntegrity = 0.95
      store.saveSigil(updated)
      const pages = useGrimoireStore.getState().pages
      expect(pages[0].sigils).toHaveLength(1)
      expect(pages[0].sigils[0].sealIntegrity).toBe(0.95)
    })
  })

  describe('updateSigilStatus', () => {
    it('transitions draft → complete', () => {
      const store = useGrimoireStore.getState()
      store.saveSigil(makeSigil('s1', 'bael', 'draft'))
      store.updateSigilStatus('s1', 'complete')
      const pages = useGrimoireStore.getState().pages
      expect(pages[0].sigils[0].status).toBe('complete')
    })

    it('throws on invalid transition', () => {
      const store = useGrimoireStore.getState()
      store.saveSigil(makeSigil('s1', 'bael', 'draft'))
      expect(() => store.updateSigilStatus('s1', 'charged')).toThrow()
    })
  })

  describe('getPageForDemon', () => {
    it('returns the page for a known demon', () => {
      useGrimoireStore.getState().saveSigil(makeSigil('s1', 'paimon'))
      const page = useGrimoireStore.getState().getPageForDemon('paimon')
      expect(page).toBeDefined()
      expect(page!.demonId).toBe('paimon')
    })

    it('returns undefined for an unknown demon', () => {
      const page = useGrimoireStore.getState().getPageForDemon('unknown')
      expect(page).toBeUndefined()
    })
  })
})
