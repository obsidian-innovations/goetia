import { Container, Graphics } from 'pixi.js'
import type { SealGeometry, ConnectionResult, NodeId, Point } from '@engine/sigil/Types'

// ─── Accuracy colour thresholds ────────────────────────────────────────────

const COLOR_BRIGHT = 0xcc88ff  // accuracy ≥ 0.75
const COLOR_MEDIUM = 0x8844aa  // accuracy ≥ 0.50
const COLOR_DIM    = 0x442266  // accuracy < 0.50

const NODE_GHOST   = 0x7755bb
const NODE_DONE    = 0xaa66ff
const NODE_UNKNOWN = 0x332244  // undiscovered node placeholder
const EDGE_UNKNOWN = 0x3a1a55  // undiscovered edge hint

// ─── Seal-complete highlight ─────────────────────────────────────────────
const SEAL_HIGHLIGHT_THRESHOLD = 0.75
const GLOW_COLOR   = 0xddaaff
const GLOW_WIDTH   = 8
const GLOW_ALPHA   = 0.35
const NODE_GLOW_COLOR = 0xeeccff

/**
 * Vertical insets (px) that keep the seal clear of the UI chrome.
 * SEAL_PAD_TOP reserves space for the ritual header bar.
 * SEAL_PAD_BOT reserves space for the phase/bind toolbar at the bottom.
 */
const SEAL_PAD_TOP = 56
const SEAL_PAD_BOT = 72

// ─── SealLayer ─────────────────────────────────────────────────────────────

/**
 * Renders the demon's seal geometry:
 *  - Ghost edges (canonical paths, dim) — for known edges
 *  - Unknown edges (faint straight hints) — for undiscovered edges
 *  - Completed connections (coloured by accuracy)
 *  - Ghost nodes (known) / unknown node placeholders (undiscovered)
 *  - Active stroke (bright yellow)
 *
 * All incoming coordinates are in normalised [0, 1] space.
 *
 * When `visibleGeometry` is set (partial research), only its nodes/edges are
 * shown in full; the rest are rendered as faint hints.
 */
export class SealLayer extends Container {
  private readonly _gfx: Graphics
  private _geometry: SealGeometry | null = null
  /** Subset of geometry known to the player via research (null = fully known). */
  private _visibleGeometry: SealGeometry | null = null
  private _connections: ConnectionResult[] = []
  private _activeStroke: Point[] = []
  private _sealIntegrity: number = 0
  private _w: number
  private _h: number

  constructor(width: number, height: number) {
    super()
    this._w = width
    this._h = height
    this._gfx = new Graphics()
    this.addChild(this._gfx)
  }

  // ─── Setters ──────────────────────────────────────────────────────────────

  setGeometry(geometry: SealGeometry): void {
    this._geometry = geometry
    this._connections = []
    this._activeStroke = []
    this._render()
  }

  /**
   * Sets the player's currently discovered subset of the seal.
   * Pass `null` to indicate the full geometry is known (fully researched).
   */
  setVisibleGeometry(visible: SealGeometry | null): void {
    this._visibleGeometry = visible
    this._render()
  }

  setConnections(connections: ConnectionResult[]): void {
    this._connections = connections
    this._render()
  }

  setSealIntegrity(integrity: number): void {
    this._sealIntegrity = integrity
    this._render()
  }

  setActiveStroke(points: Point[]): void {
    this._activeStroke = points
    this._render()
  }

  clearActiveStroke(): void {
    this._activeStroke = []
    this._render()
  }

  // ─── Coordinate helpers ───────────────────────────────────────────────────

  /** Map a normalised [0,1] point to padded pixel space. */
  private _toPixel(p: Point): Point {
    return {
      x: p.x * this._w,
      y: SEAL_PAD_TOP + p.y * (this._h - SEAL_PAD_TOP - SEAL_PAD_BOT),
    }
  }

  /**
   * Inverse of `_toPixel`: convert a raw pixel-space point to the seal's
   * normalised coordinate space. Used by RitualCanvas so that active-stroke
   * points fed back into this layer render exactly where the finger was.
   */
  normalisePt(pt: Point): Point {
    return {
      x: pt.x / this._w,
      y: (pt.y - SEAL_PAD_TOP) / (this._h - SEAL_PAD_TOP - SEAL_PAD_BOT),
    }
  }

  // ─── Hit-testing ──────────────────────────────────────────────────────────

