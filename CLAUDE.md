# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Goetia is a browser-based occult game where players craft sigils to summon and bind demons from the Ars Goetia. The core mechanic is a three-layer ritual drawing system:

1. **Foundation Seal** — the player traces the unique geometric seal of the chosen demon
2. **Intent Glyphs** — the player inscribes symbolic glyphs that declare purpose and shape the binding
3. **Binding Ring** — the player draws a closing circle to seal the ritual

Completed sigils are stored in a personal **grimoire**.

**This codebase is scaffolding only.** No game logic is implemented yet (canvas, stores, services, db layers are empty).

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
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

## Tech Stack

| Package | Role |
|---|---|
| `vite` | Build tool and dev server |
| `typescript` | Language (strict mode) |
| `pixi.js` v8 | 2D WebGL/WebGPU canvas rendering |
| `zustand` | Minimal global state management |
| `vite-plugin-pwa` | Progressive Web App support with auto-update |
| `vitest` | Unit test runner (globals: true) |

---

## Architecture

The codebase is organized into four layers:

```
engine  →  canvas  →  stores  →  services
```

**engine** (`src/engine/`) — Pure TypeScript game logic. No UI imports, no PixiJS, no side effects. Unit-tested independently.

**canvas** (`src/canvas/`) — PixiJS rendering and input handling. Translates engine results into visual output and touch events into engine input. All coordinates leaving the canvas layer are normalized 0–1.

**stores** (`src/stores/`) — Zustand state slices. Owns runtime state.

**services** (`src/services/`) — External integrations (audio, haptics, network).

**db** (`src/db/`) — Persistence layer.

---

## Engine Internals

All implemented logic lives in `src/engine/sigil/`. Key modules:

**`Types.ts`** — All shared types. Central source of truth for `Point`, `Sigil`, `Demon`, `StrokeResult`, `RingResult`, `GlyphResult`, and branded ID types (`NodeId`, `GlyphId`). Every engine value is in normalized 0–1 coordinate space.

**`geometry.ts`** — Pure geometry utilities: `normalizePathToUnitSpace`, `resamplePath`, `discreteFrechetDistance`, `fitCircle` (Kasa algebraic least-squares), `signedArea` (shoelace formula), `doesPathSelfIntersect`, `isPathClosed`, and statistical helpers.

**`StrokeEvaluator`** — Stateful class: call `addPoint(PointerInputEvent)` during drawing, then `finalize()` to get a `StrokeResult`. Internally deduplicates close points, applies Ramer–Douglas–Peucker simplification (`rdpSimplify`), samples pressure along arc length, and computes per-vertex curvature. Coordinates are in **pixel space** (not normalized) — normalization happens downstream.

**`GlyphLibrary.ts`** — Defines 12 glyph templates across three semantic groups (Vector, Quality, Duration). Each template has a canonical normalized path, stroke count, and geometric invariants (`must_close`, `must_not_close`, `must_self_intersect`, `clockwise`, `counterclockwise`). Use `GLYPHS` constants for IDs, `getGlyphTemplate(id)` to retrieve a template.

**`GlyphRecognizer`** — Stateless class. `recognize(strokes: StrokeResult[])` returns a `GlyphResult`. Pipeline: combine strokes → normalize → resample to 32 points → filter templates by stroke count and invariants → score via Procrustes analysis → return top match above 0.55 confidence threshold.

**`BindingRingEvaluator`** — Stateless class. `evaluate(stroke)` fits a circle (Kasa), then computes circularity (RMS deviation), closure (gap/diameter ratio), consistency (pressure std dev), and weak points (16-segment angular bucketing). `overallStrength = circularity*0.4 + closure*0.35 + consistency*0.25 − weakPoints*0.05`.

**`DemonRegistry.ts`** — Contains `DEMON_REGISTRY` (6 demons: Bael, Agares, Vassago, Samigina, Marbas, Valefor) and `getDemon(id)` / `listDemons()`. Each `Demon` has `SealGeometry` (nodes + weighted edges, edge weights sum to ~1.0). Throws `DemonNotFoundError` for unknown IDs.

---

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts` (and `vitest.config.ts`):

| Alias | Resolves to |
|---|---|
| `@engine` / `@engine/*` | `src/engine` / `src/engine/*` |
| `@canvas` / `@canvas/*` | `src/canvas` / `src/canvas/*` |
| `@stores` / `@stores/*` | `src/stores` / `src/stores/*` |
| `@services` / `@services/*` | `src/services` / `src/services/*` |
| `@db` / `@db/*` | `src/db` / `src/db/*` |

---

## Development Conventions

- **Engine modules are pure TypeScript.** No UI imports, no PixiJS imports in `src/engine/`.
- **All coordinates in the engine are normalized 0–1.** `StrokeEvaluator` receives pixel-space input; normalization to 0–1 must happen in the canvas layer before passing data deeper.
- **No game logic in canvas, stores, or services.** Logic belongs in the engine; other layers orchestrate and render.
- **Branded ID types** (`NodeId`, `GlyphId`) prevent mixing string identifiers. Use casts at definition sites only.
- **Edge weights per demon sum to ~1.0** — maintain this invariant when adding new seal geometries.

---

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml` → `npm ci` → `npm run build` → deploy `dist/` to `gh-pages` via `peaceiris/actions-gh-pages`.

Set repository **Settings > Pages** source to `gh-pages` branch.
