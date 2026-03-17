import { describe, it, expect, vi } from 'vitest'
import {
  getVesselPerspective,
  getVesselDescription,
  generateVesselWhisper,
  hasPostPurificationFlicker,
} from './VesselPerspective'
import type { Demon } from '@engine/sigil/Types'
import type { PermanentScar } from './PurificationEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDemon(id: string, rank: Demon['rank'] = 'Duke'): Demon {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    rank,
    domains: ['knowledge'],
    legions: 30,
    sealGeometry: { nodes: [], edges: [] },
    description: `The demon ${id}`,
  }
}

const NO_SCARS: PermanentScar[] = []
const DISTORTION_SCARS: PermanentScar[] = [
  { type: 'persistent_distortion', description: 'faint darkness' },
]

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('VesselPerspective', () => {
  describe('getVesselPerspective', () => {
    it('is inactive below 0.80 corruption', () => {
      const demons = [makeDemon('bael', 'King')]
      const result = getVesselPerspective(0.79, ['bael'], demons, NO_SCARS)
      expect(result.isActive).toBe(false)
      expect(result.dominantDemonId).toBeNull()
      expect(result.labelReplacements).toEqual({})
    })

    it('activates at exactly 0.80 corruption', () => {
      const demons = [makeDemon('bael', 'King')]
      const result = getVesselPerspective(0.80, ['bael'], demons, NO_SCARS)
      expect(result.isActive).toBe(true)
      expect(result.dominantDemonId).toBe('bael')
    })

    it('provides label replacements when active', () => {
      const demons = [makeDemon('bael', 'King')]
      const result = getVesselPerspective(0.90, ['bael'], demons, NO_SCARS)
      expect(result.labelReplacements).toEqual({
        SEAL: 'CLAIM',
        GLYPH: 'MARK',
        RING: 'CHAIN',
        Bind: 'Submit',
      })
    })

    it('picks highest rank demon as dominant', () => {
      const demons = [
        makeDemon('agares', 'Duke'),
        makeDemon('bael', 'King'),
        makeDemon('vassago', 'Prince'),
      ]
      const result = getVesselPerspective(0.90, ['agares', 'bael', 'vassago'], demons, NO_SCARS)
      expect(result.dominantDemonId).toBe('bael')
    })

    it('only considers bound demons', () => {
      const demons = [makeDemon('bael', 'King'), makeDemon('agares', 'Duke')]
      const result = getVesselPerspective(0.90, ['agares'], demons, NO_SCARS)
      // bael is King but not bound — agares (Duke) should be dominant
      expect(result.dominantDemonId).toBe('agares')
    })

    it('handles no bound demons', () => {
      const result = getVesselPerspective(0.90, [], [], NO_SCARS)
      expect(result.isActive).toBe(true)
      expect(result.dominantDemonId).toBeNull()
    })

    it('detects post-purification flicker from scars', () => {
      const result = getVesselPerspective(0.50, [], [], DISTORTION_SCARS)
      expect(result.postPurificationFlickers).toBe(true)
    })

    it('no flicker without distortion scar', () => {
      const result = getVesselPerspective(0.50, [], [], NO_SCARS)
      expect(result.postPurificationFlickers).toBe(false)
    })
  })

  describe('getVesselDescription', () => {
    it('returns a description for each rank', () => {
      const ranks: Demon['rank'][] = ['King', 'Prince', 'Duke', 'Marquis', 'Earl', 'Knight', 'President', 'Baron']
      for (const rank of ranks) {
        const demon = makeDemon('test', rank)
        const desc = getVesselDescription(demon)
        expect(desc.length).toBeGreaterThan(0)
      }
    })

    it('returns different descriptions for different ranks', () => {
      const king = getVesselDescription(makeDemon('a', 'King'))
      const baron = getVesselDescription(makeDemon('b', 'Baron'))
      expect(king).not.toBe(baron)
    })
  })

  describe('generateVesselWhisper', () => {
    it('returns a non-empty string without demon name', () => {
      const text = generateVesselWhisper()
      expect(text.length).toBeGreaterThan(0)
    })

    it('sometimes includes demon name when provided', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3) // < 0.6 → use named
      const text = generateVesselWhisper('Bael')
      expect(text).toContain('Bael')
      vi.restoreAllMocks()
    })

    it('falls back to generic when random >= 0.6', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.8) // >= 0.6 → use generic
      const text = generateVesselWhisper('Bael')
      expect(text).not.toContain('Bael')
      vi.restoreAllMocks()
    })

    it('produces variety over multiple calls', () => {
      vi.restoreAllMocks()
      const results = new Set<string>()
      for (let i = 0; i < 50; i++) {
        results.add(generateVesselWhisper())
      }
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('hasPostPurificationFlicker', () => {
    it('returns true with persistent_distortion scar', () => {
      expect(hasPostPurificationFlicker(DISTORTION_SCARS)).toBe(true)
    })

    it('returns false with no scars', () => {
      expect(hasPostPurificationFlicker([])).toBe(false)
    })

    it('returns false with other scar types only', () => {
      const scars: PermanentScar[] = [
        { type: 'suspicious_demon', demonId: 'bael', description: 'distrusted' },
        { type: 'shifted_geometry', demonId: 'agares', description: 'shifted' },
      ]
      expect(hasPostPurificationFlicker(scars)).toBe(false)
    })
  })
})
