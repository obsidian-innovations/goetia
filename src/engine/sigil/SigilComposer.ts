import {
  ConnectionResult,
  GlyphId,
  IntentCoherenceResult,
  PlacedGlyph,
  RingResult,
  Sigil,
  SigilVisualState,
} from './Types'
import { IntentCoherenceChecker } from './IntentCoherenceChecker'

// ─── Internal state snapshot (pre-compose) ─────────────────────────────────

export type SigilSnapshot = {
  demonId: string
  sealIntegrity: number
  completedConnections: ConnectionResult[]
  glyphs: PlacedGlyph[]
  intentCoherence: IntentCoherenceResult
  bindingRing: RingResult | null
}

// ─── SigilComposer ─────────────────────────────────────────────────────────

export class SigilComposer {
  private readonly _demonId: string
  private readonly _checker = new IntentCoherenceChecker()

  private _sealIntegrity: number = 0
  private _completedConnections: ConnectionResult[] = []
  private _glyphs: Map<GlyphId, PlacedGlyph> = new Map()
  private _bindingRing: RingResult | null = null

  constructor(demonId: string) {
    this._demonId = demonId
  }

  // ─── Mutators ─────────────────────────────────────────────────────────────

  setSealIntegrity(integrity: number, connections: ConnectionResult[]): void {
    this._sealIntegrity = integrity
    this._completedConnections = connections
  }

  addGlyph(glyph: PlacedGlyph): void {
    // Replaces any existing glyph with the same id
    this._glyphs.set(glyph.glyphId, glyph)
  }

  removeGlyph(glyphId: GlyphId): void {
    this._glyphs.delete(glyphId)
  }

  setBindingRing(ring: RingResult): void {
    this._bindingRing = ring
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  getCurrentIntentCoherence(): IntentCoherenceResult {
    return this._checker.checkCoherence(Array.from(this._glyphs.values()))
  }

  getSnapshot(): SigilSnapshot {
    return {
      demonId: this._demonId,
      sealIntegrity: this._sealIntegrity,
      completedConnections: [...this._completedConnections],
      glyphs: Array.from(this._glyphs.values()),
      intentCoherence: this.getCurrentIntentCoherence(),
      bindingRing: this._bindingRing,
    }
  }

  // ─── Compose ──────────────────────────────────────────────────────────────

  /**
   * Produces a finalised Sigil from the current builder state.
   *
   * Overall integrity = seal × 0.40 + coherence × 0.35 + ring × 0.25
   *
   * Visual state thresholds:
   *   - No ring          → dormant
   *   - overall ≥ 0.85   → charged
   *   - overall ≥ 0.60   → healthy
   *   - overall ≥ 0.30   → unstable
   *   - overall < 0.30   → corrupted
   */
  compose(): Sigil {
    const coherence = this.getCurrentIntentCoherence()
    const ringStrength = this._bindingRing?.overallStrength ?? 0

    const overallIntegrity =
      this._sealIntegrity * 0.40 +
      coherence.score * 0.35 +
      ringStrength * 0.25

    const visualState = this._computeVisualState(overallIntegrity)

    return {
      id: `sigil-${this._demonId}-${Date.now()}`,
      demonId: this._demonId,
      sealIntegrity: this._sealIntegrity,
      completedConnections: [...this._completedConnections],
      glyphs: Array.from(this._glyphs.values()),
      intentCoherence: coherence,
      bindingRing: this._bindingRing,
      overallIntegrity,
      visualState,
      status: 'draft',
      createdAt: Date.now(),
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _computeVisualState(overall: number): SigilVisualState {
    if (this._bindingRing === null) return 'dormant'
    if (overall >= 0.85) return 'charged'
    if (overall >= 0.60) return 'healthy'
    if (overall >= 0.30) return 'unstable'
    return 'corrupted'
  }
}