  /**
   * Returns the id of the nearest seal node to `point` (in pixel space)
   * within `threshold` pixels, or null if none qualifies.
   * Only snaps to discovered (visible) nodes.
   */
  getNearestNodeId(point: Point, threshold: number): NodeId | null {
    if (!this._geometry) return null

    // Only snap to known nodes; if no partial geometry, all are known
    const knownNodes = this._visibleGeometry
      ? this._visibleGeometry.nodes
      : this._geometry.nodes

    let nearest: NodeId | null = null
    let minDist = threshold
    for (const node of knownNodes) {
      const px = this._toPixel(node.position)
      const dx = point.x - px.x
      const dy = point.y - px.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        nearest = node.id
      }
    }
    return nearest
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this._w = width
    this._h = height
    this._render()
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  private _render(): void {
    const g = this._gfx
    g.clear()

    if (!this._geometry) return

    const { nodes, edges } = this._geometry

    const knownNodeIds = this._visibleGeometry
      ? new Set(this._visibleGeometry.nodes.map(n => n.id))
      : null  // null = all known

    const knownEdgeSet = this._visibleGeometry
      ? new Set(this._visibleGeometry.edges.map(e => `${e.fromNode}:${e.toNode}`))
      : null  // null = all known

    const connSet = new Set(
      this._connections.map(c => `${c.fromNode}:${c.toNode}`)
    )

    // 1. Unknown edges — faint straight hints (drawn behind everything)
    if (knownEdgeSet !== null) {
      for (const edge of edges) {
        if (knownEdgeSet.has(`${edge.fromNode}:${edge.toNode}`)) continue
        if (connSet.has(`${edge.fromNode}:${edge.toNode}`)) continue
        const path = edge.canonicalPath
        if (path.length < 2) continue
        const p0 = this._toPixel(path[0])
        const p1 = this._toPixel(path[path.length - 1])
        g.moveTo(p0.x, p0.y)
        g.lineTo(p1.x, p1.y)
        g.stroke({ color: EDGE_UNKNOWN, width: 1, alpha: 0.22 })
      }
    }

    // 2. Known ghost edges (canonical paths, dim)
    for (const edge of edges) {
      if (connSet.has(`${edge.fromNode}:${edge.toNode}`)) continue
      if (knownEdgeSet !== null && !knownEdgeSet.has(`${edge.fromNode}:${edge.toNode}`)) continue
      const path = edge.canonicalPath
      if (path.length < 2) continue
      const first = this._toPixel(path[0])
      g.moveTo(first.x, first.y)
      for (let i = 1; i < path.length; i++) {
        const p = this._toPixel(path[i])
        g.lineTo(p.x, p.y)
      }
      g.stroke({ color: 0x6633aa, width: 1.5, alpha: 0.6 })
    }

    const sealHighlighted = this._sealIntegrity >= SEAL_HIGHLIGHT_THRESHOLD

    // 3a. Glow pass — wide semi-transparent stroke behind completed edges
    if (sealHighlighted) {
      for (const conn of this._connections) {
        const edge = edges.find(
          e => e.fromNode === conn.fromNode && e.toNode === conn.toNode,
        )
        if (!edge || edge.canonicalPath.length < 2) continue
        const path = edge.canonicalPath
        const first = this._toPixel(path[0])
        g.moveTo(first.x, first.y)
        for (let i = 1; i < path.length; i++) {
          const p = this._toPixel(path[i])
          g.lineTo(p.x, p.y)
        }
        g.stroke({ color: GLOW_COLOR, width: GLOW_WIDTH, alpha: GLOW_ALPHA })
      }
    }

    // 3b. Completed connections (coloured by accuracy)
    for (const conn of this._connections) {
      const edge = edges.find(
        e => e.fromNode === conn.fromNode && e.toNode === conn.toNode,
      )
      if (!edge || edge.canonicalPath.length < 2) continue
      const color = sealHighlighted ? COLOR_BRIGHT :
        conn.accuracy >= 0.75 ? COLOR_BRIGHT :
        conn.accuracy >= 0.50 ? COLOR_MEDIUM :
        COLOR_DIM
      const path = edge.canonicalPath
      const first = this._toPixel(path[0])
      g.moveTo(first.x, first.y)
      for (let i = 1; i < path.length; i++) {
        const p = this._toPixel(path[i])
        g.lineTo(p.x, p.y)
      }
      g.stroke({ color, width: 2 })
    }

    // 4. Nodes
    for (const node of nodes) {
      const { x: px, y: py } = this._toPixel(node.position)
      const done = this._connections.some(
        c => c.fromNode === node.id || c.toNode === node.id,
      )
      const known = knownNodeIds === null || knownNodeIds.has(node.id)

      if (known) {
        // Outer glow for nodes when seal is highlighted
        if (sealHighlighted && done) {
          g.circle(px, py, 10)
          g.fill({ color: NODE_GLOW_COLOR, alpha: 0.2 })
        }
        g.circle(px, py, done ? 6 : 4)
        g.fill({ color: done ? (sealHighlighted ? NODE_GLOW_COLOR : NODE_DONE) : NODE_GHOST, alpha: done ? 1 : 0.55 })
      } else {
        // Unknown: faint placeholder with a small X to hint at hidden nodes
        g.circle(px, py, 3)
        g.fill({ color: NODE_UNKNOWN, alpha: 0.25 })
        const qs = 3
        g.moveTo(px - qs, py - qs)
        g.lineTo(px + qs, py + qs)
        g.moveTo(px + qs, py - qs)
        g.lineTo(px - qs, py + qs)
        g.stroke({ color: NODE_UNKNOWN, width: 1, alpha: 0.3 })
      }
    }

    // 5. Active stroke
    if (this._activeStroke.length > 1) {
      const first = this._toPixel(this._activeStroke[0])
      g.moveTo(first.x, first.y)
      for (let i = 1; i < this._activeStroke.length; i++) {
        const p = this._toPixel(this._activeStroke[i])
        g.lineTo(p.x, p.y)
      }
      g.stroke({ color: 0xffee88, width: 2, alpha: 0.85 })
    }
  }
}
