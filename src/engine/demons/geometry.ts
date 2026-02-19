import type { NodeId, SealEdge, SealNode } from '../sigil/Types.ts'

/** Cast a plain string to NodeId branded type. */
export function nid(id: string): NodeId { return id as NodeId }

/** Build a seal edge between two nodes. */
export function mkEdge(from: SealNode, to: SealNode, w: number): SealEdge {
  return {
    fromNode:      from.id,
    toNode:        to.id,
    canonicalPath: [from.position, to.position],
    weight:        w,
  }
}

/**
 * Create n nodes evenly distributed on a circle.
 * Default: top-centred (startAngle = -π/2), radius 0.42, centre (0.5, 0.5).
 */
export function circle(
  prefix: string,
  n: number,
  r = 0.42,
  cx = 0.50,
  cy = 0.50,
  startAngle = -Math.PI / 2,
): SealNode[] {
  return Array.from({ length: n }, (_, i) => {
    const a = startAngle + (i * 2 * Math.PI) / n
    return {
      id:       nid(`${prefix}-n${i + 1}`),
      position: {
        x: Math.round((cx + r * Math.cos(a)) * 100) / 100,
        y: Math.round((cy + r * Math.sin(a)) * 100) / 100,
      },
    }
  })
}

/** A single centre node. */
export function hub(prefix: string, cx = 0.50, cy = 0.50): SealNode {
  return { id: nid(`${prefix}-c`), position: { x: cx, y: cy } }
}

/** Polygon perimeter edges (index 0→1→2→…→0). Weights must sum to 1.0. */
export function polyEdges(ns: SealNode[], weights: number[]): SealEdge[] {
  return ns.map((n, i) => mkEdge(n, ns[(i + 1) % ns.length], weights[i]))
}

/**
 * Pentagram: 5-node circle, skip-2 connections.
 * All edges weighted 0.20.
 */
export function pentagram(prefix: string): { nodes: SealNode[]; edges: SealEdge[] } {
  const ns = circle(prefix, 5)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[2], ns[4], 0.20),
    mkEdge(ns[4], ns[1], 0.20), mkEdge(ns[1], ns[3], 0.20),
    mkEdge(ns[3], ns[0], 0.20),
  ]
  return { nodes: ns, edges }
}

/**
 * Wheel: n nodes on circle + centre hub.
 * n perimeter edges + n spokes = 2n edges × 0.10 each (n must be 5).
 * For flexibility, pass explicit weights.
 */
export function wheel(
  prefix: string,
  n: number,
  spokeWeight = 0.10,
  rimWeight = 0.10,
): { nodes: SealNode[]; edges: SealEdge[] } {
  const ns = circle(prefix, n)
  const h   = hub(prefix)
  const edges: SealEdge[] = [
    ...ns.map((n, i) => mkEdge(n, ns[(i + 1) % ns.length], rimWeight)),
    ...ns.map(n => mkEdge(h, n, spokeWeight)),
  ]
  return { nodes: [...ns, h], edges }
}
