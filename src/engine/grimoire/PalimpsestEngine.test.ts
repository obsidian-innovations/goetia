import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createGrimoireMemory,
  recordRitual,
  tickGrimoire,
  generateGrimoireWhisper,
  getLatestBehavior,
  getSuggestedDemonId,
  getActiveBleedthrough,
  getPageReorderTarget,
  getMemoryTier,
} from './PalimpsestEngine'
import type { GrimoireMemory, GrimoireBehavior } from './PalimpsestEngine'
import type { Sigil } from '@engine/sigil/Types'
import type { FamiliarityState } from '@engine/familiarity/FamiliarityEngine'

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000
const FIVE_MINUTES = 5 * 60_000

function makeMemory(overrides: Partial<GrimoireMemory> = {}): GrimoireMemory {
  return {
    totalRituals: 0,
    totalCorruptionAbsorbed: 0,
    dominantDomain: null,
    memoryScore: 0,
    lastBehaviorAt: NOW - FIVE_MINUTES - 1, // Just past the interval
    behaviors: [],
    domainCounts: {},
    ...overrides,
  }
}

function makeSigil(overrides: Partial<Sigil> = {}): Sigil {
  return {
    id: 'sig-1',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.85,
    visualState: 'charged',
    status: 'resting',
    createdAt: NOW - 86_400_000,
    statusChangedAt: NOW - 86_400_000,
    ...overrides,
  }
}

function makeFamState(demonId: string, score: number, interactionCount: number): FamiliarityState {
  return {
    demonId,
    score,
    tier: score >= 0.80 ? 'bonded' : score >= 0.50 ? 'familiar' : score >= 0.25 ? 'acquaintance' : 'stranger',
    interactionCount,
    lastInteractionAt: NOW,
    simplifiedEdges: [],
  }
}

