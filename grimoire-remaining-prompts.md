# Grimoire — Remaining Prompts (7a–15)

---

## Prompt 7a — Coherence Rules Data

```
Create src/engine/sigil/CoherenceRules.ts with exactly this content:

export const COHERENCE_RULES = {
  contradictions: [
    { glyphA: 'VECTOR_OUT',       glyphB: 'VECTOR_IN' },
    { glyphA: 'QUALITY_SHARP',    glyphB: 'QUALITY_SUSTAIN' },
    { glyphA: 'DURATION_INSTANT', glyphB: 'DURATION_SUSTAINED' },
    { glyphA: 'DURATION_INSTANT', glyphB: 'DURATION_TRIGGERED' },
    { glyphA: 'VECTOR_DIFFUSE',   glyphB: 'QUALITY_SHARP' },
  ],
  chainRequirements: [
    {
      name: 'vector',
      requiredOneOf: ['VECTOR_OUT', 'VECTOR_IN', 'VECTOR_DIFFUSE']
    },
    {
      name: 'target',
      requiredOneOf: ['TARGET_PERSON', 'TARGET_PLACE', 'TARGET_OBJECT']
    }
  ],
  isolatedCategories: [
    'QUALITY_SHARP',
    'QUALITY_SUSTAIN',
    'QUALITY_DELAY',
    'DURATION_INSTANT',
    'DURATION_SUSTAINED',
    'DURATION_TRIGGERED',
  ]
} as const
```

---

## Prompt 7b — Intent Coherence Checker

```
In src/engine/sigil/ create IntentCoherenceChecker.ts.

Dependencies — import only these:
  GlyphId, PlacedGlyph, IntentCoherenceResult from './Types'
  COHERENCE_RULES from './CoherenceRules'

Implement this single exported function:

export function checkCoherence(
  glyphs: PlacedGlyph[]
): IntentCoherenceResult

  const glyphIds = glyphs.map(g => g.glyphId as string)

  Step 1 — Find contradictions:
    const contradictions: Array<[GlyphId, GlyphId]> = []
    for (const rule of COHERENCE_RULES.contradictions) {
      const hasA = glyphIds.includes(rule.glyphA)
      const hasB = glyphIds.includes(rule.glyphB)
      if (hasA && hasB) {
        contradictions.push([rule.glyphA as GlyphId, rule.glyphB as GlyphId])
      }
    }

  Step 2 — Find incomplete chains:
    const incompleteChains: GlyphId[][] = []
    for (const req of COHERENCE_RULES.chainRequirements) {
      const satisfied = req.requiredOneOf.some(id => glyphIds.includes(id))
      if (!satisfied) {
        incompleteChains.push(req.requiredOneOf as unknown as GlyphId[])
      }
    }

  Step 3 — Find isolated glyphs:
    const hasVector = COHERENCE_RULES.chainRequirements
      .find(r => r.name === 'vector')!
      .requiredOneOf.some(id => glyphIds.includes(id))

    const isolatedGlyphs: GlyphId[] = []
    if (!hasVector) {
      for (const id of glyphIds) {
        if ((COHERENCE_RULES.isolatedCategories as readonly string[]).includes(id)) {
          isolatedGlyphs.push(id as unknown as GlyphId)
        }
      }
    }

  Step 4 — Compute score:
    let score = 1.0
    score -= contradictions.length * 0.25
    score -= incompleteChains.length * 0.20
    score -= isolatedGlyphs.length * 0.10
    score = Math.max(0, Math.min(1, score))
    score = Math.round(score * 1000) / 1000

  Return: { score, contradictions, incompleteChains, isolatedGlyphs }

Create IntentCoherenceChecker.test.ts using vitest.

Import:
  checkCoherence from './IntentCoherenceChecker'
  GLYPHS from './GlyphLibrary'
  PlacedGlyph, GlyphId from './Types'

Helper — makePlacedGlyph(id: string): PlacedGlyph:
  return {
    glyphId: id as unknown as GlyphId,
    position: { x: 0.5, y: 0.5 },
    confidence: 0.9,
    timestamp: Date.now()
  }

Test: empty glyphs returns score 0.60
  const result = checkCoherence([])
  expect(result.score).toBeCloseTo(0.60, 2)
  expect(result.incompleteChains.length).toBe(2)

Test: VECTOR_OUT + TARGET_PERSON returns score 1.0
  const glyphs = [
    makePlacedGlyph(GLYPHS.VECTOR_OUT),
    makePlacedGlyph(GLYPHS.TARGET_PERSON)
  ]
  const result = checkCoherence(glyphs)
  expect(result.score).toBe(1.0)
  expect(result.contradictions.length).toBe(0)

Test: VECTOR_OUT + VECTOR_IN contradiction reduces score
  const glyphs = [
    makePlacedGlyph(GLYPHS.VECTOR_OUT),
    makePlacedGlyph(GLYPHS.VECTOR_IN),
    makePlacedGlyph(GLYPHS.TARGET_PERSON)
  ]
  const result = checkCoherence(glyphs)
  expect(result.contradictions.length).toBe(1)
  expect(result.score).toBeCloseTo(0.75, 2)

Test: score never goes below 0
  const glyphs = [
    makePlacedGlyph(GLYPHS.VECTOR_OUT),
    makePlacedGlyph(GLYPHS.VECTOR_IN),
    makePlacedGlyph(GLYPHS.QUALITY_SHARP),
    makePlacedGlyph(GLYPHS.QUALITY_SUSTAIN),
    makePlacedGlyph(GLYPHS.DURATION_INSTANT),
    makePlacedGlyph(GLYPHS.DURATION_SUSTAINED)
  ]
  const result = checkCoherence(glyphs)
  expect(result.score).toBeGreaterThanOrEqual(0)
```

---

## Prompt 7c — Sigil Composer State

