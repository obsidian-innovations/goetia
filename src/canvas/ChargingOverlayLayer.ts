import { Container, Graphics, Ticker } from 'pixi.js'

// ─── ChargingOverlayLayer ──────────────────────────────────────────────────

/**
 * Visual overlay rendered during sigil charging:
 *  - Pulsing ring whose colour and intensity reflect charge progress
 *  - Decay indicator (red flicker) when attention has lapsed
 *  - Glow intensifies as charge reaches completion
 *
 * All values are driven externally via setters — no internal game logic.
 */
export class ChargingOverlayLayer extends Container {
  private readonly _gfx: Graphics
  private _chargeProgress: number = 0   // 0–1
  private _isDecaying: boolean = false
  private _pulsePhase: number = 0
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

  /** Update the charge progress (0–1) */
  setChargeProgress(progress: number): void {
    this._chargeProgress = Math.max(0, Math.min(1, progress))
  }

  /** Set whether the sigil is decaying due to inattention */
  setDecaying(decaying: boolean): void {
    this._isDecaying = decaying
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
    this._pulsePhase += ticker.deltaTime * 0.025
    this._render()
  }

  private _render(): void {
    const g = this._gfx
    g.clear()

    const cx = this._w / 2
    const cy = this._h / 2
    const shortSide = Math.min(this._w, this._h)
    const baseRadius = shortSide * 0.42

    const progress = this._chargeProgress
    const pulse = 0.5 + 0.5 * Math.sin(this._pulsePhase)

    // ── Progress arc ──────────────────────────────────────────────────────
    // Draw a sweep from top (-π/2) clockwise proportional to progress
    if (progress > 0) {
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + progress * 2 * Math.PI

      // Colour: purple → bright violet as charge grows
      const arcColor = progress >= 0.8 ? 0xdd99ff : progress >= 0.5 ? 0xaa55ee : 0x7722bb
      const arcAlpha = 0.5 + progress * 0.4 + pulse * 0.1

      g.moveTo(cx + baseRadius * Math.cos(startAngle), cy + baseRadius * Math.sin(startAngle))
      g.arc(cx, cy, baseRadius, startAngle, endAngle)
      g.stroke({ color: arcColor, width: 3 + progress * 4, alpha: arcAlpha })
    }

    // ── Outer glow ring (breathes) ────────────────────────────────────────
    const glowAlpha = (0.03 + progress * 0.12) * (0.7 + 0.3 * pulse)
    const glowColor = this._isDecaying ? 0xff3333 : 0x9944cc

    g.circle(cx, cy, baseRadius + 12)
    g.stroke({ color: glowColor, width: 18, alpha: glowAlpha })

    // ── Decay flicker overlay ─────────────────────────────────────────────
    if (this._isDecaying) {
      const flickerAlpha = 0.04 + 0.08 * pulse
      g.circle(cx, cy, baseRadius)
      g.fill({ color: 0xff1111, alpha: flickerAlpha })
    }

    // ── Centre spark at full charge ───────────────────────────────────────
    if (progress >= 1) {
      const sparkAlpha = 0.5 + 0.5 * pulse
      g.circle(cx, cy, 6 + 4 * pulse)
      g.fill({ color: 0xffeeff, alpha: sparkAlpha })
    }
  }
}