function makePages(demonIds: string[]): Array<{ demonId: string; sigils: Sigil[] }> {
  return demonIds.map(id => ({
    demonId: id,
    sigils: [makeSigil({ id: `sig-${id}`, demonId: id })],
  }))
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PalimpsestEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('createGrimoireMemory', () => {
    it('creates a fresh memory with zero scores', () => {
      const mem = createGrimoireMemory(NOW)
      expect(mem.totalRituals).toBe(0)
      expect(mem.memoryScore).toBe(0)
      expect(mem.dominantDomain).toBeNull()
      expect(mem.behaviors).toHaveLength(0)
      expect(mem.lastBehaviorAt).toBe(NOW)
    })
  })

  describe('recordRitual', () => {
    it('increments ritual count and grows memory score', () => {
      const mem = createGrimoireMemory(NOW)
      const updated = recordRitual(mem, ['knowledge'], 0)
      expect(updated.totalRituals).toBe(1)
      expect(updated.memoryScore).toBeCloseTo(0.05) // MEMORY_PER_RITUAL
    })

    it('tracks corruption absorbed', () => {
      const mem = createGrimoireMemory(NOW)
      const updated = recordRitual(mem, ['destruction'], 0.5)
      expect(updated.totalCorruptionAbsorbed).toBe(0.5)
      // 0.05 + 0.5 * 0.02 = 0.06
      expect(updated.memoryScore).toBeCloseTo(0.06)
    })

    it('tracks domain counts and dominant domain', () => {
      let mem = createGrimoireMemory(NOW)
      mem = recordRitual(mem, ['knowledge'], 0)
      mem = recordRitual(mem, ['destruction'], 0)
      mem = recordRitual(mem, ['knowledge'], 0)
      expect(mem.dominantDomain).toBe('knowledge')
      expect(mem.domainCounts['knowledge']).toBe(2)
      expect(mem.domainCounts['destruction']).toBe(1)
    })

    it('handles multiple domains per ritual', () => {
      const mem = createGrimoireMemory(NOW)
      const updated = recordRitual(mem, ['knowledge', 'binding'], 0)
      expect(updated.domainCounts['knowledge']).toBe(1)
      expect(updated.domainCounts['binding']).toBe(1)
    })

    it('caps memory score at 1.0', () => {
      const mem = makeMemory({ memoryScore: 0.98 })
      const updated = recordRitual(mem, ['knowledge'], 1.0)
      expect(updated.memoryScore).toBe(1)
    })

    it('grows to ~0.3 after 6 rituals (per plan verification)', () => {
      let mem = createGrimoireMemory(NOW)
      for (let i = 0; i < 6; i++) {
        mem = recordRitual(mem, ['knowledge'], 0)
      }
      // 6 * 0.05 = 0.30
      expect(mem.memoryScore).toBeCloseTo(0.30)
    })

    it('preserves original memory immutably', () => {
      const mem = createGrimoireMemory(NOW)
      recordRitual(mem, ['knowledge'], 0)
      expect(mem.totalRituals).toBe(0)
    })
  })

  describe('tickGrimoire', () => {
    it('returns null behavior if interval has not elapsed', () => {
      const mem = makeMemory({ lastBehaviorAt: NOW - 1000, memoryScore: 0.8 })
      const result = tickGrimoire(mem, makePages(['bael']), {}, NOW)
      expect(result.behavior).toBeNull()
    })

    it('returns null behavior if memory score is too low', () => {
      const mem = makeMemory({ memoryScore: 0.1 })
      const result = tickGrimoire(mem, makePages(['bael', 'agares']), {}, NOW)
      expect(result.behavior).toBeNull()
    })

    it('updates lastBehaviorAt even when no behavior produced', () => {
      const mem = makeMemory({ memoryScore: 0.1 })
      const result = tickGrimoire(mem, [], {}, NOW)
      expect(result.memory.lastBehaviorAt).toBe(NOW)
    })

    it('produces page_reorder when score >= 0.3', () => {
      const mem = makeMemory({ memoryScore: 0.35 })
      const pages = makePages(['bael', 'agares'])
      const fam = { agares: makeFamState('agares', 0.3, 10) }
      // Mock random to avoid whisper/suggestion
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = tickGrimoire(mem, pages, fam, NOW)
      expect(result.behavior).not.toBeNull()
      expect(result.behavior!.type).toBe('page_reorder')
      expect(result.behavior!.data.demonId).toBe('agares')
    })

    it('does not reorder if best demon is already first', () => {
      const mem = makeMemory({ memoryScore: 0.35 })
      const pages = makePages(['agares', 'bael'])
      const fam = { agares: makeFamState('agares', 0.3, 10) }
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = tickGrimoire(mem, pages, fam, NOW)
      // No reorder since agares is already first
      expect(result.behavior).toBeNull()
    })

    it('produces bleedthrough when score >= 0.5 with 2+ pages', () => {
      const mem = makeMemory({ memoryScore: 0.55 })
      const pages = makePages(['bael', 'agares'])
      vi.spyOn(Math, 'random').mockReturnValue(0.99)

      const result = tickGrimoire(mem, pages, {}, NOW)
      expect(result.behavior).not.toBeNull()
      expect(result.behavior!.type).toBe('bleedthrough')
      expect(result.behavior!.data.sourceDemonId).toBeDefined()
      expect(result.behavior!.data.targetDemonId).toBeDefined()
    })

    it('produces whisper or suggestion when score >= 0.7', () => {
      const mem = makeMemory({ memoryScore: 0.75 })
      const pages = makePages(['bael', 'agares'])
      const fam = { bael: makeFamState('bael', 0.5, 5) }
      vi.spyOn(Math, 'random').mockReturnValue(0.3) // < 0.5 => whisper

      const result = tickGrimoire(mem, pages, fam, NOW)
      expect(result.behavior).not.toBeNull()
      expect(result.behavior!.type).toBe('whisper')
      expect(typeof result.behavior!.data.text).toBe('string')
    })

    it('produces demon_suggestion at high memory', () => {
      const mem = makeMemory({ memoryScore: 0.75, dominantDomain: 'knowledge' })
      const pages = makePages(['bael', 'agares'])
      const fam = { bael: makeFamState('bael', 0.6, 10) }
      vi.spyOn(Math, 'random').mockReturnValue(0.8) // >= 0.5 => suggestion

      const result = tickGrimoire(mem, pages, fam, NOW)
      expect(result.behavior).not.toBeNull()
      expect(result.behavior!.type).toBe('demon_suggestion')
      expect(result.behavior!.data.demonId).toBe('bael')
    })

    it('caps behavior history at 50', () => {
      const existingBehaviors: GrimoireBehavior[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'whisper' as const,
        timestamp: NOW - (50 - i) * 60_000,
        data: { text: `whisper-${i}` },
      }))
      const mem = makeMemory({ memoryScore: 0.75, behaviors: existingBehaviors })
      const pages = makePages(['bael', 'agares'])
      vi.spyOn(Math, 'random').mockReturnValue(0.3) // => whisper

      const result = tickGrimoire(mem, pages, {}, NOW)
      expect(result.memory.behaviors).toHaveLength(50)
    })
  })

  describe('generateGrimoireWhisper', () => {
    it('returns a non-empty string', () => {
      const text = generateGrimoireWhisper()
      expect(text.length).toBeGreaterThan(0)
    })

    it('returns different strings over multiple calls', () => {
      const results = new Set<string>()
      for (let i = 0; i < 50; i++) {
        results.add(generateGrimoireWhisper())
      }
      // With 12 options, 50 calls should produce variety
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('query helpers', () => {
    it('getLatestBehavior finds the most recent by type', () => {
      const mem = makeMemory({
        behaviors: [
          { type: 'whisper', timestamp: 100, data: { text: 'old' } },
          { type: 'page_reorder', timestamp: 200, data: { demonId: 'bael' } },
          { type: 'whisper', timestamp: 300, data: { text: 'new' } },
        ],
      })
      const latest = getLatestBehavior(mem, 'whisper')
      expect(latest).not.toBeNull()
      expect(latest!.data.text).toBe('new')
    })

    it('getLatestBehavior returns null when none found', () => {
      const mem = makeMemory()
      expect(getLatestBehavior(mem, 'whisper')).toBeNull()
    })

    it('getSuggestedDemonId extracts demon ID from suggestion', () => {
      const mem = makeMemory({
        behaviors: [{ type: 'demon_suggestion', timestamp: NOW, data: { demonId: 'agares' } }],
      })
      expect(getSuggestedDemonId(mem)).toBe('agares')
    })

    it('getSuggestedDemonId returns null when no suggestion', () => {
      expect(getSuggestedDemonId(makeMemory())).toBeNull()
    })

    it('getActiveBleedthrough extracts bleedthrough data', () => {
      const mem = makeMemory({
        behaviors: [{
          type: 'bleedthrough', timestamp: NOW,
          data: { sourceDemonId: 'bael', targetDemonId: 'agares', sigilIntegrity: 0.7 },
        }],
      })
      const bt = getActiveBleedthrough(mem)
      expect(bt).not.toBeNull()
      expect(bt!.sourceDemonId).toBe('bael')
      expect(bt!.targetDemonId).toBe('agares')
      expect(bt!.sigilIntegrity).toBe(0.7)
    })

    it('getPageReorderTarget extracts demon ID', () => {
      const mem = makeMemory({
        behaviors: [{ type: 'page_reorder', timestamp: NOW, data: { demonId: 'vassago' } }],
      })
      expect(getPageReorderTarget(mem)).toBe('vassago')
    })
  })

  describe('getMemoryTier', () => {
    it('returns correct tiers', () => {
      expect(getMemoryTier(0)).toBe('dormant')
      expect(getMemoryTier(0.29)).toBe('dormant')
      expect(getMemoryTier(0.3)).toBe('stirring')
      expect(getMemoryTier(0.49)).toBe('stirring')
      expect(getMemoryTier(0.5)).toBe('aware')
      expect(getMemoryTier(0.69)).toBe('aware')
      expect(getMemoryTier(0.7)).toBe('sentient')
      expect(getMemoryTier(1.0)).toBe('sentient')
    })
  })
})
