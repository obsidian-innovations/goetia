# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Goetia is a browser-based occult game where players craft sigils to summon and bind demons from the Ars Goetia. The core mechanic is a three-layer ritual drawing system:

1. **Foundation Seal** — trace the demon's unique geometric seal between its nodes
2. **Intent Glyphs** — inscribe symbolic glyphs that declare purpose
3. **Binding Ring** — close the ritual by drawing a circle

Completed sigils are stored in a personal **grimoire** (localStorage-backed). Beyond the core ritual, the game includes sigil charging (attention-based), corruption/purification, PvP clashes, geolocation-based world encounters, demon research, and social covens.

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # tsc + vite build (production)
npm run preview      # Preview production build
npx tsc --noEmit     # Type-check only

# Run all tests
npx vitest run

# Run a single test file
npx vitest run src/engine/sigil/geometry.test.ts

# Run tests in watch mode
npx vitest
```

---

## Architecture

Five layers, strictly ordered by dependency:

```
engine  →  canvas  →  stores  →  services
                 ↘  ui  ↗
```

**`src/engine/`** — Pure TypeScript game logic. No PixiJS, no DOM, no side effects. Ten sub-packages:
- `sigil/` — evaluation logic and shared types
- `demons/` — demon data registry, split by rank (kings, dukes, princes, marquises, earls, presidents, knights, barons) with shared `geometry.ts` helpers
- `charging/` — `ChargingEngine`, `AttentionGesture`, `HoldWindow` — sigil charging with attention-based mechanics
- `corruption/` — `CorruptionEngine`, `WhisperEngine`, `PurificationEngine`, `VesselState` — corruption accumulation, whispers, purification, vessel progression
- `demands/` — `DemandEngine`, `DemandTemplates` — demonic demands system
- `pvp/` — `ClashResolver`, `HexSystem`, `MisfireEngine` — PvP clash resolution, hex/ward casting, misfire effects
- `research/` — `ResearchEngine`, `ResearchActivities` — progressive demon seal geometry revelation
- `social/` — `CovenEngine` — coven creation and management
- `world/` — `ThinPlaces`, `ThinPlaceGenerator`, `FixedThinPlaces`, `Encounters`, `KingEvent` — geolocation-based thin places and encounters
- `grimoire/` — grimoire engine logic (placeholder)

**`src/canvas/`** — PixiJS `Container` subclasses for rendering, plus `RitualCanvas.ts` which orchestrates them. Translates engine output into visuals and DOM pointer events into engine input. **All coordinates leaving this layer are normalised 0–1.**

**`src/stores/`** — Seven Zustand slices. No game logic lives here.
- `canvasStore` — runtime drawing state
- `grimoireStore` — grimoire state wrapping `GrimoireDB`
- `chargingStore` — active charging sessions, attention gestures
- `corruptionStore` — corruption state, whispers, vessel tracking
- `pvpStore` — PvP clash challenges, hexes, wards, covens
- `worldStore` — thin places, geolocation, dynamic place generation
- `researchStore` — demon research progress, geometry revelation

**`src/services/`** — Side-effect integrations:
- `audio.ts` — Web Audio API synthesis
- `haptics.ts` — Web Vibration API
- `geolocation.ts` — Geolocation API (permission query, watch position)
- `network.ts` — networking for PvP (clash challenges, hex casting, matchmaking)
- `camera.ts` — device camera integration (getUserMedia)

**`src/db/`** — `grimoire.ts`: localStorage-backed CRUD with enforced status-transition rules and research state persistence. Exported as singleton `grimoireDB`.

**`src/ui.ts`** — `UIManager`: pure DOM overlay (no PixiJS). Three screens — demon select, ritual canvas toolbar, grimoire viewer — toggled with CSS classes. Subscribes to `canvasStore` to show/hide the BIND button.

**`src/main.ts`** — Entry point. Initialises PixiJS `Application`, creates `RitualCanvas` and `UIManager`, wires UI callbacks, subscribes to `canvasStore` for per-event haptic/audio feedback, and handles window resize.

---

## Engine Internals (`src/engine/sigil/`)

**`Types.ts`** — Canonical source of truth for all shared types: `Point`, `Sigil`, `Demon`, `StrokeResult`, `RingResult`, `GlyphResult`, `ConnectionResult`, `SigilStatus`, `SigilVisualState`, `DemonRank`, `DemonDomain`, `SealNode`, `SealEdge`, `SealGeometry`, `PlacedGlyph`, `IntentCoherenceResult`, and branded IDs (`NodeId`, `GlyphId`). Every engine value is in normalised 0–1 space.

**`geometry.ts`** — Pure geometry utilities: `normalizePathToUnitSpace`, `resamplePath`, `discreteFrechetDistance`, `fitCircle` (Kasa algebraic least-squares), `signedArea`, `doesPathSelfIntersect`, `isPathClosed`, `pathLength`, and statistical helpers.

**`StrokeEvaluator`** — Stateful. `addPoint(PointerInputEvent)` during drawing → `finalize()` → `StrokeResult`. Deduplicates close points, applies Ramer–Douglas–Peucker simplification, samples pressure along arc length, computes per-vertex curvature. Operates in **pixel space** — normalisation happens in `RitualCanvas`.

**`SealReconstructor`** — Stateful, one instance per demon. `attemptConnection(fromNode, toNode, stroke)` resamples both stroke and canonical edge to 32 points and takes the minimum Fréchet distance of forward and reverse directions (player may draw either way). `accuracy = max(0, 1 − dist/0.5)`; valid when ≥ 0.25. Keeps the best result per edge. `getSealIntegrity()` returns the weighted accuracy sum.

**`GlyphLibrary.ts`** — 12 glyph templates across three semantic groups (Vector, Quality, Duration). Each has a canonical normalised path, stroke count, and geometric invariants. Use `GLYPHS` constants for IDs, `getGlyphTemplate(id)` to retrieve.

**`GlyphRecognizer`** — Stateless. `recognize(strokes)` normalises internally, resamples to 32 points, filters by stroke count and invariants, scores via Procrustes analysis, returns top match above 0.55 threshold.

**`BindingRingEvaluator`** — Stateless. `evaluate(stroke)` fits a circle (Kasa), computes circularity, closure, consistency, and weak points (16-segment angular bucketing). `overallStrength = circularity×0.4 + closure×0.35 + consistency×0.25 − weakPoints×0.05`.

**`IntentCoherenceChecker`** — Stateless. `checkCoherence(glyphs)` detects contradictions, incomplete chains, and isolated glyphs using `CoherenceRules.ts`.

**`SigilComposer`** — Stateful builder. `setSealIntegrity`, `addGlyph`, `setBindingRing`, then `compose()` → `Sigil`. Overall integrity = `seal×0.40 + coherence×0.35 + ring×0.25`. Visual states: charged ≥ 0.85, healthy ≥ 0.60, unstable ≥ 0.30, corrupted < 0.30, dormant if no ring.

**`SigilLifecycle`** — `SigilLifecycleManager` manages sigil status transitions (draft → complete → resting → awakened → charged → spent) with validation. Throws on invalid transitions.

**`DemonRegistry`** (`src/engine/demons/DemonRegistry.ts`) — `DEMON_REGISTRY` with 72 demons across 8 rank files (kings, dukes, princes, marquises, earls, presidents, knights, barons). Shared seal geometry helpers in `geometry.ts` (`nid`, `mkEdge`, `circle`, `hub`, `pentagram`, `wheel`). `getDemon(id)` throws `DemonNotFoundError` for unknown IDs. Edge weights per demon sum to ~1.0.

---

## Canvas Layer (`src/canvas/`)

**`AtmosphericLayer`** — Dark background + 8 drifting particles with flicker; container alpha breathes on `Ticker.shared`. Has `resize()` and `destroy()`.

**`SealLayer`** — Ghost edges (dim), completed connections colour-coded by accuracy (≥0.75 bright / ≥0.50 medium / below dim), ghost nodes, active stroke. `getNearestNodeId(pixelPoint, thresholdPx)` for pointer hit-testing.

**`GlyphLayer`** — Places glyph canonical paths scaled to ~8% of the short canvas dimension, centred on each `PlacedGlyph.position`. Colour-coded by coherence: contradicted=red, isolated=dim, high-confidence=bright.

**`BindingRingLayer`** — Circle + glow halo coloured by `overallStrength`; weak-point arcs in red, slowly rotating on `Ticker.shared`. Has `clearRing()` and `destroy()`.

**`ChargingOverlayLayer`** — Pulsing ring overlay during sigil charging. Colour and intensity reflect charge progress (0–1); red flicker on decay. Driven externally via setters.

**`DistortionLayer`** — Visual interference effects during PvE encounters: animated noise, colour flashes, edge flickers. Intensity 0 = invisible, 1 = maximum interference.

**`CorruptionEffects`** — Corruption visual overlay with four stages: clean (invisible), tainted (faint red vignette), compromised (scanlines + heavier vignette), vessel (pulsing red-black border + flickering noise). Driven by `setLevel(0–1)`.

**`RitualCanvas`** — Orchestrator. Holds all seven layers and routes native DOM pointer events by phase:
- **SEAL**: snap `fromNode` on down → trace → snap `toNode` on up → `SealReconstructor.attemptConnection()`
- **GLYPH**: stroke → `GlyphRecognizer.recognize()` → place glyph at stroke centroid
- **RING**: stroke in pixel space → `BindingRingEvaluator.evaluate()` → normalise `center` by `(w, h)` and `radius` by `min(w, h)` before storing

---

## Key Conventions

- **Coordinate spaces**: `StrokeEvaluator` and `BindingRingEvaluator` work in pixel space. `SealReconstructor` and `GlyphRecognizer` normalise internally via `normalizePathToUnitSpace`. All stored values and layer inputs use normalised 0–1 (ring radius is in units of `min(w, h)`).
- **Engine purity**: No PixiJS or DOM imports inside `src/engine/`. No game logic outside `src/engine/`.
- **Branded IDs**: Cast `NodeId` / `GlyphId` only at definition sites.
- **Edge weights**: All edges for a given demon must sum to ~1.0.

---

## Path Aliases

Configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`:

| Alias | Resolves to |
|---|---|
| `@engine` / `@engine/*` | `src/engine` / `src/engine/*` |
| `@canvas` / `@canvas/*` | `src/canvas` / `src/canvas/*` |
| `@stores` / `@stores/*` | `src/stores` / `src/stores/*` |
| `@services` / `@services/*` | `src/services` / `src/services/*` |
| `@db` / `@db/*` | `src/db` / `src/db/*` |

---

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml` → `npm ci` → `npm run build` → deploy `dist/` via `actions/deploy-pages`. `vite.config.ts` has `base: './'` for correct asset paths on GitHub Pages. Set **Settings > Pages** source to **GitHub Actions**.
