import { Container, Graphics } from 'pixi.js'
import type { PlacedGlyph, IntentCoherenceResult, Point, GlyphId } from '@engine/sigil/Types'
import { getGlyphTemplate } from '@engine/sigil/GlyphLibrary'

// ─── Colour palette ────────────────────────────────────────────────────────

/** Glyph is contradicted by another placed glyph */
const COLOR_CONTRADICTED = 0xff3333
/** Glyph is isolated (no cross-group companion) */
const COLOR_ISOLATED = 0x554477
/** Glyph with high recognition confidence */
const COLOR_HIGH_CONF = 0xcc88ff
/** Glyph with lower recognition confidence */
const COLOR_LOW_CONF = 0x885acc
/** Active stroke while drawing */
const COLOR_ACTIVE = 0xffffff

// ─── GlyphLayer ────────────────────────────────────────────────────────────

/**
 * Renders placed intent glyphs (canonical paths scaled to a small region
 * centred on each glyph's normalised position) and an in-progress stroke.
 *
 * Colour coding:
 *  - Contradicted → red
 *  - Isolated      → dim purple (low alpha)
 *  - High confidence (≥ 0.80) → bright
 *  - Lower confidence → medium
 */
export class GlyphLayer extends Container {
  private readonly _gfx: Graphics
  private _glyphs: PlacedGlyph[] = []
  private _coherence: IntentCoherenceResult | null = null
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

  setGlyphs(glyphs: PlacedGlyph[], coherence: IntentCoherenceResult): void {
    this._glyphs = glyphs
    this._coherence = coherence
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

    // Glyphs are scaled to ~8% of the shorter canvas dimension
    const scale = Math.min(this._w, this._h) * 0.08

    for (const glyph of this._glyphs) {
      const template = getGlyphTemplate(glyph.glyphId)
      const path = template.canonicalPath
      if (path.length < 2) continue

      const cx = glyph.position.x * this._w
      const cy = glyph.position.y * this._h
      const color = this._colorFor(glyph.glyphId)
      const alpha = this._alphaFor(glyph.glyphId)

      // Canonical path points are in [0,1]; re-centre around glyph position
      g.moveTo(cx + (path[0].x - 0.5) * scale, cy + (path[0].y - 0.5) * scale)
      for (let i = 1; i < path.length; i++) {
        g.lineTo(cx + (path[i].x - 0.5) * scale, cy + (path[i].y - 0.5) * scale)
      }
      g.stroke({ color, width: 2, alpha })

      // Small dot at glyph origin for clarity
      g.circle(cx, cy, 3)
      g.fill({ color, alpha: alpha * 0.6 })
    }

    // Active stroke while recognising
    if (this._activeStroke.length > 1) {
      g.moveTo(this._activeStroke[0].x * this._w, this._activeStroke[0].y * this._h)
      for (let i = 1; i < this._activeStroke.length; i++) {
        g.lineTo(this._activeStroke[i].x * this._w, this._activeStroke[i].y * this._h)
      }
      g.stroke({ color: COLOR_ACTIVE, width: 1.5, alpha: 0.75 })
    }
  }

  // ─── Colour helpers ───────────────────────────────────────────────────────

  private _colorFor(id: GlyphId): number {
    if (!this._coherence) return COLOR_LOW_CONF
    if (this._coherence.contradictions.some(pair => pair.includes(id))) {
      return COLOR_CONTRADICTED
    }
    if (this._coherence.isolatedGlyphs.includes(id)) return COLOR_ISOLATED
    const glyph = this._glyphs.find(g => g.glyphId === id)
    return glyph && glyph.confidence >= 0.8 ? COLOR_HIGH_CONF : COLOR_LOW_CONF
  }

  private _alphaFor(id: GlyphId): number {
    if (!this._coherence) return 0.85
    return this._coherence.isolatedGlyphs.includes(id) ? 0.35 : 0.9
  }
}
