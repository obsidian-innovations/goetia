import { Container, Graphics, Ticker } from 'pixi.js'

/**
 * Corruption visual overlay — rendered on top of all other canvas layers.
 * Driven by setLevel(0–1); updates on every Ticker tick.
 *
 * Stages:
 *  clean      [0.00 – 0.25) : invisible
 *  tainted    [0.25 – 0.50) : faint red vignette around the edges
 *  compromised[0.50 – 0.80) : scan lines + heavier vignette
 *  vessel     [0.80 – 1.00] : pulsing red-black border + flickering noise
 */
export class CorruptionEffects extends Container {
  private readonly _vignette: Graphics
  private readonly _scanlines: Graphics
  private readonly _border:    Graphics
  private _w: number
  private _h: number
  private _level = 0
  private _time  = 0

  constructor(width: number, height: number) {
    super()
    this._w = width
    this._h = height

    // Vignette drawn behind scan-lines
    this._vignette  = new Graphics()
    this._scanlines = new Graphics()
    this._border    = new Graphics()

    this.addChild(this._vignette)
    this.addChild(this._scanlines)
    this.addChild(this._border)

    // Don't block pointer events
    this.eventMode = 'none'

    Ticker.shared.add(this._onTick)
    this._draw()
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Update the corruption level (0–1). Re-draws immediately. */
  setLevel(level: number): void {
    this._level = Math.max(0, Math.min(1, level))
    this._draw()
  }

  resize(width: number, height: number): void {
    this._w = width
    this._h = height
    this._draw()
  }

  destroy(): void {
    Ticker.shared.remove(this._onTick)
    super.destroy({ children: true })
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private readonly _onTick = (ticker: Ticker): void => {
    this._time += ticker.deltaMS / 1000
    if (this._level >= 0.50) this._draw()  // only animate at tainted+ to avoid overdraw
  }

  private _draw(): void {
    const { _level: lvl, _w: w, _h: h, _time: t } = this

    // ── Vignette (tainted+) ──────────────────────────────────────────────
    this._vignette.clear()
    if (lvl >= 0.25) {
      // intensity ramps from 0 at lvl=0.25 to 0.45 at lvl=1.0
      const intensity = Math.min(0.45, (lvl - 0.25) / 0.75 * 0.45)
      const depth = Math.min(w, h) * 0.55
      this._drawVignette(this._vignette, w, h, depth, 0xcc0000, intensity)
    }

    // ── Scan lines (compromised+) ─────────────────────────────────────────
    this._scanlines.clear()
    if (lvl >= 0.50) {
      const alpha = (lvl - 0.50) / 0.50 * 0.12  // 0 → 0.12
      this._drawScanlines(this._scanlines, w, h, alpha)
    }

    // ── Pulsing border (vessel) ───────────────────────────────────────────
    this._border.clear()
    if (lvl >= 0.80) {
      // pulse between 0.25 and 0.60 alpha
      const pulse = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4.0))
      const vesselIntensity = (lvl - 0.80) / 0.20  // 0→1
      const alpha = pulse * (0.50 + 0.50 * vesselIntensity)
      const bw = Math.max(4, Math.round(w * 0.025))
      this._border.rect(0, 0, w, bw).fill({ color: 0xaa0000, alpha })
      this._border.rect(0, h - bw, w, bw).fill({ color: 0xaa0000, alpha })
      this._border.rect(0, bw, bw, h - bw * 2).fill({ color: 0xaa0000, alpha })
      this._border.rect(w - bw, bw, bw, h - bw * 2).fill({ color: 0xaa0000, alpha })
    }
  }

  private _drawVignette(
    g: Graphics, w: number, h: number, depth: number, color: number, alpha: number,
  ): void {
    // Four gradient-like filled strips at each edge to simulate vignette
    const steps = 6
    for (let s = 0; s < steps; s++) {
      const frac  = s / steps
      const a     = alpha * (1 - frac)
      const inset = depth * frac
      // top strip
      g.rect(inset, inset, w - inset * 2, depth / steps).fill({ color, alpha: a })
      // bottom strip
      g.rect(inset, h - inset - depth / steps, w - inset * 2, depth / steps).fill({ color, alpha: a })
      // left strip
      g.rect(inset, inset, depth / steps, h - inset * 2).fill({ color, alpha: a })
      // right strip
      g.rect(w - inset - depth / steps, inset, depth / steps, h - inset * 2).fill({ color, alpha: a })
    }
  }

  private _drawScanlines(g: Graphics, w: number, h: number, alpha: number): void {
    const stride = 4
    for (let y = 0; y < h; y += stride) {
      g.rect(0, y, w, 1).fill({ color: 0x000000, alpha })
    }
  }
}
