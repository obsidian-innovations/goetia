import { Application } from 'pixi.js'
import { AtmosphericLayer } from './AtmosphericLayer'
import { SealLayer } from './SealLayer'
import { GlyphLayer } from './GlyphLayer'
import { BindingRingLayer } from './BindingRingLayer'
import { StrokeEvaluator } from '@engine/sigil/StrokeEvaluator'
import { SealReconstructor } from '@engine/sigil/SealReconstructor'
import { GlyphRecognizer } from '@engine/sigil/GlyphRecognizer'
import { BindingRingEvaluator } from '@engine/sigil/BindingRingEvaluator'
import { IntentCoherenceChecker } from '@engine/sigil/IntentCoherenceChecker'
import { SigilComposer } from '@engine/sigil/SigilComposer'
import { getDemon } from '@engine/demons/DemonRegistry'
import { useCanvasStore } from '@stores/canvasStore'
import type { DrawingPhase } from '@stores/canvasStore'
import type {
  NodeId,
  Point,
  PointerInputEvent,
  StrokeResult,
  RingResult,
  Sigil,
} from '@engine/sigil/Types'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Pixel radius within which a pointer-down snaps to a seal node */
const SNAP_THRESHOLD_PX = 44

/** Minimum stroke total-length (px) below which we discard the stroke */
const MIN_STROKE_PX = 20

// ─── RitualCanvas ─────────────────────────────────────────────────────────

/**
 * Central orchestrator that wires together the four PixiJS canvas layers
 * and the three engine evaluators.
 *
 * Pointer event routing by phase:
 *  - SEAL  → SealReconstructor
 *  - GLYPH → GlyphRecognizer
 *  - RING  → BindingRingEvaluator
 *
 * All coordinates from the DOM are in CSS-pixel space. Normalization to
 * [0, 1] is applied here before engine calls (per architecture contract).
 */
export class RitualCanvas {
  private readonly _app: Application

  // Layers
  private readonly _atmospheric: AtmosphericLayer
  private readonly _sealLayer: SealLayer
  private readonly _glyphLayer: GlyphLayer
  private readonly _ringLayer: BindingRingLayer

  // Engine evaluators (stateless or long-lived)
  private readonly _evaluator = new StrokeEvaluator()
  private readonly _glyphRecognizer = new GlyphRecognizer()
  private readonly _ringEvaluator = new BindingRingEvaluator()
  private readonly _coherenceChecker = new IntentCoherenceChecker()

  // Per-demon state
  private _sealReconstructor: SealReconstructor | null = null

  // Pointer state
  private _isDrawing = false
  private _pendingFromNode: NodeId | null = null
  /** Raw pixel-space points collected this stroke — used for layer active-stroke display */
  private _activePixelPts: Point[] = []

  // ─── Constructor ────────────────────────────────────────────────────────

