import { describe, it, expect } from 'vitest'
import {
  captureShadowEntries,
  fadeShadow,
  fadeShadowBatch,
  getShadowLore,
  isShadowVisible,
  getVisibleShadows,
} from './ShadowGrimoire'
import type { ShadowEntry } from './ShadowGrimoire'
import type { Demon, Sigil } from '@engine/sigil/Types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000

function makeSigil(overrides?: Partial<Sigil>): Sigil {
  return {
    id: 'sigil-1',
    demonId: 'demon-1',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.8, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.75,
    visualState: 'healthy',
    status: 'awakened',
    createdAt: 1000,
    statusChangedAt: 1000,
    ...overrides,
  }
}

function makeDemon(overrides?: Partial<Demon>): Demon {
  return {
    id: 'demon-1',
    name: 'Baal',
    rank: 'King',
    domains: ['binding'],
    legions: 66,
    sealGeometry: { nodes: [], edges: [] },
    description: 'test',
    ...overrides,
  }
}

function makeEntry(overrides?: Partial<ShadowEntry>): ShadowEntry {
  return {
    sigilId: 'sigil-1',
    demonId: 'demon-1',
    capturedAt: 1000,
    fadeProgress: 0,
    invertedIntegrity: 0.25,
    demonPerspectiveLore: [],
    ...overrides,
  }
}

describe('ShadowGrimoire', () => {
  // ── Capture ─────────────────────────────────────────────────────────────

  describe('captureShadowEntries', () => {
    it('captures awakened and charged sigils', () => {
      const pages = [
        {
          demonId: 'demon-1',
          sigils: [
            makeSigil({ id: 's1', status: 'awakened' }),
            makeSigil({ id: 's2', status: 'charged' }),
          ],
        },
      ]
      const entries = captureShadowEntries(pages, 5000)
      expect(entries).toHaveLength(2)
      expect(entries[0].sigilId).toBe('s1')
      expect(entries[1].sigilId).toBe('s2')
      expect(entries[0].capturedAt).toBe(5000)
    })

    it('captures complete and resting sigils', () => {
      const pages = [
        {
          demonId: 'demon-1',
          sigils: [
            makeSigil({ id: 's1', status: 'complete' }),
            makeSigil({ id: 's2', status: 'resting' }),
          ],
        },
      ]
      expect(captureShadowEntries(pages, 1000)).toHaveLength(2)
    })

    it('skips draft and spent sigils', () => {
      const pages = [
        {
          demonId: 'demon-1',
          sigils: [
            makeSigil({ id: 's1', status: 'draft' }),
            makeSigil({ id: 's2', status: 'spent' }),
          ],
        },
      ]
      expect(captureShadowEntries(pages, 1000)).toHaveLength(0)
    })

    it('computes inverted integrity', () => {
      const pages = [{
        demonId: 'demon-1',
        sigils: [makeSigil({ overallIntegrity: 0.8 })],
      }]
      const entries = captureShadowEntries(pages, 1000)
      expect(entries[0].invertedIntegrity).toBeCloseTo(0.2, 2)
    })

    it('handles multiple pages', () => {
      const pages = [
        { demonId: 'd1', sigils: [makeSigil({ id: 's1', status: 'awakened' })] },
        { demonId: 'd2', sigils: [makeSigil({ id: 's2', status: 'charged' })] },
      ]
      const entries = captureShadowEntries(pages, 1000)
      expect(entries).toHaveLength(2)
      expect(entries[0].demonId).toBe('d1')
      expect(entries[1].demonId).toBe('d2')
    })
  })

  // ── Fading ──────────────────────────────────────────────────────────────

  describe('fadeShadow', () => {
    it('returns same entry if progress unchanged', () => {
      const entry = makeEntry({ capturedAt: 1000, fadeProgress: 0 })
      expect(fadeShadow(entry, 1000)).toBe(entry)
    })

    it('fades linearly over 4 weeks', () => {
      const entry = makeEntry({ capturedAt: 0 })
      const halfFaded = fadeShadow(entry, FOUR_WEEKS_MS / 2)
      expect(halfFaded.fadeProgress).toBeCloseTo(0.5, 1)
    })

    it('clamps to 1.0 after 4 weeks', () => {
      const entry = makeEntry({ capturedAt: 0 })
      const fullyFaded = fadeShadow(entry, FOUR_WEEKS_MS + 1000)
      expect(fullyFaded.fadeProgress).toBe(1)
    })
  })

  describe('fadeShadowBatch', () => {
    it('returns original array when nothing changed', () => {
      const entries = [makeEntry({ capturedAt: 1000, fadeProgress: 0 })]
      const { entries: result, changed } = fadeShadowBatch(entries, 1000)
      expect(changed).toBe(false)
      expect(result).toBe(entries)
    })

    it('updates multiple entries', () => {
      const entries = [
        makeEntry({ sigilId: 's1', capturedAt: 0 }),
        makeEntry({ sigilId: 's2', capturedAt: 0 }),
      ]
      const { entries: result, changed } = fadeShadowBatch(entries, FOUR_WEEKS_MS / 2)
      expect(changed).toBe(true)
      expect(result[0].fadeProgress).toBeCloseTo(0.5, 1)
      expect(result[1].fadeProgress).toBeCloseTo(0.5, 1)
    })
  })

  // ── Lore ────────────────────────────────────────────────────────────────

  describe('getShadowLore', () => {
    it('generates lore for a King demon', () => {
      const entry = makeEntry()
      const lore = getShadowLore(entry, makeDemon({ rank: 'King' }))
      expect(lore.length).toBeGreaterThan(0)
      expect(typeof lore[0]).toBe('string')
    })

    it('generates more lore for weak sigils', () => {
      const weakEntry = makeEntry({ invertedIntegrity: 0.8 })
      const strongEntry = makeEntry({ invertedIntegrity: 0.2 })
      const weakLore = getShadowLore(weakEntry, makeDemon())
      const strongLore = getShadowLore(strongEntry, makeDemon())
      expect(weakLore.length).toBeGreaterThanOrEqual(strongLore.length)
    })

    it('returns cached lore if already generated', () => {
      const entry = makeEntry({ demonPerspectiveLore: ['cached line'] })
      const lore = getShadowLore(entry, makeDemon())
      expect(lore).toEqual(['cached line'])
    })
  })

  // ── Visibility ──────────────────────────────────────────────────────────

  describe('isShadowVisible', () => {
    it('returns true for fresh entry', () => {
      expect(isShadowVisible(makeEntry())).toBe(true)
    })

    it('returns true for partially faded', () => {
      expect(isShadowVisible(makeEntry({ fadeProgress: 0.5 }))).toBe(true)
    })

    it('returns false for fully faded', () => {
      expect(isShadowVisible(makeEntry({ fadeProgress: 1.0 }))).toBe(false)
    })
  })

  describe('getVisibleShadows', () => {
    it('filters out fully faded entries', () => {
      const entries = [
        makeEntry({ sigilId: 's1', fadeProgress: 0.3 }),
        makeEntry({ sigilId: 's2', fadeProgress: 1.0 }),
        makeEntry({ sigilId: 's3', fadeProgress: 0.9 }),
      ]
      const visible = getVisibleShadows(entries)
      expect(visible).toHaveLength(2)
      expect(visible.map(e => e.sigilId)).toEqual(['s1', 's3'])
    })
  })
})
