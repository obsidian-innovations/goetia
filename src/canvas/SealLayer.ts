import { Container, Graphics } from 'pixi.js'
import type { SealGeometry, ConnectionResult, NodeId, Point } from '@engine/sigil/Types'

// ─── Accuracy colour thresholds ────────────────────────────────────────────

const COLOR_BRIGHT = 0xcc88ff  // accuracy ≥ 0.75
const COLOR_MEDIUM = 0x8844aa  // accuracy ≥ 0.50
const COLOR_DIM    = 0x442266  // accuracy < 0.50

const NODE_GHOST   = 0x7755bb
const NODE_DONE    = 0xaa66ff

// ─── SealLayer ─────────────────────────────────────────────────────────────

/**
 * Renders the demon's seal geometry:
 *  - Ghost edges (canonical paths, dim)
 *  - Completed connections (coloured by accuracy)
 *  - Ghost nodes
 *  - Active stroke (bright yellow)
 *
 * All incoming coordinates are in normalised [0, 1] space.
 */
export class SealLayer extends Container {
  private readonly _gfx: Graphics
  private _geometry: SealGeometry | null = null
  private _connections: ConnectionResult[] = []
  private _activeStroke: Point[] = []
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

  setConnections(connections: ConnectionResult[]): void {
    this._connections = connections
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

  // ─── Hit-testing ──────────────────────────────────────────────────────────

  /**
   * Returns the id of the nearest seal node to `point` (in pixel space)
   * that lies within `threshold` pixels, or null if none qualifies.
   */
  getNearestNodeId(point: Point, threshold: number): NodeId | null {
    if (!this._geometry) return null
    let nearest: NodeId | null = null
    let minDist = threshold
    for (const node of this._geometry.nodes) {
      const dx = point.x - node.position.x * this._w
      const dy = point.y - node.position.y * this._h
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
    const connSet = new Set(
      this._connections.map(c => `${c.fromNode}:${c.toNode}`)
    )

    // 1. Ghost edges (canonical paths, very dim)
    for (const edge of edges) {
      if (connSet.has(`${edge.fromNode}:${edge.toNode}`)) continue
      const path = edge.canonicalPath
      if (path.length < 2) continue
      g.moveTo(path[0].x * this._w, path[0].y * this._h)
      for (let i = 1; i < path.length; i++) {
        g.lineTo(path[i].x * this._w, path[i].y * this._h)
      }
      g.stroke({ color: 0x6633aa, width: 1.5, alpha: 0.6 })
    }

    // 2. Completed connections (coloured by accuracy)
    for (const conn of this._connections) {
      const edge = edges.find(
        e => e.fromNode === conn.fromNode && e.toNode === conn.toNode,
      )
      if (!edge || edge.canonicalPath.length < 2) continue
      const color =
        conn.accuracy >= 0.75 ? COLOR_BRIGHT :
        conn.accuracy >= 0.50 ? COLOR_MEDIUM :
        COLOR_DIM
      const path = edge.canonicalPath
      g.moveTo(path[0].x * this._w, path[0].y * this._h)
      for (let i = 1; i < path.length; i++) {
        g.lineTo(path[i].x * this._w, path[i].y * this._h)
      }
      g.stroke({ color, width: 2 })
    }

    // 3. Ghost nodes
    for (const node of nodes) {
      const px = node.position.x * this._w
      const py = node.position.y * this._h
      const done = this._connections.some(
        c => c.fromNode === node.id || c.toNode === node.id,
      )
      g.circle(px, py, done ? 6 : 4)
      g.fill({ color: done ? NODE_DONE : NODE_GHOST, alpha: done ? 1 : 0.55 })
    }

    // 4. Active stroke
    if (this._activeStroke.length > 1) {
      g.moveTo(this._activeStroke[0].x * this._w, this._activeStroke[0].y * this._h)
      for (let i = 1; i < this._activeStroke.length; i++) {
        g.lineTo(this._activeStroke[i].x * this._w, this._activeStroke[i].y * this._h)
      }
      g.stroke({ color: 0xffee88, width: 2, alpha: 0.85 })
    }
  }
}
