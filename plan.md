# Grimoire Remaining Prompts — Multi-Phase Implementation Plan

This plan covers Prompts 7a through 18, organized into 5 phases by dependency order.

---

## Phase 1: Engine Logic (Prompts 7a–7d)

Pure TypeScript engine modules with no UI dependencies. All testable independently.

### Step 1.1 — CoherenceRules data (Prompt 7a)
- Create `src/engine/sigil/CoherenceRules.ts`
- Contains `COHERENCE_RULES` const with contradictions, chainRequirements, and isolatedCategories
- **No tests needed** — pure data file

### Step 1.2 — IntentCoherenceChecker (Prompt 7b)
- Create `src/engine/sigil/IntentCoherenceChecker.ts`
- Implements `checkCoherence(glyphs: PlacedGlyph[]): IntentCoherenceResult`
- Logic: find contradictions → find incomplete chains → find isolated glyphs → compute score
- Create `src/engine/sigil/IntentCoherenceChecker.test.ts` with 4 tests:
  - Empty glyphs → score 0.60
  - VECTOR_OUT + TARGET_PERSON → score 1.0
  - VECTOR_OUT + VECTOR_IN contradiction → reduces score
  - Score never below 0
- **Run tests**: `npx vitest run src/engine/sigil/IntentCoherenceChecker.test.ts`

### Step 1.3 — SigilComposer state (Prompt 7c)
- Create `src/engine/sigil/SigilComposer.ts`
- Class with: constructor, setSealIntegrity, addGlyph, removeGlyph, setBindingRing, getCurrentIntentCoherence, getSnapshot
- **No compose() yet**
- Create `src/engine/sigil/SigilComposer.test.ts` with 4 tests:
  - Constructor initializes empty state
  - addGlyph replaces same-id glyph
  - removeGlyph removes glyph
  - setBindingRing sets hasRing true
- **Run tests**: `npx vitest run src/engine/sigil/SigilComposer.test.ts`

### Step 1.4 — SigilComposer compose() (Prompt 7d)
- Add `compose(): Sigil` method to SigilComposer
- Integrity formula: `seal*0.40 + coherence*0.35 + ring*0.25`
- Visual state thresholds: charged ≥ 0.85, healthy ≥ 0.60, unstable ≥ 0.30, corrupted < 0.30, dormant if no ring
- Add 5 more tests to existing test file
- **Run all engine tests**: `npx vitest run src/engine/sigil/`

### Phase 1 checkpoint: `npx vitest run` — all tests green

---

## Phase 2: Persistence & State Management (Prompts 8–10)

Data layer and Zustand stores. No rendering code.

### Step 2.1 — GrimoireDB persistence (Prompt 8)
- Create `src/db/grimoire.ts`
- `GrimoireDB` class with localStorage-backed CRUD:
  - load/persist (private), getAll, getPage, getOrCreatePage, saveSigil, updateSigilStatus (with valid transition map), deleteSigil, clearAll
- Export singleton `grimoireDB`
- **Note**: Tests for this would require mocking localStorage — the prompt doesn't specify tests, so skip unless issues arise

### Step 2.2 — Grimoire Zustand store (Prompt 9)
- Create `src/stores/grimoireStore.ts`
- `useGrimoireStore` Zustand store wrapping `grimoireDB`
- State: pages, isLoaded
- Actions: load, saveSigil, updateSigilStatus, getPageForDemon

### Step 2.3 — Canvas Zustand store (Prompt 10)
- Create `src/stores/canvasStore.ts`
- `useCanvasStore` Zustand store for runtime drawing state
- State: currentDemonId, currentPhase, completedConnections, sealIntegrity, placedGlyphs, coherenceResult, ringResult, composedSigil
- Actions: selectDemon, addConnection, updateSealIntegrity, addGlyph, removeGlyph, setCoherence, setRingResult, setPhase, setComposedSigil, resetCanvas
- Export `DrawingPhase` type

### Phase 2 checkpoint: `npx tsc --noEmit` — no type errors

---

## Phase 3: Canvas Rendering Layers (Prompts 11–13)

PixiJS visual layers. Each is a self-contained Container subclass.

### Step 3.1 — AtmosphericLayer (Prompt 11)
- Create `src/canvas/AtmosphericLayer.ts`
- Dark background + 8 ambient particles with drift/flicker
- Breathing alpha animation on ticker
- resize() and destroy() lifecycle

### Step 3.2 — SealLayer (Prompt 12)
- Create `src/canvas/SealLayer.ts`
- Renders demon seal geometry: ghost nodes, completed connections, active stroke
- `getNearestNodeId(point, threshold)` for hit-testing
- Color-coded by accuracy (≥0.75 bright, ≥0.50 medium, else dim)

### Step 3.3 — GlyphLayer (Prompt 13a)
- Create `src/canvas/GlyphLayer.ts`
- Renders placed glyphs using canonical paths from GlyphLibrary
- Color-coded by coherence status (contradicted = red, isolated = dim, high-confidence = bright)
- Active stroke rendering

### Step 3.4 — BindingRingLayer (Prompt 13b)
- Create `src/canvas/BindingRingLayer.ts`
- Renders binding ring with glow effect
- Slow rotation animation on ticker
- Weak points rendered as red arc segments
- clearRing() and destroy() lifecycle

### Phase 3 checkpoint: `npx tsc --noEmit` — no type errors

---