  constructor(app: Application) {
    this._app = app
    const w = app.canvas.width
    const h = app.canvas.height

    this._atmospheric = new AtmosphericLayer(w, h)
    this._sealLayer = new SealLayer(w, h)
    this._glyphLayer = new GlyphLayer(w, h)
    this._ringLayer = new BindingRingLayer(w, h)

    app.stage.addChild(this._atmospheric)
    app.stage.addChild(this._sealLayer)
    app.stage.addChild(this._glyphLayer)
    app.stage.addChild(this._ringLayer)

    this._bindEvents()
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Load a demon: create SealReconstructor, set geometry on SealLayer, reset store. */
  setDemon(demonId: string): void {
    this._sealReconstructor = new SealReconstructor(demonId)
    const demon = getDemon(demonId)

    this._sealLayer.setGeometry(demon.sealGeometry)
    this._glyphLayer.clearActiveStroke()
    this._ringLayer.clearRing()

    // Reset glyph layer visual to empty
    const emptyCoherence = this._coherenceChecker.checkCoherence([])
    this._glyphLayer.setGlyphs([], emptyCoherence)

    useCanvasStore.getState().selectDemon(demonId)
  }

  /** Switch drawing phase; resets in-progress stroke. */
  setPhase(phase: DrawingPhase): void {
    this._cancelStroke()
    useCanvasStore.getState().setPhase(phase)
  }

  /**
   * Compose a Sigil from the current store state and save it.
   * Returns null if the ritual is incomplete (no ring yet).
   */
  composeSigil(): Sigil | null {
    const store = useCanvasStore.getState()
    if (!store.currentDemonId || !store.ringResult) return null

    const composer = new SigilComposer(store.currentDemonId)
    composer.setSealIntegrity(store.sealIntegrity, store.completedConnections)
    for (const g of store.placedGlyphs) {
      composer.addGlyph(g)
    }
    composer.setBindingRing(store.ringResult)

    const sigil = composer.compose()
    store.setComposedSigil(sigil)
    return sigil
  }

  resize(width: number, height: number): void {
    this._atmospheric.resize(width, height)
    this._sealLayer.resize(width, height)
    this._glyphLayer.resize(width, height)
    this._ringLayer.resize(width, height)
  }

  destroy(): void {
    this._unbindEvents()
    this._atmospheric.destroy()
    this._sealLayer.destroy()
    this._glyphLayer.destroy()
    this._ringLayer.destroy()
  }

  // ─── Event binding ───────────────────────────────────────────────────────

  private _bindEvents(): void {
    const c = this._app.canvas
    c.addEventListener('pointerdown', this._onDown)
    c.addEventListener('pointermove', this._onMove)
    c.addEventListener('pointerup', this._onUp)
    c.addEventListener('pointercancel', this._onCancel)
  }

  private _unbindEvents(): void {
    const c = this._app.canvas
    c.removeEventListener('pointerdown', this._onDown)
    c.removeEventListener('pointermove', this._onMove)
    c.removeEventListener('pointerup', this._onUp)
    c.removeEventListener('pointercancel', this._onCancel)
  }

  // ─── Pointer handlers ────────────────────────────────────────────────────

  private _onDown = (e: PointerEvent): void => {
    const pt = this._toCanvasPoint(e)
    const phase = useCanvasStore.getState().currentPhase

    this._evaluator.reset()
    this._activePixelPts = [pt]
    this._isDrawing = true
    this._evaluator.addPoint(this._toInputEvent(pt, e))

    if (phase === 'SEAL') {
      this._pendingFromNode = this._sealLayer.getNearestNodeId(pt, SNAP_THRESHOLD_PX)
    }
  }

  private _onMove = (e: PointerEvent): void => {
    if (!this._isDrawing) return
    const pt = this._toCanvasPoint(e)
    const phase = useCanvasStore.getState().currentPhase

    this._evaluator.addPoint(this._toInputEvent(pt, e))
    this._activePixelPts.push(pt)

    const normPts = this._activePixelPts.map(p => this._normPt(p))

    if (phase === 'SEAL') {
      this._sealLayer.setActiveStroke(normPts)
    } else if (phase === 'GLYPH') {
      this._glyphLayer.setActiveStroke(normPts)
    }
    // RING: no in-progress visual; ring renders on completion
  }

  private _onUp = (e: PointerEvent): void => {
    if (!this._isDrawing) return
    const pt = this._toCanvasPoint(e)
    const phase = useCanvasStore.getState().currentPhase

    this._evaluator.addPoint(this._toInputEvent(pt, e))
    this._isDrawing = false

    const stroke = this._evaluator.finalize()
    this._evaluator.reset()
    this._sealLayer.clearActiveStroke()
    this._glyphLayer.clearActiveStroke()
    this._activePixelPts = []

    if (stroke.totalLength < MIN_STROKE_PX) return

    if (phase === 'SEAL') {
      this._handleSeal(pt, stroke)
    } else if (phase === 'GLYPH') {
      this._handleGlyph(stroke)
    } else if (phase === 'RING') {
      this._handleRing(stroke)
    }
  }

  private _onCancel = (_e: PointerEvent): void => {
    this._cancelStroke()
  }

  // ─── Phase logic ─────────────────────────────────────────────────────────

  private _handleSeal(endPt: Point, stroke: StrokeResult): void {
    if (!this._sealReconstructor) return
    const fromNode = this._pendingFromNode
    const toNode = this._sealLayer.getNearestNodeId(endPt, SNAP_THRESHOLD_PX)
    this._pendingFromNode = null

    if (!fromNode || !toNode || fromNode === toNode) return

    // SealReconstructor normalises internally via normalizePathToUnitSpace
    const result = this._sealReconstructor.attemptConnection(fromNode, toNode, stroke)

    const store = useCanvasStore.getState()
    store.addConnection(result)
    store.updateSealIntegrity(this._sealReconstructor.getSealIntegrity())

    const connections = this._sealReconstructor.getCompletedConnections()
    this._sealLayer.setConnections(connections)
  }

  private _handleGlyph(stroke: StrokeResult): void {
    // GlyphRecognizer normalises internally; pixel-space input is fine
    const result = this._glyphRecognizer.recognize([stroke])
    if (!result.recognized) return

    const w = this._app.canvas.width
    const h = this._app.canvas.height
    const pts = stroke.pathPoints
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length / w
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length / h

    const glyph = {
      glyphId: result.recognized,
      position: { x: cx, y: cy },
      confidence: result.confidence,
      timestamp: Date.now(),
    }

    const store = useCanvasStore.getState()
    store.addGlyph(glyph)

    // Compute coherence over the updated glyph set
    const updatedGlyphs = useCanvasStore.getState().placedGlyphs
    const coherence = this._coherenceChecker.checkCoherence(updatedGlyphs)
    store.setCoherence(coherence)
    this._glyphLayer.setGlyphs(updatedGlyphs, coherence)
  }

  private _handleRing(stroke: StrokeResult): void {
    // Evaluate in pixel space for accurate circle fitting
    const result = this._ringEvaluator.evaluate(stroke)

    const w = this._app.canvas.width
    const h = this._app.canvas.height
    const minDim = Math.min(w, h)

    // Normalise center to [0,1] and radius to units of min(w,h)
    const normalised: RingResult = {
      ...result,
      center: {
        x: result.center.x / w,
        y: result.center.y / h,
      },
      radius: result.radius / minDim,
    }

    useCanvasStore.getState().setRingResult(normalised)
    this._ringLayer.setRing(normalised)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private _cancelStroke(): void {
    this._isDrawing = false
    this._pendingFromNode = null
    this._activePixelPts = []
    this._evaluator.reset()
    this._sealLayer.clearActiveStroke()
    this._glyphLayer.clearActiveStroke()
  }

  /** Translate a DOM PointerEvent to canvas pixel coordinates (handles DPR). */
  private _toCanvasPoint(e: PointerEvent): Point {
    const rect = this._app.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    }
  }

  /** Normalise a pixel-space point to [0, 1]. */
  private _normPt(pt: Point): Point {
    return {
      x: pt.x / this._app.canvas.width,
      y: pt.y / this._app.canvas.height,
    }
  }

  /** Convert a canvas pixel point + PointerEvent metadata to a PointerInputEvent. */
  private _toInputEvent(pt: Point, e: PointerEvent): PointerInputEvent {
    return {
      x: pt.x,
      y: pt.y,
      pressure: e.pressure,
      timestamp: e.timeStamp,
      pointerId: e.pointerId,
    }
  }
}
