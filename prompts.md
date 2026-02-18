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
     
