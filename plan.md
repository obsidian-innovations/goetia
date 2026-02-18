# Goetia — Multiphase Implementation Plan (Prompts 7a–12)

## Overview

The prompts.md file contains 8 implementation prompts (7a, 7b, 7c, 7d, 8, 9, 10, 11, plus a truncated 12). These build on the existing engine scaffolding to add: intent coherence checking, sigil composition, grimoire persistence, Zustand stores, and PixiJS canvas layers.

**Note:** Prompt 12 (SealLayer) is truncated in prompts.md — the `updateConnections` method is incomplete. I will implement everything up to and including Prompt 11, and implement as much of Prompt 12 as the available spec allows. Prompts 13–15 are not present in the file.

---

## Phase 1 — Engine: Intent Coherence (Prompts 7a + 7b)

These are pure engine modules with no UI dependencies. 7b depends on 7a.

### Step 1.1: Create `src/engine/sigil/CoherenceRules.ts` (Prompt 7a)
- Create the file with the exact `COHERENCE_RULES` constant as specified
- Contains contradictions, chainRequirements, and isolatedCategories

### Step 1.2: Create `src/engine/sigil/IntentCoherenceChecker.ts` (Prompt 7b)
- Implement `checkCoherence(glyphs: PlacedGlyph[]): IntentCoherenceResult`
- 4-step pipeline: find contradictions → find incomplete chains → find isolated glyphs → compute score

### Step 1.3: Create `src/engine/sigil/IntentCoherenceChecker.test.ts` (Prompt 7b)
- 4 tests: empty glyphs (score 0.60), valid pair (score 1.0), contradiction (score 0.75), score floor at 0

### Step 1.4: Run tests, verify all pass

---

## Phase 2 — Engine: Sigil Composer (Prompts 7c + 7d)

Depends on Phase 1 (imports `checkCoherence`).

### Step 2.1: Create `src/engine/sigil/SigilComposer.ts` (Prompt 7c)
- Class with: constructor, setSealIntegrity, addGlyph, removeGlyph, setBindingRing, getCurrentIntentCoherence, getSnapshot
- **No** `compose()` method yet

### Step 2.2: Create `src/engine/sigil/SigilComposer.test.ts` (Prompt 7c)
- 4 tests: constructor init, addGlyph dedup, removeGlyph, setBindingRing

### Step 2.3: Add `compose()` method to SigilComposer (Prompt 7d)
- Computes weighted integrity: seal(0.40) + coherence(0.35) + ring(0.25)
- Determines visualState based on integrity thresholds and ring presence
- Returns full `Sigil` object

### Step 2.4: Add compose() tests to SigilComposer.test.ts (Prompt 7d)
- 5 tests: valid shape, charged state, dormant state, unique IDs, perfect inputs → 1.0

### Step 2.5: Run all engine tests, verify all pass

---

## Phase 3 — Persistence: Grimoire DB (Prompt 8)

No engine dependencies beyond types. Uses localStorage.

### Step 3.1: Create `src/db/grimoire.ts` (Prompt 8)
- `GrimoirePageRecord` and `GrimoireStore` interfaces
- `GrimoireDB` class with: load, persist, getAll, getPage, getOrCreatePage, saveSigil, updateSigilStatus (with valid transition enforcement), deleteSigil, clearAll
- Export singleton `grimoireDB`

### Step 3.2: Run type check (`npx tsc --noEmit`) to verify

---

## Phase 4 — Stores: Zustand State (Prompts 9 + 10)

Depends on Phase 3 (grimoireStore imports grimoireDB) and engine types.

### Step 4.1: Create `src/stores/grimoireStore.ts` (Prompt 9)
- Zustand store wrapping `grimoireDB`
- Methods: load, saveSigil, updateSigilStatus, getPageForDemon

### Step 4.2: Create `src/stores/canvasStore.ts` (Prompt 10)
- Zustand store for drawing session state
- `DrawingPhase` type: SEAL | GLYPH | RING | COMPLETE
- Methods: selectDemon, addConnection, updateSealIntegrity, addGlyph, removeGlyph, setCoherence, setRingResult, setPhase, setComposedSigil, resetCanvas

### Step 4.3: Run type check to verify

---

## Phase 5 — Canvas: Visual Layers (Prompts 11 + 12)

PixiJS rendering. No engine logic dependencies beyond types.

### Step 5.1: Create `src/canvas/AtmosphericLayer.ts` (Prompt 11)
- Extends PixiJS `Container`
- Dark background with 8 floating particles
- Breathing alpha animation on shared Ticker
- resize() and destroy() lifecycle methods

### Step 5.2: Create `src/canvas/SealLayer.ts` (Prompt 12 — partial)
- Extends PixiJS `Container`
- Renders ghost nodes from demon's SealGeometry
- `norm()` helper for 0–1 → pixel conversion with margins
- `updateConnections()` — implement as much as the truncated spec allows (draw completed connections as lines between nodes)

### Step 5.3: Run type check and build (`npm run build`) to verify everything compiles

---

## Phase 6 — Final Verification

### Step 6.1: Run full test suite (`npx vitest run`)
### Step 6.2: Run production build (`npm run build`)
### Step 6.3: Commit and push to branch `claude/plan-prompts-implementation-ibpd9`

---

## Dependency Graph

```
Phase 1 (7a → 7b)
    ↓
Phase 2 (7c → 7d)     Phase 3 (8)
    ↓                     ↓
         Phase 4 (9, 10)
              ↓
         Phase 5 (11, 12)
              ↓
         Phase 6 (verify)
```

Phases 3 and the latter parts of Phase 2 can be done in parallel since they don't depend on each other. Phases 4 and 5 depend on prior phases for type correctness.

## Files Created (10 new files)

| File | Prompt |
|------|--------|
| `src/engine/sigil/CoherenceRules.ts` | 7a |
| `src/engine/sigil/IntentCoherenceChecker.ts` | 7b |
| `src/engine/sigil/IntentCoherenceChecker.test.ts` | 7b |
| `src/engine/sigil/SigilComposer.ts` | 7c+7d |
| `src/engine/sigil/SigilComposer.test.ts` | 7c+7d |
| `src/db/grimoire.ts` | 8 |
| `src/stores/grimoireStore.ts` | 9 |
| `src/stores/canvasStore.ts` | 10 |
| `src/canvas/AtmosphericLayer.ts` | 11 |
| `src/canvas/SealLayer.ts` | 12 (partial) |