```
In src/engine/sigil/ create SigilComposer.ts.

Dependencies — import only these:
  Sigil, SigilStatus, SigilVisualState, PlacedGlyph,
  GlyphId, ConnectionResult, RingResult,
  IntentCoherenceResult from './Types'
  checkCoherence from './IntentCoherenceChecker'

Implement class SigilComposer with only these methods.
Do not implement compose() yet.

private demonId: string
private sealIntegrity: number
private completedConnections: ConnectionResult[]
private glyphs: PlacedGlyph[]
private bindingRing: RingResult | null

constructor(demonId: string)
  this.demonId = demonId
  this.sealIntegrity = 0
  this.completedConnections = []
  this.glyphs = []
  this.bindingRing = null

setSealIntegrity(score: number, connections: ConnectionResult[]): void
  this.sealIntegrity = Math.max(0, Math.min(1, score))
  this.completedConnections = [...connections]

addGlyph(glyph: PlacedGlyph): void
  this.glyphs = this.glyphs.filter(g => g.glyphId !== glyph.glyphId)
  this.glyphs.push(glyph)

removeGlyph(glyphId: GlyphId): void
  this.glyphs = this.glyphs.filter(g => g.glyphId !== glyphId)

setBindingRing(ring: RingResult): void
  this.bindingRing = ring

getCurrentIntentCoherence(): IntentCoherenceResult
  return checkCoherence(this.glyphs)

getSnapshot(): { demonId: string; sealIntegrity: number; glyphCount: number; hasRing: boolean }
  return {
    demonId: this.demonId,
    sealIntegrity: this.sealIntegrity,
    glyphCount: this.glyphs.length,
    hasRing: this.bindingRing !== null
  }

Create SigilComposer.test.ts using vitest.

Helper — makePlacedGlyph(id: string): PlacedGlyph:
  return { glyphId: id as unknown as GlyphId, position: { x: 0.5, y: 0.5 }, confidence: 0.9, timestamp: Date.now() }

Helper — makeRingResult(): RingResult:
  return { circularity: 0.9, closure: 0.9, consistency: 0.7, overallStrength: 0.85, weakPoints: [], center: { x: 200, y: 200 }, radius: 100 }

Test: constructor initializes empty state
  const c = new SigilComposer('bael')
  const s = c.getSnapshot()
  expect(s.demonId).toBe('bael')
  expect(s.glyphCount).toBe(0)
  expect(s.hasRing).toBe(false)

Test: addGlyph replaces glyph with same id
  const c = new SigilComposer('bael')
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  expect(c.getSnapshot().glyphCount).toBe(1)

Test: removeGlyph removes the glyph
  const c = new SigilComposer('bael')
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  c.removeGlyph('VECTOR_OUT' as unknown as GlyphId)
  expect(c.getSnapshot().glyphCount).toBe(0)

Test: setBindingRing sets hasRing true
  const c = new SigilComposer('bael')
  c.setBindingRing(makeRingResult())
  expect(c.getSnapshot().hasRing).toBe(true)
```

---

## Prompt 7d — Sigil Composer compose()

```
Add the compose() method to SigilComposer in
src/engine/sigil/SigilComposer.ts.
Do not modify any existing methods.

compose(): Sigil

  const coherence = checkCoherence(this.glyphs)
  const ringStrength = this.bindingRing?.overallStrength ?? 0
  const overallIntegrity =
    this.sealIntegrity * 0.40 +
    coherence.score * 0.35 +
    ringStrength * 0.25
  const integrity = Math.round(overallIntegrity * 1000) / 1000

  let visualState: SigilVisualState
  if (this.bindingRing === null) {
    visualState = 'dormant'
  } else if (integrity >= 0.85) {
    visualState = 'charged'
  } else if (integrity >= 0.60) {
    visualState = 'healthy'
  } else if (integrity >= 0.30) {
    visualState = 'unstable'
  } else {
    visualState = 'corrupted'
  }

  const status: SigilStatus = integrity >= 0.20 ? 'complete' : 'draft'

  return {
    id: crypto.randomUUID(),
    demonId: this.demonId,
    sealIntegrity: this.sealIntegrity,
    completedConnections: [...this.completedConnections],
    glyphs: [...this.glyphs],
    intentCoherence: coherence,
    bindingRing: this.bindingRing,
    overallIntegrity: integrity,
    visualState,
    status,
    createdAt: Date.now()
  }

Add these tests to SigilComposer.test.ts. Do not remove existing tests.

Helper — makeFullComposer(): SigilComposer
  const c = new SigilComposer('bael')
  c.setSealIntegrity(0.9, [])
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  c.addGlyph(makePlacedGlyph('TARGET_PERSON'))
  c.setBindingRing(makeRingResult())
  return c

Test: compose() returns valid Sigil shape
  const sigil = makeFullComposer().compose()
  expect(typeof sigil.id).toBe('string')
  expect(sigil.demonId).toBe('bael')
  expect(typeof sigil.overallIntegrity).toBe('number')

Test: high integrity produces 'charged' visual state
  const sigil = makeFullComposer().compose()
  expect(sigil.visualState).toBe('charged')

Test: no ring produces 'dormant' visual state
  const c = new SigilComposer('bael')
  c.setSealIntegrity(0.9, [])
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  c.addGlyph(makePlacedGlyph('TARGET_PERSON'))
  expect(c.compose().visualState).toBe('dormant')

Test: compose() twice produces different ids
  const c = makeFullComposer()
  expect(c.compose().id).not.toBe(c.compose().id)

Test: perfect inputs produce integrity 1.0
  const c = new SigilComposer('bael')
  c.setSealIntegrity(1.0, [])
  c.addGlyph(makePlacedGlyph('VECTOR_OUT'))
  c.addGlyph(makePlacedGlyph('TARGET_PERSON'))
  c.setBindingRing({ circularity: 1, closure: 1, consistency: 1, overallStrength: 1, weakPoints: [], center: { x: 0, y: 0 }, radius: 100 })
  expect(c.compose().overallIntegrity).toBeCloseTo(1.0, 2)
```

---

## Prompt 8 — Grimoire Persistence

