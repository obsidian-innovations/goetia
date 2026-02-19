import { describe, it, expect } from 'vitest'
import {
  initResearch,
  addResearchProgress,
  getVisibleGeometry,
  isFullyResearched,
} from './ResearchEngine'
import { completedRitual, studiedSigil, discoveredFragment, tradedKnowledge } from './ResearchActivities'
import type { Demon, Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDemon(nodeCount = 6, edgeCount = 6): Demon {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i + 1}` as ReturnType<typeof String.prototype.toString> as import('@engine/sigil/Types').NodeId,
    position: { x: i * 0.15, y: 0.5 },
  }))
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    fromNode: nodes[i % nodeCount].id,
    toNode: nodes[(i + 1) % nodeCount].id,
    canonicalPath: [nodes[i % nodeCount].position, nodes[(i + 1) % nodeCount].position],
    weight: 1 / edgeCount,
  }))
  return {
    id: 'test-demon',
    name: 'Test Demon',
    rank: 'Baron',
    domains: ['knowledge'],
    legions: 10,
    sealGeometry: { nodes, edges },
    description: 'A test demon.',
  }
}

function makeSigil(overallIntegrity = 0.7): Sigil {
  return {
    id: 'test-sigil',
    demonId: 'test-demon',
    sealIntegrity: 0.7,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity,
    visualState: 'healthy',
    status: 'complete',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('initResearch', () => {
  it('starts at zero progress', () => {
    const state = initResearch('bael')
    expect(state.progress).toBe(0)
  })

  it('stores the demonId', () => {
    const state = initResearch('bael')
    expect(state.demonId).toBe('bael')
  })

  it('has no discovered nodes or edges', () => {
    const state = initResearch('bael')
    expect(state.discoveredNodes).toHaveLength(0)
    expect(state.discoveredEdges).toHaveLength(0)
  })
})

describe('addResearchProgress', () => {
  it('increases progress by the given amount', () => {
    const demon = makeDemon()
    const state = initResearch('test-demon')
    const updated = addResearchProgress(state, 0.1, demon)
    expect(updated.progress).toBeCloseTo(0.1, 5)
  })

  it('caps progress at 1.0', () => {
    const demon = makeDemon()
    const state = initResearch('test-demon')
    const updated = addResearchProgress(state, 2.0, demon)
    expect(updated.progress).toBe(1)
  })

  it('does not mutate the original state', () => {
    const demon = makeDemon()
    const state = initResearch('test-demon')
    addResearchProgress(state, 0.5, demon)
    expect(state.progress).toBe(0)
  })

  describe('node reveal thresholds', () => {
    it('reveals no nodes below 0.10', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.05, demon)
      expect(updated.discoveredNodes).toHaveLength(0)
    })

    it('reveals first nodes at 0.10', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.10, demon)
      expect(updated.discoveredNodes.length).toBeGreaterThanOrEqual(2)
    })

    it('reveals all nodes at 0.75', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.75, demon)
      expect(updated.discoveredNodes).toHaveLength(demon.sealGeometry.nodes.length)
    })

    it('never removes already-discovered nodes', () => {
      const demon = makeDemon()
      let state = initResearch('test-demon')
      state = addResearchProgress(state, 0.5, demon)
      const countAfterHalf = state.discoveredNodes.length
      state = addResearchProgress(state, 0.1, demon)
      expect(state.discoveredNodes.length).toBeGreaterThanOrEqual(countAfterHalf)
    })
  })

  describe('edge reveal thresholds', () => {
    it('reveals no edges before 0.25', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.20, demon)
      expect(updated.discoveredEdges).toHaveLength(0)
    })

    it('reveals first edges at 0.25', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.25, demon)
      expect(updated.discoveredEdges.length).toBeGreaterThanOrEqual(1)
    })

    it('reveals all edges at 1.00', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 1.0, demon)
      expect(updated.discoveredEdges).toHaveLength(demon.sealGeometry.edges.length)
    })
  })

  describe('lore fragments', () => {
    it('unlocks a lore fragment when crossing 0.10', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 0.10, demon)
      expect(updated.loreFragments.length).toBeGreaterThan(0)
    })

    it('unlocks all lore fragments when fully researched', () => {
      const demon = makeDemon()
      const state = initResearch('test-demon')
      const updated = addResearchProgress(state, 1.0, demon)
      expect(updated.loreFragments.length).toBe(5) // one per threshold
    })

    it('does not duplicate lore fragments', () => {
      const demon = makeDemon()
      let state = initResearch('test-demon')
      state = addResearchProgress(state, 0.10, demon)
      state = addResearchProgress(state, 0.05, demon) // still at ~0.15, no new threshold
      const texts = state.loreFragments
      const unique = new Set(texts)
      expect(texts.length).toBe(unique.size)
    })
  })
})

describe('getVisibleGeometry', () => {
  it('returns empty geometry when nothing discovered', () => {
    const demon = makeDemon()
    const state = initResearch('test-demon')
    const geom = getVisibleGeometry(state, demon)
    expect(geom.nodes).toHaveLength(0)
    expect(geom.edges).toHaveLength(0)
  })

  it('returns only discovered nodes and edges', () => {
    const demon = makeDemon()
    let state = initResearch('test-demon')
    state = addResearchProgress(state, 0.25, demon)
    const geom = getVisibleGeometry(state, demon)
    expect(geom.nodes.length).toBeLessThan(demon.sealGeometry.nodes.length)
    expect(geom.edges.length).toBeLessThanOrEqual(state.discoveredEdges.length)
  })

  it('returns full geometry when fully researched', () => {
    const demon = makeDemon()
    let state = initResearch('test-demon')
    state = addResearchProgress(state, 1.0, demon)
    const geom = getVisibleGeometry(state, demon)
    expect(geom.nodes).toHaveLength(demon.sealGeometry.nodes.length)
    expect(geom.edges).toHaveLength(demon.sealGeometry.edges.length)
  })
})

describe('isFullyResearched', () => {
  it('returns false when progress < 1', () => {
    const state = { ...initResearch('test'), progress: 0.99 }
    expect(isFullyResearched(state)).toBe(false)
  })

  it('returns true when progress = 1', () => {
    const state = { ...initResearch('test'), progress: 1.0 }
    expect(isFullyResearched(state)).toBe(true)
  })
})

// ─── ResearchActivities tests ────────────────────────────────────────────────

describe('completedRitual', () => {
  it('returns 0 for 0 integrity', () => {
    expect(completedRitual(0)).toBe(0)
  })

  it('returns max XP for 1.0 integrity', () => {
    expect(completedRitual(1.0)).toBeCloseTo(0.15, 5)
  })

  it('scales proportionally with integrity', () => {
    expect(completedRitual(0.5)).toBeCloseTo(0.075, 5)
  })
})

describe('studiedSigil', () => {
  it('returns a positive XP value', () => {
    const xp = studiedSigil(makeSigil())
    expect(xp).toBeGreaterThan(0)
  })
})

describe('discoveredFragment', () => {
  it('returns a positive XP value', () => {
    expect(discoveredFragment('frag-1')).toBeGreaterThan(0)
  })
})

describe('tradedKnowledge', () => {
  it('returns 0 when other player has no progress', () => {
    expect(tradedKnowledge(0)).toBe(0)
  })

  it('returns a positive XP value for a researched player', () => {
    expect(tradedKnowledge(0.5)).toBeGreaterThan(0)
  })
})
