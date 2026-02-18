// ─── Audio event identifiers ─────────────────────────────────────────────────

export type AudioEvent =
  | 'nodeConnect'
  | 'glyphRecognized'
  | 'glyphFailed'
  | 'ringComplete'
  | 'sigilSettle'
  | 'misfire'

// ─── AudioManager ─────────────────────────────────────────────────────────────

/**
 * Synthesised sound effects using the Web Audio API.
 * AudioContext is lazily initialised on the first `play()` call (required by
 * browsers that enforce user-gesture autoplay policies).
 */
export class AudioManager {
  private _ctx: AudioContext | null = null

  // ─── Public API ─────────────────────────────────────────────────────────

  play(event: AudioEvent): void {
    const ctx = this._ensureContext()
    if (!ctx) return
    switch (event) {
      case 'nodeConnect':     this._playNodeConnect(ctx);     break
      case 'glyphRecognized': this._playGlyphRecognized(ctx); break
      case 'glyphFailed':     this._playGlyphFailed(ctx);     break
      case 'ringComplete':    this._playRingComplete(ctx);     break
      case 'sigilSettle':     this._playSigilSettle(ctx);      break
      case 'misfire':         this._playMisfire(ctx);          break
    }
  }

  destroy(): void {
    this._ctx?.close()
    this._ctx = null
  }

  // ─── Sounds ─────────────────────────────────────────────────────────────

  /** Short rising sine blip — seal-node connection confirmed */
  private _playNodeConnect(ctx: AudioContext): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    const t = ctx.currentTime
    osc.frequency.setValueAtTime(280, t)
    osc.frequency.linearRampToValueAtTime(520, t + 0.18)
    gain.gain.setValueAtTime(0.22, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)

    osc.start(t)
    osc.stop(t + 0.22)
  }

  /** Two-note soft chord — glyph recognised */
  private _playGlyphRecognized(ctx: AudioContext): void {
    const t = ctx.currentTime
    for (const freq of [440, 660]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      osc.start(t)
      osc.stop(t + 0.35)
    }
  }

  /** Low, brief thud — glyph not recognised */
  private _playGlyphFailed(ctx: AudioContext): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    const t = ctx.currentTime
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.linearRampToValueAtTime(60, t + 0.08)
    gain.gain.setValueAtTime(0.18, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  /** Ascending sweep — binding ring sealed */
  private _playRingComplete(ctx: AudioContext): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    const t = ctx.currentTime
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.5)
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    osc.start(t)
    osc.stop(t + 0.55)
  }

  /** Rich two-oscillator chord with long fade — sigil composed */
  private _playSigilSettle(ctx: AudioContext): void {
    const t = ctx.currentTime
    for (const [freq, detune] of [[330, 0], [330, 7], [495, 0]] as [number, number][]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = detune
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2)
      osc.start(t)
      osc.stop(t + 1.2)
    }
  }

  /** White-noise burst — action misfired */
  private _playMisfire(ctx: AudioContext): void {
    const bufSize = Math.floor(ctx.sampleRate * 0.1)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.18
    }

    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    src.buffer = buf
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.5

    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    const t = ctx.currentTime
    gain.gain.setValueAtTime(1, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    src.start(t)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private _ensureContext(): AudioContext | null {
    if (this._ctx) return this._ctx
    try {
      this._ctx = new AudioContext()
      return this._ctx
    } catch {
      return null
    }
  }
}

/** Shared singleton for use across the app */
export const audioManager = new AudioManager()
