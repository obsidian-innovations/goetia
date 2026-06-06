import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePvPStore } from './pvpStore'
import { useWorldStore } from './worldStore'
import { grimoireDB } from '@db/grimoire'

// ─── localStorage mock ─────────────────────────────────────────────────────

const storage = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value) },
  removeItem: (key: string) => { storage.delete(key) },
  clear: () => { storage.clear() },
})

// ─── Anamnesis persistence ───────────────────────────────────────────────────

describe('Anamnesis persistence', () => {
  beforeEach(() => {
    storage.clear()
    usePvPStore.setState({ globalMemory: { treatments: new Map() } })
  })

  it('persists recorded demon memory across a reload', () => {
    usePvPStore.getState().recordDemonBinding('bael')
    usePvPStore.getState().recordDemonBinding('bael')
    usePvPStore.getState().recordDemonPurification('bael')
    usePvPStore.getState().recordDemonHexUse('paimon')

    // Simulate a reload: blow away in-memory state, then restore from storage.
    usePvPStore.setState({ globalMemory: { treatments: new Map() } })
    usePvPStore.getState().loadAnamnesis()

    const baelMemory = usePvPStore.getState().globalMemory.treatments.get('bael')
    expect(baelMemory?.bindings).toBe(2)
    expect(baelMemory?.purifications).toBe(1)
    expect(usePvPStore.getState().globalMemory.treatments.get('paimon')?.hexUses).toBe(1)
  })

  it('writes anamnesis through the grimoire DB layer', () => {
    usePvPStore.getState().recordDemonBinding('vassago')
    expect(grimoireDB.getAnamnesis().vassago.bindings).toBe(1)
  })
})

// ─── Echo persistence ─────────────────────────────────────────────────────────

describe('Echo persistence', () => {
  beforeEach(() => {
    storage.clear()
    useWorldStore.setState({ echoState: { echoes: new Map() } })
  })

  it('persists embedded echoes across a reload', () => {
    useWorldStore.getState().embedEcho('tp-1', 'Sigil of bael', 'bael', 'local', 1000)
    useWorldStore.getState().embedEcho('tp-1', 'Sigil of bael', 'bael', 'local', 2000)

    // Simulate a reload.
    useWorldStore.setState({ echoState: { echoes: new Map() } })
    useWorldStore.getState().loadEchoes()

    const echoes = useWorldStore.getState().getThinPlaceEchoes('tp-1')
    expect(echoes).toHaveLength(2)
    expect(echoes[0].demonId).toBe('bael')
  })
})