```
In src/db/ create grimoire.ts.

No external dependencies. Uses localStorage only.

Define these interfaces locally:

interface GrimoirePageRecord {
  id: string
  demonId: string
  sigils: Sigil[]
  researchProgress: number
  createdAt: number
  updatedAt: number
}

interface GrimoireStore {
  pages: Record<string, GrimoirePageRecord>
  version: number
}

Import Sigil, SigilStatus from '../engine/sigil/Types'

Implement class GrimoireDB:

private readonly STORAGE_KEY = 'grimoire_v1'

private load(): GrimoireStore
  const raw = localStorage.getItem(this.STORAGE_KEY)
  if (!raw) return { pages: {}, version: 1 }
  try { return JSON.parse(raw) }
  catch { return { pages: {}, version: 1 } }

private persist(store: GrimoireStore): void
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store))

getAll(): GrimoirePageRecord[]
  return Object.values(this.load().pages)

getPage(demonId: string): GrimoirePageRecord | null
  return this.load().pages[demonId] ?? null

getOrCreatePage(demonId: string): GrimoirePageRecord
  const store = this.load()
  if (!store.pages[demonId]) {
    store.pages[demonId] = {
      id: crypto.randomUUID(),
      demonId,
      sigils: [],
      researchProgress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    this.persist(store)
  }
  return store.pages[demonId]

saveSigil(demonId: string, sigil: Sigil): void
  const store = this.load()
  if (!store.pages[demonId]) this.getOrCreatePage(demonId)
  const fresh = this.load()
  fresh.pages[demonId].sigils.push(sigil)
  fresh.pages[demonId].updatedAt = Date.now()
  this.persist(fresh)

updateSigilStatus(demonId: string, sigilId: string, status: SigilStatus): void
  const VALID_TRANSITIONS: Record<SigilStatus, SigilStatus | null> = {
    draft: 'complete',
    complete: 'resting',
    resting: 'awakened',
    awakened: 'charged',
    charged: 'spent',
    spent: null
  }
  const store = this.load()
  const page = store.pages[demonId]
  if (!page) throw new Error(`No page for demon: ${demonId}`)
  const sigil = page.sigils.find(s => s.id === sigilId)
  if (!sigil) throw new Error(`No sigil: ${sigilId}`)
  if (VALID_TRANSITIONS[sigil.status] !== status) {
    throw new Error(`Invalid transition: ${sigil.status} -> ${status}`)
  }
  sigil.status = status
  page.updatedAt = Date.now()
  this.persist(store)

deleteSigil(demonId: string, sigilId: string): void
  const store = this.load()
  const page = store.pages[demonId]
  if (!page) return
  page.sigils = page.sigils.filter(s => s.id !== sigilId)
  page.updatedAt = Date.now()
  this.persist(store)

clearAll(): void
  localStorage.removeItem(this.STORAGE_KEY)

Export a singleton:
export const grimoireDB = new GrimoireDB()
```

---

## Prompt 9 — Grimoire Store

```
In src/stores/ create grimoireStore.ts using Zustand.

Import:
  create from 'zustand'
  grimoireDB from '../db/grimoire'
  Sigil, SigilStatus from '../engine/sigil/Types'

Define GrimoirePageRecord inline (same shape as in grimoire.ts):
  { id: string; demonId: string; sigils: Sigil[]; researchProgress: number; createdAt: number; updatedAt: number }

interface GrimoireState {
  pages: GrimoirePageRecord[]
  isLoaded: boolean
  load: () => void
  saveSigil: (demonId: string, sigil: Sigil) => void
  updateSigilStatus: (demonId: string, sigilId: string, status: SigilStatus) => void
  getPageForDemon: (demonId: string) => GrimoirePageRecord | null
}

export const useGrimoireStore = create<GrimoireState>((set, get) => ({
  pages: [],
  isLoaded: false,

  load: () => {
    const pages = grimoireDB.getAll()
    set({ pages, isLoaded: true })
  },

  saveSigil: (demonId, sigil) => {
    grimoireDB.saveSigil(demonId, sigil)
    set({ pages: grimoireDB.getAll() })
  },

  updateSigilStatus: (demonId, sigilId, status) => {
    grimoireDB.updateSigilStatus(demonId, sigilId, status)
    set({ pages: grimoireDB.getAll() })
  },

  getPageForDemon: (demonId) => {
    return get().pages.find(p => p.demonId === demonId) ?? null
  }
}))
```

---

## Prompt 10 — Canvas Store

```
In src/stores/ create canvasStore.ts using Zustand.

Import:
  create from 'zustand'
  ConnectionResult, PlacedGlyph, GlyphId, RingResult,
  IntentCoherenceResult, Sigil from '../engine/sigil/Types'

type DrawingPhase = 'SEAL' | 'GLYPH' | 'RING' | 'COMPLETE'

interface CanvasState {
  currentDemonId: string | null
  currentPhase: DrawingPhase
  completedConnections: ConnectionResult[]
  sealIntegrity: number
  placedGlyphs: PlacedGlyph[]
  coherenceResult: IntentCoherenceResult | null
  ringResult: RingResult | null
  composedSigil: Sigil | null

  selectDemon: (id: string) => void
  addConnection: (result: ConnectionResult) => void
  updateSealIntegrity: (score: number) => void
  addGlyph: (glyph: PlacedGlyph) => void
  removeGlyph: (id: GlyphId) => void
  setCoherence: (result: IntentCoherenceResult) => void
  setRingResult: (ring: RingResult) => void
  setPhase: (phase: DrawingPhase) => void
  setComposedSigil: (sigil: Sigil) => void
  resetCanvas: () => void
}

const initialState = {
  currentDemonId: null,
  currentPhase: 'SEAL' as DrawingPhase,
  completedConnections: [],
  sealIntegrity: 0,
  placedGlyphs: [],
  coherenceResult: null,
  ringResult: null,
  composedSigil: null
}

export const useCanvasStore = create<CanvasState>((set) => ({
  ...initialState,

  selectDemon: (id) => set({ ...initialState, currentDemonId: id }),
  addConnection: (result) => set(s => ({ completedConnections: [...s.completedConnections, result] })),
  updateSealIntegrity: (score) => set({ sealIntegrity: score }),
  addGlyph: (glyph) => set(s => ({
    placedGlyphs: [
      ...s.placedGlyphs.filter(g => g.glyphId !== glyph.glyphId),
      glyph
    ]
  })),
  removeGlyph: (id) => set(s => ({ placedGlyphs: s.placedGlyphs.filter(g => g.glyphId !== id) })),
  setCoherence: (result) => set({ coherenceResult: result }),
  setRingResult: (ring) => set({ ringResult: ring }),
  setPhase: (phase) => set({ currentPhase: phase }),
  setComposedSigil: (sigil) => set({ composedSigil: sigil }),
  resetCanvas: () => set(initialState)
}))

Export DrawingPhase type.
```

