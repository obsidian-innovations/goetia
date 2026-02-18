import { Container, Graphics, Ticker } from 'pixi.js'

// ─── Particle ──────────────────────────────────────────────────────────────

interface Particle {
  gfx: Graphics
  vx: number
  vy: number
  baseAlpha: number
  /** Phase offset for the per-particle flicker cycle */
  phase: number
}

// ─── AtmosphericLayer ──────────────────────────────────────────────────────

/**
 * Dark background + 8 drifting/flickering ambient particles.
 * The container itself breathes (alpha oscillates) on each ticker tick.
 */
export class AtmosphericLayer extends Container {
  private readonly _bg: Graphics
  private readonly _particles: Particle[] = []
  private _w: number
  private _h: number
  private _time = 0

  constructor(width: number, height: number) {
    super()
    this._w = width
    this._h = height

    this._bg = new Graphics()
    this.addChild(this._bg)
    this._drawBg()
    this._spawnParticles()

    Ticker.shared.add(this._onTick)
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this._w = width
    this._h = height
    this._drawBg()
  }

  override destroy(): void {
    Ticker.shared.remove(this._onTick)
    super.destroy({ children: true })
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _drawBg(): void {
    this._bg.clear()
    this._bg.rect(0, 0, this._w, this._h).fill({ color: 0x08070f })
  }

  private _spawnParticles(): void {
    const PARTICLE_COUNT = 8
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const gfx = new Graphics()
      gfx.circle(0, 0, 2 + Math.random() * 2).fill({ color: 0x7744bb })
      const particle: Particle = {
        gfx,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseAlpha: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      }
      gfx.x = Math.random() * this._w
      gfx.y = Math.random() * this._h
      gfx.alpha = particle.baseAlpha
      this.addChild(gfx)
      this._particles.push(particle)
    }
  }

  private _onTick = (ticker: Ticker): void => {
    const dt = ticker.deltaTime
    this._time += dt * 0.018

    // Container breathing
    this.alpha = 0.88 + Math.sin(this._time) * 0.12

    // Drift and flicker each particle
    for (const p of this._particles) {
      p.gfx.x += p.vx * dt
      p.gfx.y += p.vy * dt

      // Wrap around edges
      if (p.gfx.x < 0) p.gfx.x += this._w
      else if (p.gfx.x > this._w) p.gfx.x -= this._w
      if (p.gfx.y < 0) p.gfx.y += this._h
      else if (p.gfx.y > this._h) p.gfx.y -= this._h

      p.gfx.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(this._time * 2.8 + p.phase))
    }
  }
}
