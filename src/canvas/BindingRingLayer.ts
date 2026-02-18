import { Container, Graphics, Ticker } from 'pixi.js'
import type { RingResult } from '@engine/sigil/Types'

// ─── BindingRingLayer ──────────────────────────────────────────────────────

/**
 * Renders the binding ring:
 *  - Main circle (coloured by overall strength, with a soft glow halo)
 *  - Weak-point arc segments (red, slowly rotating around the ring)
 *
 * The rotation offset increments on every ticker tick for a subtle
 * slow-spin effect on the weak-point markers.
 */
export class BindingRingLayer extends Container {
  private readonly _gfx: Graphics
  private _ring: RingResult | null = null
  private _rotationOffset = 0
  private _w: number
  private _h: number

  constructor(width: number, height: number) {
    super()
    this._w = width
    this._h = height
    this._gfx = new Graphics()
    this.addChild(this._gfx)

    Ticker.shared.add(this._onTick)
  }

  // ─── Setters ──────────────────────────────────────────────────────────────

  setRing(ring: RingResult): void {
    this._ring = ring
    this._render()
  }

  clearRing(): void {
    this._ring = null
    this._gfx.clear()
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this._w = width
    this._h = height
    this._render()
  }

  override destroy(): void {
    Ticker.shared.remove(this._onTick)
    super.destroy({ children: true })
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _onTick = (ticker: Ticker): void => {
    this._rotationOffset += ticker.deltaTime * 0.004
    if (this._ring) this._render()
  }

  private _render(): void {
    if (!this._ring) return

    const g = this._gfx
    g.clear()

    const cx = this._ring.center.x * this._w
    const cy = this._ring.center.y * this._h
    const r = this._ring.radius * Math.min(this._w, this._h)
    const strength = this._ring.overallStrength

    // Colour shifts from dim purple → bright violet as strength increases
    const ringColor =
      strength >= 0.75 ? 0xcc88ff :
      strength >= 0.50 ? 0x8844cc :
      strength >= 0.25 ? 0x441188 :
      0x220844

    // Outer glow halo (drawn first so it sits behind the ring)
    g.circle(cx, cy, r + 6)
    g.stroke({ color: ringColor, width: 10, alpha: 0.08 + strength * 0.1 })

    // Main ring
    const ringWidth = 1.5 + strength * 2.5
    g.circle(cx, cy, r)
    g.stroke({ color: ringColor, width: ringWidth, alpha: 0.6 + strength * 0.4 })

    // Weak-point arc segments (slowly rotating)
    for (const wp of this._ring.weakPoints) {
      const start = wp.startAngle + this._rotationOffset
      const end = wp.endAngle + this._rotationOffset

      // Open the arc at its computed start point to avoid stray lines
      g.moveTo(cx + r * Math.cos(start), cy + r * Math.sin(start))
      g.arc(cx, cy, r, start, end)
      // Weaker points (lower strength) are more opaque / brighter red
      g.stroke({ color: 0xff2233, width: ringWidth + 1, alpha: 1 - wp.strength })
    }
  }
}