---

## Prompt 11 — Atmospheric Layer

```
In src/canvas/ create AtmosphericLayer.ts.

Import from 'pixi.js': Container, Graphics, Ticker

export class AtmosphericLayer extends Container {

  private bg: Graphics
  private particles: Array<{
    g: Graphics
    x: number
    y: number
    vx: number
    vy: number
    baseAlpha: number
    phase: number
    speed: number
  }>
  private breathPhase = 0
  private w: number
  private h: number

  constructor(width: number, height: number) {
    super()
    this.w = width
    this.h = height
    this.bg = new Graphics()
    this.addChild(this.bg)
    this.drawBackground()
    this.particles = []
    this.initParticles()
    Ticker.shared.add(this.update, this)
  }

  private drawBackground(): void
    this.bg.clear()
    this.bg.rect(0, 0, this.w, this.h).fill(0x0a0508)

  private initParticles(): void
    Remove all existing particle graphics from stage.
    Clear this.particles array.
    Create 8 particles. For each:
      const g = new Graphics()
      g.circle(0, 0, 1.5).fill(0x3d0a1a)
      this.addChild(g)
      Push to this.particles: {
        g,
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        baseAlpha: 0.05 + Math.random() * 0.10,
        phase: Math.random() * Math.PI * 2,
        speed: 3 + Math.random() * 4
      }

  private update = (ticker: Ticker): void => {
    const delta = ticker.deltaTime

    this.breathPhase += delta * 0.008
    this.alpha = 0.92 + Math.sin(this.breathPhase) * 0.04

    for (const p of this.particles) {
      p.x += p.vx * delta
      p.y += p.vy * delta
      if (p.x < 0) p.x += this.w
      if (p.x > this.w) p.x -= this.w
      if (p.y < 0) p.y += this.h
      if (p.y > this.h) p.y -= this.h
      p.phase += delta / (p.speed * 60)
      p.g.x = p.x
      p.g.y = p.y
      p.g.alpha = p.baseAlpha + Math.sin(p.phase) * 0.03
    }
  }

  resize(width: number, height: number): void
    this.w = width
    this.h = height
    this.drawBackground()
    for (const p of this.particles) {
      p.x = Math.random() * width
      p.y = Math.random() * height
    }

  destroy(): void
    Ticker.shared.remove(this.update, this)
    super.destroy({ children: true })
}
```

---

## Prompt 12 — Seal Layer

```
In src/canvas/ create SealLayer.ts.

Import from 'pixi.js': Container, Graphics, Ticker
Import: Point, NodeId, ConnectionResult, SealGeometry from '../engine/sigil/Types'
Import: getDemon from '../engine/demons/DemonRegistry'

export class SealLayer extends Container {

  private geometry: SealGeometry
  private ghostGraphics: Graphics
  private connectionGraphics: Graphics
  private strokeGraphics: Graphics
  private w: number
  private h: number
  private readonly MARGIN = 0.15

  constructor(demonId: string, width: number, height: number) {
    super()
    this.w = width
    this.h = height
    const demon = getDemon(demonId)
    this.geometry = demon.sealGeometry
    this.ghostGraphics = new Graphics()
    this.connectionGraphics = new Graphics()
    this.strokeGraphics = new Graphics()
    this.addChild(this.ghostGraphics)
    this.addChild(this.connectionGraphics)
    this.addChild(this.strokeGraphics)
    this.drawGhostNodes()
  }

  private norm(p: Point): Point
    const margin = this.MARGIN
    return {
      x: margin * this.w + p.x * this.w * (1 - 2 * margin),
      y: margin * this.h + p.y * this.h * (1 - 2 * margin)
    }

  private drawGhostNodes(): void
    this.ghostGraphics.clear()
    for (const node of this.geometry.nodes) {
      const { x, y } = this.norm(node.position)
      this.ghostGraphics.circle(x, y, 10).fill({ color: 0x4a1a2a, alpha: 0.08 })
      this.ghostGraphics.circle(x, y, 6).fill({ color: 0x4a1a2a, alpha: 0.25 })
    }

  updateConnections(connections: ConnectionResult[]): void
    this.connectionGraphics.clear()
    for (const conn of connections) {
      const edge = this.geometry.edges.find(e =>
        (e.fromNode === conn.fromNode && e.toNode === conn.toNode) ||
        (e.fromNode === conn.toNode && e.toNode === conn.fromNode)
      )
      if (!edge) continue
      const pts = edge.canonicalPath.map(p => this.norm(p))
      let color = 0x3d1a2a
      let width = 2
      if (conn.accuracy >= 0.75) { color = 0xc8a0b8; width = 3 }
      else if (conn.accuracy >= 0.50) { color = 0x6b3a5a; width = 2 }
      this.connectionGraphics.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        this.connectionGraphics.lineTo(pts[i].x, pts[i].y)
      }
      this.connectionGraphics.stroke({ color, width })
      this.connectionGraphics.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        this.connectionGraphics.lineTo(pts[i].x, pts[i].y)
      }
      this.connectionGraphics.stroke({ color, width: width + 6, alpha: 0.06 })
    }

  updateActiveStroke(points: Point[]): void
    this.strokeGraphics.clear()
    if (points.length < 2) return
    this.strokeGraphics.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.strokeGraphics.lineTo(points[i].x, points[i].y)
    }
    this.strokeGraphics.stroke({ color: 0x8a6a7a, width: 1.5, alpha: 0.4 })

  getNearestNodeId(point: Point, thresholdPx: number): NodeId | null
    let nearest: NodeId | null = null
    let minDist = thresholdPx
    for (const node of this.geometry.nodes) {
      const np = this.norm(node.position)
      const dist = Math.sqrt((np.x - point.x) ** 2 + (np.y - point.y) ** 2)
      if (dist < minDist) {
        minDist = dist
        nearest = node.id
      }
    }
    return nearest

  resize(width: number, height: number): void
    this.w = width
    this.h = height
    this.drawGhostNodes()
}
```

---

## Prompt 13 — Glyph and Ring Layers

