import { Container, Graphics, Ticker } from 'pixi.js'

// ─── DistortionLayer ───────────────────────────────────────────────────────

/**
 * A PixiJS Container that overlays visual interference effects during PvE
 * encounters. Renders animated noise, colour flashes, and edge flickers.
 *
 * Intensity 0 = invisible. Intensity 1 = maximum interference.
 */
export class DistortionLayer extends Container {
  private readonly _gfx: Graphics
  private _intensity = 0
  private _width = 0
  private _height = 0
  private _time = 0
  private _tickerFn: (() => void) | null = null

  constructor(width: number, height: number) {
    super()
    this._width = width
    this._height = height
    this._gfx = new Graphics()
    this.addChild(this._gfx)
    this.visible = false
    this._startTicker()
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Set interference intensity (0–1). 0 hides the layer entirely. */
  setIntensity(intensity: number): void {
    this._intensity = Math.max(0, Math.min(1, intensity))
    this.visible = this._intensity > 0
  }

  resize(width: number, height: number): void {
    this._width = width
    this._height = height
  }

  override destroy(): void {
    this._stopTicker()
    super.destroy()
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  private _startTicker(): void {
    this._tickerFn = () => this._render()
    Ticker.shared.add(this._tickerFn)
  }

  private _stopTicker(): void {
    if (this._tickerFn) {
      Ticker.shared.remove(this._tickerFn)
      this._tickerFn = null
    }
  }

  private _render(): void {
    if (!this.visible || this._intensity <= 0) return

    const dt = Ticker.shared.deltaMS / 1000
    this._time += dt

    const g = this._gfx
    const w = this._width
    const h = this._height
    const i = this._intensity
    const t = this._time

    g.clear()

    // ── Dark vignette overlay ─────────────────────────────────────────────
    const vignetteAlpha = i * 0.35 * (0.85 + 0.15 * Math.sin(t * 1.7))
    g.rect(0, 0, w, h)
    g.fill({ color: 0x110008, alpha: vignetteAlpha })

    // ── Horizontal scan lines (flicker) ──────────────────────────────────
    const lineCount = Math.floor(i * 6)
    for (let l = 0; l < lineCount; l++) {
      const lineY = ((t * 80 + l * (h / lineCount)) % h)
      const lineAlpha = i * 0.12 * (0.5 + 0.5 * Math.sin(t * 3 + l))
      g.rect(0, lineY, w, 2)
      g.fill({ color: 0x440022, alpha: lineAlpha })
    }

    // ── Random noise flashes (high intensity only) ────────────────────────
    if (i > 0.5) {
      const flashCount = Math.floor((i - 0.5) * 8)
      for (let f = 0; f < flashCount; f++) {
        // Use time-seeded pseudo-random positions
        const seed = Math.sin(t * 47 + f * 13)
        const nx = ((seed * 9301 + 49297) % 233280) / 233280
        const ny = ((seed * 1234 + 5678) % 233280) / 233280
        const nr = 2 + nx * 4
        const flashAlpha = (i - 0.5) * 0.4
        g.circle(nx * w, ny * h, nr)
        g.fill({ color: 0xff0044, alpha: flashAlpha })
      }
    }

    // ── Red border pulse ──────────────────────────────────────────────────
    if (i > 0.3) {
      const borderAlpha = (i - 0.3) * 0.5 * (0.7 + 0.3 * Math.sin(t * 2.3))
      const borderWidth = 4 + i * 8
      g.rect(0, 0, w, borderWidth)
      g.rect(0, h - borderWidth, w, borderWidth)
      g.rect(0, 0, borderWidth, h)
      g.rect(w - borderWidth, 0, borderWidth, h)
      g.fill({ color: 0x880022, alpha: borderAlpha })
    }
  }
}
