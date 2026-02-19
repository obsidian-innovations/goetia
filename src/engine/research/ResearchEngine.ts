import type { Demon, NodeId, SealGeometry } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ResearchState {
  demonId: string
  /** 0–1 overall research progress */
  progress: number
  /** Seal node ids the player has discovered */
  discoveredNodes: NodeId[]
  /** Seal edges the player has discovered */
  discoveredEdges: Array<{ from: NodeId; to: NodeId }>
  /** Flavour text unlocked at progress thresholds */
  loreFragments: string[]
}

// ─── Lore fragments by threshold ───────────────────────────────────────────

const LORE_BY_THRESHOLD: Array<{ threshold: number; text: string }> = [
  { threshold: 0.10, text: 'A faint impression: angular lines and silent weight.' },
  { threshold: 0.25, text: 'The first true edge of the seal takes shape in your mind.' },
  { threshold: 0.50, text: 'Half-remembered, like a name heard in a dream.' },
  { threshold: 0.75, text: 'The geometry crystallises — you almost know it.' },
  { threshold: 1.00, text: 'The seal is fully known. It waits for your hand.' },
]

// ─── Reveal thresholds ─────────────────────────────────────────────────────

interface RevealSpec {
  threshold: number
  nodesFraction: number  // fraction of demon's nodes to reveal
  edgesFraction: number  // fraction of demon's edges to reveal
}

const REVEAL_SCHEDULE: RevealSpec[] = [
  { threshold: 0.10, nodesFraction: 2 / 6,  edgesFraction: 0 },      // first 2 nodes
  { threshold: 0.25, nodesFraction: 2 / 6,  edgesFraction: 2 / 8 },  // first 2 edges
  { threshold: 0.50, nodesFraction: 0.5,    edgesFraction: 0.5 },     // half geometry
  { threshold: 0.75, nodesFraction: 1.0,    edgesFraction: 0.75 },    // all nodes, most edges
  { threshold: 1.00, nodesFraction: 1.0,    edgesFraction: 1.0 },     // full geometry
]

// ─── Factory ───────────────────────────────────────────────────────────────

export function initResearch(demonId: string): ResearchState {
  return {
    demonId,
    progress: 0,
    discoveredNodes: [],
    discoveredEdges: [],
    loreFragments: [],
  }
}

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Adds research progress and reveals nodes/edges as thresholds are crossed.
 * Returns a new state; never mutates the input.
 */
export function addResearchProgress(
  state: ResearchState,
  amount: number,
  demon: Demon,
): ResearchState {
  const oldProgress = state.progress
  const newProgress = Math.min(1, state.progress + amount)

  const allNodes = demon.sealGeometry.nodes
  const allEdges = demon.sealGeometry.edges

  // Determine how many nodes/edges to reveal based on highest crossed threshold
  let nodeCount = state.discoveredNodes.length
  let edgeCount = state.discoveredEdges.length
  const fragments = [...state.loreFragments]

  for (const spec of REVEAL_SCHEDULE) {
    if (newProgress >= spec.threshold && oldProgress < spec.threshold) {
      // Crossed this threshold — reveal up to this spec's counts
      nodeCount = Math.max(nodeCount, Math.ceil(allNodes.length * spec.nodesFraction))
      edgeCount = Math.max(edgeCount, Math.ceil(allEdges.length * spec.edgesFraction))

      // Unlock lore fragment for this threshold
      const lore = LORE_BY_THRESHOLD.find(l => l.threshold === spec.threshold)
      if (lore && !fragments.includes(lore.text)) {
        fragments.push(lore.text)
      }
    }
  }

  // Always reveal at least what was already known
  nodeCount = Math.max(nodeCount, state.discoveredNodes.length)
  edgeCount = Math.max(edgeCount, state.discoveredEdges.length)

  const discoveredNodes = allNodes.slice(0, nodeCount).map(n => n.id)
  const discoveredEdges = allEdges.slice(0, edgeCount).map(e => ({
    from: e.fromNode,
    to: e.toNode,
  }))

  return {
    ...state,
    progress: newProgress,
    discoveredNodes,
    discoveredEdges,
    loreFragments: fragments,
  }
}

/**
 * Returns only the discovered portion of the demon's seal geometry.
 * Unknown nodes appear but with no position hint; unknown edges are omitted.
 */
export function getVisibleGeometry(state: ResearchState, demon: Demon): SealGeometry {
  const knownNodeIds = new Set(state.discoveredNodes)
  const knownEdgeSet = new Set(
    state.discoveredEdges.map(e => `${e.from}:${e.to}`)
  )

  const nodes = demon.sealGeometry.nodes.filter(n => knownNodeIds.has(n.id))
  const edges = demon.sealGeometry.edges.filter(
    e => knownEdgeSet.has(`${e.fromNode}:${e.toNode}`)
  )

  return { nodes, edges }
}

/** Returns true when all nodes and edges of the demon's seal are discovered. */
export function isFullyResearched(state: ResearchState): boolean {
  return state.progress >= 1
}