```
In src/canvas/ create GlyphLayer.ts.

Import from 'pixi.js': Container, Graphics
Import: PlacedGlyph, IntentCoherenceResult, GlyphId, Point from '../engine/sigil/Types'
Import: GLYPH_TEMPLATES from '../engine/sigil/GlyphLibrary'

export class GlyphLayer extends Container {

  private glyphGraphics: Graphics
  private strokeGraphics: Graphics
  private w: number
  private h: number

  constructor(width: number, height: number) {
    super()
    this.w = width
    this.h = height
    this.glyphGraphics = new Graphics()
    this.strokeGraphics = new Graphics()
    this.addChild(this.glyphGraphics)
    this.addChild(this.strokeGraphics)
  }

  private drawGlyphPath(
    g: Graphics,
    glyphId: string,
    cx: number,
    cy: number,
    size: number,
    color: number,
    alpha: number
  ): void
    const template = GLYPH_TEMPLATES.find(t => t.id === glyphId)
    if (!template) return
    const pts = template.canonicalPath.map(p => ({
      x: cx + (p.x - 0.5) * size,
      y: cy + (p.y - 0.5) * size
    }))
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    g.stroke({ color, width: 1.5, alpha })

  updateGlyphs(
    glyphs: PlacedGlyph[],
    coherence: IntentCoherenceResult | null
  ): void
    this.glyphGraphics.clear()
    const size = this.w * 0.07
    const contradictedIds = new Set(
      coherence?.contradictions.flatMap(([a, b]) => [String(a), String(b)]) ?? []
    )
    const isolatedIds = new Set(
      coherence?.isolatedGlyphs.map(String) ?? []
    )
    for (const glyph of glyphs) {
      const id = String(glyph.glyphId)
      let color = 0xa08898
      let alpha = 0.85
      if (contradictedIds.has(id)) { color = 0x8a2a1a; alpha = 0.9 }
      else if (isolatedIds.has(id)) { color = 0x4a3a40; alpha = 0.5 }
      else if (glyph.confidence >= 0.80) { color = 0xc8a0b8; alpha = 0.95 }
      this.drawGlyphPath(
        this.glyphGraphics, id,
        glyph.position.x, glyph.position.y,
        size, color, alpha
      )
    }

  updateActiveStroke(points: Point[]): void
    this.strokeGraphics.clear()
    if (points.length < 2) return
    this.strokeGraphics.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.strokeGraphics.lineTo(points[i].x, points[i].y)
    }
    this.strokeGraphics.stroke({ color: 0x7a5a6a, width: 1.5, alpha: 0.35 })

  resize(width: number, height: number): void
    this.w = width
    this.h = height

---

In src/canvas/ create BindingRingLayer.ts.

Import from 'pixi.js': Container, Graphics, Ticker
Import: RingResult, Point from '../engine/sigil/Types'

export class BindingRingLayer extends Container {

  private ringGraphics: Graphics
  private strokeGraphics: Graphics
  private glowGraphics: Graphics
  private rotationPhase = 0
  private hasRing = false

  constructor(width: number, height: number) {
    super()
    this.ringGraphics = new Graphics()
    this.glowGraphics = new Graphics()
    this.strokeGraphics = new Graphics()
    this.addChild(this.glowGraphics)
    this.addChild(this.ringGraphics)
    this.addChild(this.strokeGraphics)
    Ticker.shared.add(this.update, this)
  }

  private update = (ticker: Ticker): void => {
    if (!this.hasRing) return
    this.rotationPhase += ticker.deltaTime * 0.003
    this.glowGraphics.rotation = this.rotationPhase
  }

  updateActiveRing(points: Point[]): void
    this.strokeGraphics.clear()
    if (points.length < 2) return
    this.strokeGraphics.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.strokeGraphics.lineTo(points[i].x, points[i].y)
    }
    this.strokeGraphics.stroke({ color: 0x6a4a5a, width: 1.5, alpha: 0.3 })

  updateCompletedRing(ring: RingResult): void
    this.strokeGraphics.clear()
    this.ringGraphics.clear()
    this.glowGraphics.clear()
    this.hasRing = true
    const { x: cx, y: cy } = ring.center
    const r = ring.radius

    let color = 0x4a2a3a
    if (ring.overallStrength >= 0.75) color = 0xd4a0c0
    else if (ring.overallStrength >= 0.50) color = 0x8a5a78

    this.glowGraphics.circle(cx, cy, r).stroke({ color, width: 10, alpha: 0.10 })
    this.ringGraphics.circle(cx, cy, r).stroke({ color, width: 2, alpha: 0.9 })

    for (const wp of ring.weakPoints) {
      this.ringGraphics.arc(cx, cy, r, wp.startAngle, wp.endAngle)
      this.ringGraphics.stroke({ color: 0x6a1a1a, width: 3, alpha: 0.5 })
    }

  clearRing(): void
    this.ringGraphics.clear()
    this.glowGraphics.clear()
    this.strokeGraphics.clear()
    this.hasRing = false
    this.rotationPhase = 0

  destroy(): void
    Ticker.shared.remove(this.update, this)
    super.destroy({ children: true })
}
```

---

## Prompt 14 — Ritual Canvas Orchestrator