## Phase 4: Orchestration & UI (Prompts 14–17)

### Step 4.0 — SealReconstructor stub (dependency for Prompt 14)
- **Critical gap**: Prompt 14 imports `SealReconstructor` from `../engine/sigil/SealReconstructor`, but it's not defined in any of the remaining prompts and doesn't exist in the codebase
- Create a minimal `src/engine/sigil/SealReconstructor.ts` with:
  - `constructor(demonId: string)` — loads demon seal geometry
  - `attemptConnection(fromNode: NodeId, toNode: NodeId, stroke: StrokeResult): ConnectionResult` — evaluates stroke against canonical edge path
  - `getSealIntegrity(): number` — returns weighted sum of completed edge accuracies
  - `getCompletedConnections(): ConnectionResult[]` — returns all successful connections
- This is required by RitualCanvas and must match the API it expects

### Step 4.1 — RitualCanvas orchestrator (Prompt 14)
- Create `src/canvas/RitualCanvas.ts`
- Wires all layers + engine evaluators together
- Pointer event handling: pointerdown/move/up/cancel
- Phase-specific stroke routing: SEAL → SealReconstructor, GLYPH → GlyphRecognizer, RING → BindingRingEvaluator
- setDemon(), setPhase(), composeSigil(), resize(), destroy()
- **Fix known issue in prompt**: `app.stage.removeChild` should be `this.app.stage.removeChild` in setDemon()

### Step 4.2 — UI Shell (Prompt 15)
- Create `src/ui.ts`
- `UIManager` class with three screens:
  - Demon Select: grid of 6 demon cards, "RECORDS" button
  - Ritual Canvas: bottom toolbar with SEAL/GLYPH/RING phase buttons, BIND button (hidden until all phases have data)
  - Grimoire: saved sigils listed by demon, visual state labels and colors
- HTML overlay on top of PixiJS canvas

### Step 4.3 — Haptics service (Prompt 16a)
- Create `src/services/haptics.ts`
- Vibration patterns for: nodeConnect, glyphRecognized, glyphFailed, ringComplete, sigilSettle, misfire

### Step 4.4 — Audio service (Prompt 16b)
- Create `src/services/audio.ts`
- `AudioManager` class using Web Audio API
- Synthesized tones for: nodeConnect, glyphRecognized, glyphFailed, ringComplete, sigilSettle, misfire (white noise burst)

### Step 4.5 — Main entry point (Prompt 17)
- Replace `src/main.ts` with full wiring:
  - Initialize PixiJS Application
  - Create RitualCanvas and UIManager
  - Show demon select screen
  - Window resize handler

### Phase 4 checkpoint: `npx tsc --noEmit` — no type errors

---

## Phase 5: Integration & Verification (Prompt 18)

### Step 5.1 — Fix all TypeScript errors
- Run `npx tsc --noEmit`
- Fix any errors across the entire codebase

### Step 5.2 — Run all tests
- Run `npx vitest run`
- Fix any failing tests

### Step 5.3 — Verify build
- Run `npm run build`
- Confirm vite.config.ts has `base: './'`
- Fix any build errors

### Step 5.4 — Smoke test dev server
- Run `npm run dev`
- Verify app loads with dark background

---

## Dependency Graph

```
Phase 1 (Engine)
  7a CoherenceRules
    └─> 7b IntentCoherenceChecker
          └─> 7c SigilComposer (state)
                └─> 7d SigilComposer (compose)

Phase 2 (Data/State)
  8 GrimoireDB
    └─> 9 grimoireStore
  10 canvasStore (independent)

Phase 3 (Canvas Layers)
  11 AtmosphericLayer (independent)
  12 SealLayer (depends on DemonRegistry, Types)
  13a GlyphLayer (depends on GlyphLibrary, Types)
  13b BindingRingLayer (independent)

Phase 4 (Orchestration)
  4.0 SealReconstructor stub (must precede 14)
  14 RitualCanvas (depends on ALL of Phase 3, SealReconstructor, engine evaluators, canvasStore)
  15 UIManager (depends on RitualCanvas, grimoireStore, canvasStore, DemonRegistry)
  16 Audio + Haptics (independent services)
  17 main.ts (depends on RitualCanvas, UIManager)

Phase 5 (Verification)
  18 Integration — depends on everything above
```

## Risk Items

1. **SealReconstructor is missing** — Not defined in any prompt, but required by RitualCanvas (Prompt 14). Must create a stub that matches the expected API: `attemptConnection()`, `getSealIntegrity()`, `getCompletedConnections()`.

2. **Prompt 14 has a bug**: `app.stage.removeChild(this.sealLayer)` references bare `app` instead of `this.app` in `setDemon()`. Will fix during implementation.

3. **Prompt 14 calls `this.evaluator.finalize()` twice** in SEAL phase — once in `onUp` and again in `handleSealStroke`. The second call may fail since finalize resets state. Will need to pass the stroke result from `onUp` to `handleSealStroke` instead.

4. **localStorage in tests** — GrimoireDB uses `localStorage` which doesn't exist in Node.js test environment. May need to skip DB tests or use a mock.

5. **GLYPH_TEMPLATES import** — Prompt 13 imports `GLYPH_TEMPLATES` from GlyphLibrary. Verified this export exists.

## Estimated File Count

- **New files**: 14 source files + 2 test files = 16 files
- **Modified files**: 1 (src/main.ts)