```
In src/canvas/ create RitualCanvas.ts.

Import from 'pixi.js': Application, Ticker
Import: AtmosphericLayer from './AtmosphericLayer'
Import: SealLayer from './SealLayer'
Import: GlyphLayer from './GlyphLayer'
Import: BindingRingLayer from './BindingRingLayer'
Import: StrokeEvaluator from '../engine/sigil/StrokeEvaluator'
Import: SealReconstructor from '../engine/sigil/SealReconstructor'
Import: GlyphRecognizer from '../engine/sigil/GlyphRecognizer'
Import: BindingRingEvaluator from '../engine/sigil/BindingRingEvaluator'
Import: SigilComposer from '../engine/sigil/SigilComposer'
Import: { useCanvasStore } from '../stores/canvasStore'
Import: Point, NodeId from '../engine/sigil/Types'

type DrawingPhase = 'SEAL' | 'GLYPH' | 'RING' | 'COMPLETE'

export class RitualCanvas {

  private app: Application
  private atmospheric: AtmosphericLayer
  private sealLayer: SealLayer
  private glyphLayer: GlyphLayer
  private ringLayer: BindingRingLayer
  private evaluator: StrokeEvaluator
  private reconstructor: SealReconstructor | null = null
  private recognizer: GlyphRecognizer
  private ringEvaluator: BindingRingEvaluator
  private composer: SigilComposer | null = null
  private phase: DrawingPhase = 'SEAL'
  private isDrawing = false
  private startNodeId: NodeId | null = null
  private activePoints: Point[] = []
  private currentDemonId: string | null = null

  constructor(app: Application) {
    this.app = app
    const w = app.screen.width
    const h = app.screen.height
    this.atmospheric = new AtmosphericLayer(w, h)
    this.sealLayer = new SealLayer('bael', w, h)
    this.glyphLayer = new GlyphLayer(w, h)
    this.ringLayer = new BindingRingLayer(w, h)
    app.stage.addChild(this.atmospheric)
    app.stage.addChild(this.sealLayer)
    app.stage.addChild(this.glyphLayer)
    app.stage.addChild(this.ringLayer)
    this.evaluator = new StrokeEvaluator()
    this.recognizer = new GlyphRecognizer()
    this.ringEvaluator = new BindingRingEvaluator()
    this.setupPointerEvents()
  }

  private setupPointerEvents(): void
    const canvas = this.app.canvas
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)

  private onDown = (e: PointerEvent): void => {
    this.app.canvas.setPointerCapture(e.pointerId)
    this.isDrawing = true
    this.activePoints = []
    this.evaluator.reset()
    const pt = { x: e.offsetX, y: e.offsetY }
    this.evaluator.addPoint({ x: pt.x, y: pt.y, pressure: e.pressure || 0.5, timestamp: e.timeStamp, pointerId: e.pointerId })
    this.activePoints.push(pt)
    if (this.phase === 'SEAL' && this.sealLayer) {
      this.startNodeId = this.sealLayer.getNearestNodeId(pt, 40)
    }
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.isDrawing) return
    const pt = { x: e.offsetX, y: e.offsetY }
    this.evaluator.addPoint({ x: pt.x, y: pt.y, pressure: e.pressure || 0.5, timestamp: e.timeStamp, pointerId: e.pointerId })
    this.activePoints.push(pt)
    if (this.phase === 'SEAL') this.sealLayer.updateActiveStroke(this.activePoints)
    else if (this.phase === 'GLYPH') this.glyphLayer.updateActiveStroke(this.activePoints)
    else if (this.phase === 'RING') this.ringLayer.updateActiveRing(this.activePoints)
  }

  private onUp = (e: PointerEvent): void => {
    if (!this.isDrawing) return
    this.isDrawing = false
    if (!this.evaluator.isMinimumLength()) return
    const stroke = this.evaluator.finalize()
    if (this.phase === 'SEAL') this.handleSealStroke(e)
    else if (this.phase === 'GLYPH') this.handleGlyphStroke(stroke)
    else if (this.phase === 'RING') this.handleRingStroke(stroke)
  }

  private handleSealStroke(e: PointerEvent): void
    if (!this.reconstructor || !this.startNodeId) return
    const endPt = { x: e.offsetX, y: e.offsetY }
    const endNodeId = this.sealLayer.getNearestNodeId(endPt, 40)
    if (!endNodeId || endNodeId === this.startNodeId) return
    const stroke = this.evaluator.finalize()
    const result = this.reconstructor.attemptConnection(this.startNodeId, endNodeId, stroke)
    useCanvasStore.getState().addConnection(result)
    useCanvasStore.getState().updateSealIntegrity(this.reconstructor.getSealIntegrity())
    this.sealLayer.updateConnections(this.reconstructor.getCompletedConnections())
    this.sealLayer.updateActiveStroke([])
    this.startNodeId = null

  private handleGlyphStroke(stroke: import('../engine/sigil/Types').StrokeResult): void
    const result = this.recognizer.recognize([stroke])
    if (!result.recognized) return
    const store = useCanvasStore.getState()
    const placed = {
      glyphId: result.recognized,
      position: { x: this.activePoints[Math.floor(this.activePoints.length / 2)].x, y: this.activePoints[Math.floor(this.activePoints.length / 2)].y },
      confidence: result.confidence,
      timestamp: Date.now()
    }
    store.addGlyph(placed)
    if (this.composer) {
      this.composer.addGlyph(placed)
      const coherence = this.composer.getCurrentIntentCoherence()
      store.setCoherence(coherence)
      this.glyphLayer.updateGlyphs(store.placedGlyphs, coherence)
    }
    this.glyphLayer.updateActiveStroke([])

  private handleRingStroke(stroke: import('../engine/sigil/Types').StrokeResult): void
    const result = this.ringEvaluator.evaluate(stroke)
    const store = useCanvasStore.getState()
    store.setRingResult(result)
    if (this.composer) this.composer.setBindingRing(result)
    this.ringLayer.updateCompletedRing(result)

  setDemon(demonId: string): void
    this.currentDemonId = demonId
    const w = this.app.screen.width
    const h = this.app.screen.height
    app.stage.removeChild(this.sealLayer)
    this.sealLayer.destroy()
    this.sealLayer = new SealLayer(demonId, w, h)
    this.app.stage.addChildAt(this.sealLayer, 1)
    this.reconstructor = new SealReconstructor(demonId)
    this.composer = new SigilComposer(demonId)
    this.phase = 'SEAL'
    this.glyphLayer.updateGlyphs([], null)
    this.ringLayer.clearRing()
    useCanvasStore.getState().selectDemon(demonId)

  setPhase(phase: DrawingPhase): void
    this.phase = phase
    useCanvasStore.getState().setPhase(phase)
    this.sealLayer.updateActiveStroke([])
    this.glyphLayer.updateActiveStroke([])

  composeSigil(): import('../engine/sigil/Types').Sigil | null
    if (!this.composer) return null
    const sigil = this.composer.compose()
    useCanvasStore.getState().setComposedSigil(sigil)
    return sigil

  resize(width: number, height: number): void
    this.atmospheric.resize(width, height)
    this.sealLayer.resize(width, height)
    this.glyphLayer.resize(width, height)

  destroy(): void
    this.app.canvas.removeEventListener('pointerdown', this.onDown)
    this.app.canvas.removeEventListener('pointermove', this.onMove)
    this.app.canvas.removeEventListener('pointerup', this.onUp)
    this.app.canvas.removeEventListener('pointercancel', this.onUp)
    this.atmospheric.destroy()
    this.ringLayer.destroy()
}
```

---

## Prompt 15 — UI Shell

```
In src/ create ui.ts.

Import: Application from 'pixi.js'
Import: RitualCanvas from './canvas/RitualCanvas'
Import: listDemons from './engine/demons/DemonRegistry'
Import: useCanvasStore from './stores/canvasStore'
Import: useGrimoireStore from './stores/grimoireStore'
Import: SigilVisualState from './engine/sigil/Types'

type UIScreen = 'DEMON_SELECT' | 'RITUAL_CANVAS' | 'GRIMOIRE'

export class UIManager {

  private app: Application
  private ritualCanvas: RitualCanvas
  private overlay: HTMLDivElement
  private screen: UIScreen = 'DEMON_SELECT'

  constructor(app: Application, ritualCanvas: RitualCanvas) {
    this.app = app
    this.ritualCanvas = ritualCanvas
    this.overlay = document.createElement('div')
    this.overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10;
      font-family: serif; color: #c8a0b8;
    `
    document.body.appendChild(this.overlay)
    useGrimoireStore.getState().load()
  }

  showDemonSelect(): void
    this.screen = 'DEMON_SELECT'
    const demons = listDemons()
    this.overlay.innerHTML = `
      <div style="background:#0a0a0a;min-height:100vh;padding:20px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h2 style="margin:0;font-size:18px;letter-spacing:2px;color:#8a6a7a;">GRIMOIRE</h2>
          <button id="btn-grimoire" style="background:none;border:1px solid #2a0a1a;color:#8a6a7a;padding:8px 14px;font-family:serif;font-size:13px;cursor:pointer;">RECORDS</button>
        </div>
        <div style="display:grid;gap:12px;">
          ${demons.map(d => `
            <button data-demon="${d.id}" style="background:#1a0a12;border:1px solid #2a0a1a;color:#c8a0b8;padding:18px;text-align:left;font-family:serif;cursor:pointer;width:100%;">
              <div style="font-size:15px;letter-spacing:1px;">${d.name}</div>
              <div style="font-size:11px;color:#6a4a5a;margin-top:4px;">${d.rank} · ${d.domains.join(', ')}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `
    this.overlay.querySelector('#btn-grimoire')?.addEventListener('click', () => this.showGrimoire())
    for (const btn of this.overlay.querySelectorAll('[data-demon]')) {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.demon!
        this.showRitualCanvas(id)
      })
    }

  showRitualCanvas(demonId: string): void
    this.screen = 'RITUAL_CANVAS'
    this.ritualCanvas.setDemon(demonId)
    this.overlay.innerHTML = `
      <div style="position:fixed;bottom:0;left:0;right:0;background:#0a0508cc;padding:12px;display:flex;gap:8px;justify-content:center;align-items:center;">
        <button id="btn-back" style="background:none;border:1px solid #2a0a1a;color:#6a4a5a;padding:8px 12px;font-family:serif;font-size:12px;cursor:pointer;">← BACK</button>
        <button id="btn-seal" style="background:#2a0a1a;border:1px solid #4a1a2a;color:#c8a0b8;padding:8px 16px;font-family:serif;font-size:13px;cursor:pointer;">SEAL</button>
        <button id="btn-glyph" style="background:none;border:1px solid #2a0a1a;color:#8a6a7a;padding:8px 16px;font-family:serif;font-size:13px;cursor:pointer;">GLYPH</button>
        <button id="btn-ring" style="background:none;border:1px solid #2a0a1a;color:#8a6a7a;padding:8px 16px;font-family:serif;font-size:13px;cursor:pointer;">RING</button>
        <button id="btn-compose" style="display:none;background:#1a0a2a;border:1px solid #4a2a5a;color:#c8a0b8;padding:8px 16px;font-family:serif;font-size:13px;cursor:pointer;">BIND</button>
      </div>
    `
    const setActive = (id: string) => {
      for (const b of ['btn-seal','btn-glyph','btn-ring']) {
        const el = this.overlay.querySelector(`#${b}`) as HTMLButtonElement
        el.style.background = b === id ? '#2a0a1a' : 'none'
        el.style.color = b === id ? '#c8a0b8' : '#6a4a5a'
      }
    }
    this.overlay.querySelector('#btn-back')?.addEventListener('click', () => this.showDemonSelect())
    this.overlay.querySelector('#btn-seal')?.addEventListener('click', () => { this.ritualCanvas.setPhase('SEAL'); setActive('btn-seal') })
    this.overlay.querySelector('#btn-glyph')?.addEventListener('click', () => { this.ritualCanvas.setPhase('GLYPH'); setActive('btn-glyph') })
    this.overlay.querySelector('#btn-ring')?.addEventListener('click', () => { this.ritualCanvas.setPhase('RING'); setActive('btn-ring') })
    this.overlay.querySelector('#btn-compose')?.addEventListener('click', () => this.onCompose(demonId))

    useCanvasStore.subscribe(state => {
      const hasData = state.sealIntegrity > 0 &&
        state.placedGlyphs.length > 0 &&
        state.ringResult !== null
      const btn = this.overlay.querySelector('#btn-compose') as HTMLElement | null
      if (btn) btn.style.display = hasData ? 'block' : 'none'
    })

  private onCompose(demonId: string): void
    const sigil = this.ritualCanvas.composeSigil()
    if (!sigil) return
    useGrimoireStore.getState().saveSigil(demonId, sigil)
    this.showDemonSelect()

  showGrimoire(): void
    this.screen = 'GRIMOIRE'
    const pages = useGrimoireStore.getState().pages
    const stateLabel = (v: SigilVisualState): string => {
      const map: Record<SigilVisualState, string> = {
        dormant: 'dormant', unstable: 'weak', healthy: 'sound',
        charged: 'potent', corrupted: 'corrupted'
      }
      return map[v]
    }
    const stateColor = (v: SigilVisualState): string => {
      const map: Record<SigilVisualState, string> = {
        dormant: '#2a1a2a', unstable: '#5a2a1a', healthy: '#1a3a2a',
        charged: '#3a2a5a', corrupted: '#4a0a0a'
      }
      return map[v]
    }
    this.overlay.innerHTML = `
      <div style="background:#0a0a0a;min-height:100vh;padding:20px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h2 style="margin:0;font-size:18px;letter-spacing:2px;color:#8a6a7a;">RECORDS</h2>
          <button id="btn-back" style="background:none;border:1px solid #2a0a1a;color:#6a4a5a;padding:8px 12px;font-family:serif;font-size:12px;cursor:pointer;">← BACK</button>
        </div>
        ${pages.length === 0
          ? '<p style="color:#4a3a40;font-size:13px;">No sigils recorded.</p>'
          : pages.map(page => `
            <div style="margin-bottom:16px;border:1px solid #1a0a12;padding:14px;">
              <div style="font-size:14px;letter-spacing:1px;margin-bottom:8px;">${page.demonId.toUpperCase()}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${page.sigils.map(s => `
                  <div style="background:${stateColor(s.visualState)};padding:4px 8px;font-size:11px;border:1px solid #2a0a1a;">
                    ${stateLabel(s.visualState)}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')
        }
      </div>
    `
    this.overlay.querySelector('#btn-back')?.addEventListener('click', () => this.showDemonSelect())
}
```

---

## Prompt 16 — Audio and Haptics

```
In src/services/ create haptics.ts with exactly this content:

const canVibrate = 'vibrate' in navigator

export const haptics = {
  nodeConnect(accurate: boolean): void {
    if (!canVibrate) return
    navigator.vibrate(accurate ? [10] : [5, 30, 5])
  },
  glyphRecognized(confidence: number): void {
    if (!canVibrate) return
    if (confidence >= 0.80) navigator.vibrate([15])
    else if (confidence >= 0.60) navigator.vibrate([8])
  },
  glyphFailed(): void {
    if (!canVibrate) return
    navigator.vibrate([5, 20, 5, 20, 5])
  },
  ringComplete(strength: number): void {
    if (!canVibrate) return
    if (strength >= 0.75) navigator.vibrate([30])
    else if (strength >= 0.50) navigator.vibrate([15])
    else navigator.vibrate([8])
  },
  sigilSettle(integrity: number): void {
    if (!canVibrate) return
    if (integrity >= 0.85) navigator.vibrate([20, 40, 60])
    else if (integrity >= 0.60) navigator.vibrate([15, 30, 15])
    else navigator.vibrate([10])
  },
  misfire(): void {
    if (!canVibrate) return
    navigator.vibrate([10, 10, 10, 10, 10, 10])
  }
}

---

In src/services/ create audio.ts with exactly this content:

export class AudioManager {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext()
      return this.ctx
    } catch { return null }
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3): void {
    const ctx = this.getCtx()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01)
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration + 0.05)
    } catch { /* silent */ }
  }

  playNodeConnect(accurate: boolean): void {
    this.tone(accurate ? 440 : 220, 0.12, accurate ? 'sine' : 'sawtooth', accurate ? 0.3 : 0.15)
  }

  playGlyphRecognized(confidence: number): void {
    this.tone(300 + confidence * 300, 0.15, 'triangle', 0.25)
  }

  playGlyphFailed(): void {
    this.tone(180, 0.06, 'sawtooth', 0.1)
    setTimeout(() => this.tone(160, 0.06, 'sawtooth', 0.1), 80)
  }

  playRingComplete(strength: number): void {
    this.tone(200 + strength * 200, 0.4, 'sine', 0.2)
  }

  playSigilSettle(integrity: number): void {
    const base = 200 + integrity * 200
    this.tone(base, 0.1, 'sine', 0.2)
    setTimeout(() => this.tone(base * 1.25, 0.1, 'sine', 0.2), 120)
    setTimeout(() => this.tone(base * 1.5, 0.2, 'sine', 0.25), 240)
  }

  playMisfire(): void {
    const ctx = this.getCtx()
    if (!ctx) return
    try {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      const g = ctx.createGain()
      src.buffer = buf
      src.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
      src.start()
    } catch { /* silent */ }
  }
}
```

---

## Prompt 17 — Main Entry Point and Wiring

```
Replace the contents of src/main.ts with the following.

Import: Application from 'pixi.js'
Import: RitualCanvas from './canvas/RitualCanvas'
Import: UIManager from './ui'

async function init() {
  const app = new Application()

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0a0508,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })

  const appDiv = document.getElementById('app')!
  appDiv.appendChild(app.canvas)
  app.canvas.style.touchAction = 'none'

  const ritualCanvas = new RitualCanvas(app)
  const ui = new UIManager(app, ritualCanvas)
  ui.showDemonSelect()

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    ritualCanvas.resize(window.innerWidth, window.innerHeight)
  })
}

init()
```

---

## Prompt 18 — Integration and GitHub Pages Verification

```
Wire all systems and verify the full Phase 1 flow works end to end.

Fix any TypeScript errors across the entire codebase:
  npx tsc --noEmit
  Fix all errors before continuing.

Run all tests:
  npx vitest run
  Fix any failing tests before continuing.

Verify the full user flow manually:

1. npm run dev — app loads on localhost, dark background visible
2. Demon select screen shows 6 demon cards with name, rank, domains
3. Tap a demon — transitions to ritual canvas
4. SEAL phase: draw between two nodes — connection appears on canvas
5. GLYPH phase: draw a horizontal stroke — VECTOR_OUT recognized,
   placed on canvas
6. RING phase: draw a circle — ring appears with glow
7. BIND button appears after all three phases have data
8. Tap BIND — sigil saved, returns to demon select
9. RECORDS screen shows saved sigil with state label

Fix any bugs found during manual verification.

GitHub Pages verification:
- Confirm vite.config.ts has base: './'
- Push to main branch
- Confirm GitHub Actions workflow runs successfully
- Open the GitHub Pages URL on your phone
- Confirm the app loads with no 404 errors
- Confirm touch drawing works on the phone screen
- Confirm "Add to Home Screen" installs the PWA
- Confirm the app launches fullscreen from home screen

Performance check:
- If atmospheric layer causes jank, reduce particle count to 6
- If PixiJS Graphics are being cleared and redrawn every frame,
  refactor to only redraw on state change

Document any known issues in PLATFORM_NOTES.md.
```
