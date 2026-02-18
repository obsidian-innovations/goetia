# CLAUDE.md — Goetia

## Project Overview

A browser and mobile occult game where players craft sigils to summon and bind demons from the Ars Goetia. Players draw sigils through a three-layer system — foundation seal, intent glyphs, binding ring — and store them in a personal grimoire. The game spans PvE demon binding and PvP sigil combat. This codebase is **Phase 1: the ritual canvas and grimoire only**. No multiplayer, no charging system, no location services yet.

Built with Expo (SDK 54) targeting iOS, Android, and web from a single TypeScript codebase.

---

## Architecture Overview

The codebase is organized into four layers:

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| **Engine** | `src/engine/` | Pure TypeScript game logic — sigil evaluation, demon data, grimoire rules. Zero UI dependencies. Must stay that way. |
| **Canvas** | `src/canvas/` | Skia rendering and gesture handling. All pixel-level drawing lives here. |
| **Stores** | `src/stores/` | Zustand state management. Reactive state slices for canvas, grimoire, and user. |
| **Services** | `src/services/` | External integrations — Supabase auth, haptics, audio. |

The deliberate separation between **evaluation logic** (engine) and **rendering** (canvas) is a core architectural invariant. The engine produces numeric scores, match results, and state objects. The canvas reads those results and draws them. The engine never imports from canvas, stores, or services. Data flows one direction: touch input → engine evaluation → store update → canvas re-render.

An additional layer exists for persistence:

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| **DB** | `src/db/` | WatermelonDB schema, models, and migrations for structured grimoire data. |

---

## Tech Stack

| Dependency | Version | Why it was chosen / what it owns |
|------------|---------|----------------------------------|
| **Expo** | ~54.0.33 | Managed React Native workflow. Owns build tooling, dev server, OTA updates. |
| **React Native** | 0.81.5 | Cross-platform native runtime. New Architecture enabled. |
| **React** | 19.1.0 | UI component model. |
| **@shopify/react-native-skia** | ^2.4.21 | GPU-accelerated 2D drawing. Owns all sigil rendering — seals, glyphs, rings, atmospheric effects. Chosen over Canvas API for consistent cross-platform performance and shader support. |
| **react-native-gesture-handler** | ^2.30.0 | Touch and gesture recognition. Owns all drawing input — pan, pressure, multi-touch. Chosen for its declarative gesture system and Reanimated compatibility. |
| **Zustand** | ^5.0.11 | Lightweight reactive state. Owns all global state slices (canvas, grimoire, user). Chosen over Redux for minimal boilerplate and subscriptions. |
| **react-native-mmkv** | ^4.1.2 | Synchronous key-value storage. Owns session-level ephemeral data (current demon selection, drawing phase, preferences). Chosen for speed — synchronous reads with no async overhead. |
| **@nozbe/watermelondb** | ^0.28.0 | Lazy-loading relational database. Owns structured grimoire data (sigils, demons bound, lore unlocked). Chosen for offline-first design and future sync capability. |
| **expo-sqlite** | ^16.0.10 | SQLite adapter for WatermelonDB on Expo. Required bridge between WatermelonDB and Expo's managed SQLite. |
| **@supabase/supabase-js** | ^2.96.0 | Backend-as-a-service client. Owns auth, cloud grimoire backup, and future multiplayer APIs. Chosen for PostgreSQL backend, row-level security, and realtime subscriptions. |
| **expo-status-bar** | ~3.0.9 | Platform-adaptive status bar styling. |
| **TypeScript** | ~5.9.2 | Language. Strict mode enabled. |
| **Jest** | ^30.2.0 | Test runner. |
| **ts-jest** | ^29.4.6 | TypeScript preprocessor for Jest. |
| **babel-plugin-module-resolver** | ^5.0.2 | Runtime resolution of TypeScript path aliases (`@engine`, `@canvas`, etc.). |

**Not yet in package.json but referenced in design docs:** `expo-haptics` (tactile feedback), `expo-av` (audio playback), `expo-router` (file-based routing). These will be added when their respective modules move beyond stub phase.

---

## Directory Structure

```
/
├── CLAUDE.md                          # This file — AI assistant reference
├── App.tsx                            # Root React component (placeholder scaffold)
├── index.ts                           # Expo entry point — registers App component
├── app.json                           # Expo project config (portrait, new arch, tablet support)
├── tsconfig.json                      # TypeScript strict mode + path aliases
├── babel.config.js                    # Babel preset + module-resolver for path aliases
├── jest.config.js                     # ts-jest config, roots in src/, maps @engine alias
├── package.json                       # Dependencies and scripts
├── package-lock.json                  # Lockfile
├── README.md                          # Project overview and getting started
│
├── assets/
│   ├── icon.png                       # App icon
│   ├── splash-icon.png                # Splash screen image
│   ├── adaptive-icon.png              # Android adaptive icon
│   └── favicon.png                    # Web favicon
│
└── src/
    ├── engine/                        # Pure game logic — NO UI imports, NO side effects
    │   ├── index.ts                   # Barrel export: re-exports sigil, demons, grimoire
    │   ├── sigil/
    │   │   ├── index.ts               # Barrel export: Types + StrokeEvaluator
    │   │   ├── Types.ts               # Canonical type definitions for the entire engine
    │   │   ├── StrokeEvaluator.ts     # Stroke analysis: RDP simplification, velocity, pressure, curvature
    │   │   └── StrokeEvaluator.test.ts  # Unit tests for StrokeEvaluator (7 test cases)
    │   ├── demons/
    │   │   ├── index.ts               # Barrel export: getDemon, listDemons
    │   │   └── DemonRegistry.ts       # Static registry of 6 Phase 1 demons with seal geometries
    │   └── grimoire/
    │       └── index.ts               # Stub — will own grimoire query logic and lore unlock rules
    │
    ├── canvas/                        # Skia rendering + gesture handling
    │   └── index.ts                   # Stub — will own AtmosphericLayer, SealLayer, GlyphLayer, BindingRingLayer
    │
    ├── stores/                        # Zustand state slices
    │   └── index.ts                   # Stub — will own canvasStore, grimoireStore, userStore
    │
    ├── db/                            # WatermelonDB schema and models
    │   ├── index.ts                   # Stub — will own database initialization, GrimoireManager
    │   └── migrations/
    │       └── .gitkeep               # Placeholder for future migration files
    │
    └── services/                      # External integrations
        └── index.ts                   # Stub — will own Supabase client, haptics wrapper, audio wrapper
```

### File-level constraints

| File | What it does | What it must not do |
|------|-------------|---------------------|
| `Types.ts` | Defines all engine interfaces and type unions | Import from any other module. Types flow outward only. |
| `StrokeEvaluator.ts` | Takes raw TouchEvent array, produces StrokeResult | Import UI libraries. Cause side effects. Access global state. |
| `DemonRegistry.ts` | Defines 6 demons with seal geometries, exposes getDemon/listDemons | Make network calls. Import from canvas or stores. Mutate demon data at runtime. |
| `App.tsx` | Root component mount point | Contain game logic or direct Skia calls. |

---

## TypeScript Path Aliases

Configured in both `tsconfig.json` (type checking) and `babel.config.js` (runtime resolution):

| Alias | Resolves to |
|-------|------------|
| `@engine` / `@engine/*` | `src/engine/` |
| `@canvas` / `@canvas/*` | `src/canvas/` |
| `@stores` / `@stores/*` | `src/stores/` |
| `@db` / `@db/*` | `src/db/` |
| `@services` / `@services/*` | `src/services/` |

Jest maps `@engine` in `jest.config.js` via `moduleNameMapper`. Other aliases will need entries added as their modules are implemented.

---

## Core Data Types

`src/engine/sigil/Types.ts` is the canonical source of truth for all engine types. Do not duplicate type definitions elsewhere.

### Key interfaces

| Type | Purpose | Key fields |
|------|---------|------------|
| `Point` | 2D coordinate | `x`, `y` |
| `TouchEvent` | Raw input event | `x`, `y`, `pressure` (0–1), `timestamp` |
| `StrokeResult` | Analyzed stroke output | `pathPoints`, `averageVelocity`, `pressureProfile` (20 samples), `curvature`, `duration`, `startPoint`, `endPoint` |
| `NodeId` | Branded string for seal nodes | — |
| `NodeConnection` | Expected path between two seal nodes | `fromNode`, `toNode`, `expectedPath`, `tolerance` (`maxDeviation`, `maxAngularError`) |
| `ConnectionResult` | Validation of a drawn stroke against expected path | `attempted`, `accuracy`, `deviationMap`, `valid` |
| `GlyphId` | Branded string for glyph identifiers | — |
| `GlyphInvariant` | Geometric constraint on a glyph | `must_close`, `must_self_intersect`, `must_not_close`, `single_stroke`, `multi_stroke` |
| `GlyphTemplate` | Canonical glyph definition | `id`, `strokeCount`, `invariants`, `canonicalPath` |
| `GlyphResult` | Recognition output | `recognized` (GlyphId or null), `confidence`, `alternates` |
| `ArcSegment` | Section of the binding ring | `startAngle`, `endAngle`, `strength` |
| `RingResult` | Circle analysis output | `circularity`, `closure`, `consistency`, `overallStrength`, `weakPoints` |
| `Demon` | Complete demon definition | `id`, `name`, `rank`, `domains`, `legions`, `sealGeometry`, `loreFragments`, `attributes` |
| `PlacedGlyph` | Glyph positioned on a sigil | `glyphId`, `position`, `rotation`, `confidence` |
| `IntentCoherenceResult` | Coherence of glyph combination | `score`, `contradictions`, `incompleteChains` |
| `Sigil` | Complete sigil state | `id`, `demonId`, `sealIntegrity`, `glyphs`, `intentCoherence`, `bindingRing`, `overallIntegrity`, `visualState`, `createdAt`, `status` |

### Important type unions

| Union | Values |
|-------|--------|
| `DemonRank` | `King`, `Duke`, `Prince`, `Marquis`, `Earl`, `Knight`, `President`, `Baron` |
| `DemonDomain` | `knowledge`, `destruction`, `illusion`, `binding`, `transformation`, `discord`, `protection`, `revelation`, `liberation` |
| `SigilStatus` | `draft`, `complete`, `resting`, `awakened`, `charged`, `spent` |
| `SigilVisualState` | `dormant`, `unstable`, `healthy`, `corrupted`, `charged` |

### Invariants

- `overallIntegrity` on a `Sigil` is always a weighted composite of `sealIntegrity`, `intentCoherence.score`, and `bindingRing.overallStrength`. It must never be set directly — it is computed by `SigilComposer`.
- `SigilStatus` transitions are one-directional: `draft` → `complete` → `resting` → `awakened` → `charged` → `spent`. Never skip states.
- `pressureProfile` on `StrokeResult` always contains exactly 20 samples, regardless of stroke length.
- All branded types (`NodeId`, `GlyphId`) use a compile-time branding pattern. Cast through the brand only in factory functions.

---

## Engine Modules

All engine modules live under `src/engine/`. They are pure TypeScript with zero UI dependencies.

### StrokeEvaluator (`src/engine/sigil/StrokeEvaluator.ts`)

**What it does:** Accepts raw touch events and produces a `StrokeResult` containing simplified path, velocity, pressure profile, and curvature.

**Accepts:** `TouchEvent` objects via `addPoint()`.

**Returns:** `StrokeResult` via `finalize()`.

**Key algorithms:**
- **Ramer-Douglas-Peucker** path simplification (epsilon = 2.0) — recursively removes points within perpendicular distance threshold of the line between endpoints.
- **Rolling window velocity** — computes instantaneous velocity between consecutive points, smooths with a window of 5 samples, returns the grand mean.
- **Arc-length pressure resampling** — computes cumulative arc lengths, samples pressure at 20 equally-spaced intervals using linear interpolation.
- **Signed curvature** — cross product of adjacent direction vectors at simplified path vertices: `κ = (v1 × v2) / (|v1| · |v2|)`, returns mean across all interior points.

**Must never:** Import UI libraries. Access global state. Produce side effects. Pressure normalization happens internally (0 → 0.5 default).

**Constants:** `RDP_EPSILON = 2.0`, `VELOCITY_WINDOW = 5`, `PRESSURE_SAMPLES = 20`, `DEFAULT_PRESSURE = 0.5`.

### SealReconstructor (not yet implemented)

**What it will do:** Compare a player's drawn strokes against a demon's `SealGeometry` to produce `ConnectionResult` objects.

**Key algorithm:** Frechet distance — measures similarity between the drawn path and the expected path for each `NodeConnection`, accounting for the traversal order.

**Will accept:** Array of `StrokeResult`, target `SealGeometry`.

**Will return:** Array of `ConnectionResult`, aggregate `sealIntegrity` score.

**Must never:** Modify demon data. Import from canvas.

### GlyphRecognizer (not yet implemented)

**What it will do:** Identify which glyph a player has drawn by comparing strokes against the `GlyphTemplate` library.

**Key algorithm:** Procrustes analysis — optimal rotation, translation, and scaling alignment of the drawn path to each canonical glyph path, then distance comparison.

**Will accept:** `StrokeResult` (one or more strokes).

**Will return:** `GlyphResult` with confidence scores and alternates.

**Must never:** Import from canvas. Apply glyph effects — that is the composer's job.

### BindingRingEvaluator (not yet implemented)

**What it will do:** Analyze the player's drawn binding ring for circularity, closure, and consistency.

**Key algorithm:** Least-squares circle fitting — finds the center and radius that minimize the sum of squared radial deviations, then evaluates arc-by-arc consistency.

**Will accept:** `StrokeResult` of the ring stroke.

**Will return:** `RingResult`.

**Must never:** Import from canvas. Render anything.

### SigilComposer (not yet implemented)

**What it will do:** Combine seal results, glyph results, ring results, and coherence into a final `Sigil` object. Computes `overallIntegrity` as a weighted composite. Determines `SigilVisualState` from integrity thresholds.

**Will accept:** `ConnectionResult[]`, `PlacedGlyph[]`, `IntentCoherenceResult`, `RingResult`, demon ID.

**Will return:** `Sigil`.

**Must never:** Import from canvas. Draw anything. Visual state thresholds (dormant, unstable, healthy, corrupted, charged) map to integrity ranges defined exclusively in this module — do not hardcode thresholds elsewhere.

### IntentCoherenceChecker (not yet implemented)

**What it will do:** Evaluate whether a combination of placed glyphs forms a coherent intent. Detect contradictions (opposing glyph pairs) and incomplete chains (glyphs that require companions).

**Will accept:** `PlacedGlyph[]`, demon's `DemonDomain[]`.

**Will return:** `IntentCoherenceResult`.

**Must never:** Import from canvas. Duplicate coherence rules — all rules live exclusively in this module.

---

## Demon Registry

`src/engine/demons/DemonRegistry.ts`

The registry is **static data shipped with the app** — no API call required, works fully offline. Demons are defined as a `readonly Demon[]` array and indexed into a `Record<string, Demon>` map at module load time.

### Public API

- `getDemon(id: string): Demon | undefined` — look up a demon by ID.
- `listDemons(): readonly Demon[]` — get the full list.

### Phase 1 Demons

| # | ID | Name | Rank | Primary Domain | Nodes | Connections |
|---|-----|------|------|---------------|-------|-------------|
| 1 | `bael` | Bael | King | illusion | 8 | 9 |
| 2 | `agares` | Agares | Duke | knowledge | 7 | 9 |
| 3 | `vassago` | Vassago | Prince | revelation | 7 | 8 |
| 4 | `samigina` | Samigina | Marquis | knowledge | 9 | 12 |
| 5 | `marbas` | Marbas | President | knowledge | 7 | 10 |
| 6 | `valefor` | Valefor | Duke | discord | 6 | 9 |

### Seal geometry conventions

- All node positions use **normalized coordinates 0–1**. They must be scaled to canvas dimensions at render time, never stored in pixels.
- Default connection tolerance: `maxDeviation = 0.08`, `maxAngularError = 15` degrees.
- Helper functions `nodeId()`, `node()`, `conn()`, `seal()` are internal to the registry file and handle type branding and structure creation.

---

## Glyph System

Glyph types and templates are defined in `Types.ts`. The concrete glyph library (12 glyphs with canonical paths, invariants, and intent meanings) will be populated when `GlyphRecognizer` is implemented.

### Planned glyphs (12 total)

The glyph system uses `GlyphId` branded strings. Each glyph has:
- An intent meaning (what the player is commanding)
- A geometric form (the shape the player draws)
- One or more `GlyphInvariant` constraints (must_close, single_stroke, etc.)

### Coherence rules

Coherence rules will live **exclusively** in `IntentCoherenceChecker`. They define:
- **Contradictions** — pairs of glyphs with opposing intents that cannot coexist (e.g., a binding glyph and a liberation glyph on the same sigil).
- **Incomplete chains** — glyphs that require companion glyphs to form valid intent (e.g., a transformation glyph without a target domain glyph).
- **Domain alignment** — how glyph intents align with the target demon's domains, affecting coherence score.

Coherence rules must not be duplicated in any other module.

---

## Canvas Architecture

The canvas layer (`src/canvas/`) uses `@shopify/react-native-skia` for all rendering.

### Layer composition order

Layers are composited in this order (back to front):

1. **AtmosphericLayer** — background ambiance, particle effects, ritual circle glow
2. **SealLayer** — the demon's foundation seal (nodes and connections)
3. **GlyphLayer** — intent glyphs drawn by the player
4. **BindingRingLayer** — the outer binding circle

### Constraints

- **No React Native View components inside Skia layers** — only Skia primitives (`Path`, `Circle`, `Group`, `Paint`, etc.).
- Canvas sizing uses `onLayout` — never hardcoded dimensions.

### Drawing state machine

The ritual canvas follows a three-phase state machine:

```
SEAL_PHASE → GLYPH_PHASE → RING_PHASE → COMPLETE
```

Legal transitions:
- `SEAL_PHASE` → `GLYPH_PHASE` (when all required seal connections are drawn)
- `GLYPH_PHASE` → `RING_PHASE` (when at least one glyph is placed)
- `RING_PHASE` → `COMPLETE` (when the binding ring is closed)
- `COMPLETE` → no further transitions on the canvas (sigil is composed and stored)

No backward transitions. If the player wants to redo, they start a new sigil.

---

## State Management

Three Zustand stores are planned:

### canvasStore

**Owns:** Active ritual state only — current demon, drawing phase, in-progress strokes, partial seal results, placed glyphs, ring data.

**Must not own:** Persisted data, auth state, grimoire history.

**Reset behavior:** Fully reset on demon change and after sigil composition. Never carries state between rituals.

### grimoireStore

**Owns:** Persisted sigil data — completed sigils, demon binding records, lore unlocks.

**Delegates:** All reads/writes go through `GrimoireManager` (in `src/db/`), which handles WatermelonDB operations.

**Must not own:** Active drawing state, auth tokens.

### userStore

**Owns:** Auth state only — user ID, session token, profile data.

**Must not own:** Game state, grimoire data.

---

## Persistence Layer

Two-tier persistence architecture:

### Tier 1: MMKV (session-level)

`react-native-mmkv` provides synchronous key-value storage for ephemeral data:
- Current demon selection
- Drawing phase
- User preferences (haptic intensity, sound volume)
- Last-used settings

Data here is expendable — losing it means at most reselecting a demon.

### Tier 2: WatermelonDB (structured)

`@nozbe/watermelondb` with `expo-sqlite` adapter provides relational storage for grimoire data:
- Completed sigils with full evaluation data
- Demon binding history
- Lore fragment unlock state
- Sigil status progression

### Sync strategy (Phase 1)

- **Local is source of truth.** All data lives in WatermelonDB on-device.
- **Sync to Supabase is on-demand** — triggered explicitly by the user, not automatic.
- **Conflict resolution always prefers local** — the player's device is authoritative.
- **WatermelonDB's built-in sync protocol is deliberately not used in Phase 1.** It is deferred to Phase 5 when multiplayer requires real bidirectional sync. The seam exists in `src/db/` but the sync adapter is not wired.

---

## Platform Differences

| Behavior | Mobile | Web |
|----------|--------|-----|
| Haptics | Native haptic engine via `expo-haptics` | Fails silently — no haptic API in browsers |
| Pressure input | Reports actual stylus/finger pressure (0–1) | Defaults to 0.5 (no pressure API) |
| Canvas sizing | `onLayout` callback with device dimensions | `onLayout` callback with viewport dimensions |
| Audio | Native audio via `expo-av` | Web Audio API fallback via `expo-av` |
| SQLite | Native SQLite via `expo-sqlite` | `expo-sqlite` web adapter |

**Key rule:** Never hardcode canvas dimensions. Always derive from `onLayout`.

---

## What Is Deliberately Deferred

These systems are designed for but **not implemented** in Phase 1. For each, the seam in the codebase is noted.

| System | Phase | Seam location |
|--------|-------|---------------|
| **Charging timer** | Phase 2 | `SigilStatus` has `charged` value. `Sigil` has `createdAt` timestamp. Timer logic will be added to `SigilComposer`. |
| **Demonic demands** | Phase 2 | `Demon` has `attributes` array. Demand rules will extend the `Demon` interface and add a `DemandEvaluator` to `src/engine/`. |
| **Location / Thin Places** | Phase 3 | `DemonDomain` is extensible. Location-based domain bonuses will add a `LocationService` to `src/services/`. |
| **PvP clash resolution** | Phase 4 | `Sigil` has `overallIntegrity` for comparison. Clash logic will be a new engine module. |
| **Coven system** | Phase 4 | No seam yet — will extend `userStore` with coven membership. |
| **Corruption arc** | Phase 3 | `SigilVisualState` has `corrupted` value. Corruption triggers will be added to `SigilComposer`. |
| **Full 72 demon roster** | Phase 2+ | `DemonRegistry` is an array — add entries. `DemonRank` and `DemonDomain` unions cover all 72 demons' ranks and domains. |
| **WatermelonDB sync protocol** | Phase 5 | `src/db/migrations/` directory exists. Sync adapter will be wired in `src/db/`. |
| **Push notifications** | Phase 5 | No seam yet — will add `expo-notifications` and a service in `src/services/`. |

---

## Development Conventions

- **Engine modules are pure TypeScript, tested with unit tests, no exceptions.** Every engine module must have a corresponding `.test.ts` file. No UI imports, no side effects, no global state access.
- **All coordinates in engine are normalized 0–1.** Scaling to pixels happens only in the canvas layer. Never store pixel coordinates in engine types.
- **Haptic and audio calls always go through `@services/haptics` and `@services/audio`**, never directly through `expo-haptics` or `expo-av`. This ensures platform-safe fallbacks.
- **New demon domains** require updates in:
  1. `Types.ts` — `DemonDomain` union
  2. `IntentCoherenceChecker` — coherence rules
  3. `DemonRegistry` — new demon entries
- **New glyph types** require updates in:
  1. `Types.ts` — `GlyphId` values (and potentially `GlyphInvariant` if new constraints are needed)
  2. `GlyphRecognizer` — canonical path library
  3. `IntentCoherenceChecker` — coherence rules
- **Visual state thresholds** (dormant, unstable, healthy, corrupted, charged) map to integrity ranges defined in `SigilComposer`. Do not hardcode thresholds anywhere else.
- **SigilStatus transitions must be validated.** Do not skip states. The progression is strictly: `draft` → `complete` → `resting` → `awakened` → `charged` → `spent`.
- **Barrel exports** — each top-level directory has an `index.ts` barrel. Import from the barrel (`@engine`) for public API; import from specific files (`@engine/sigil/Types`) only within the same layer.
- **TypeScript strict mode** is enabled and must not be weakened. No `any` types without explicit justification.

---

## Running the Project

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Start for web
npx expo start --web

# Start for iOS simulator
npx expo start --ios

# Start for Android emulator
npx expo start --android

# Run tests
npm test

# Run tests in watch mode
npx jest --watch

# Check TypeScript (type-check only, no emit)
npx tsc --noEmit

# Build for production (EAS Build)
npx eas build --platform all
```

---

## Environment Variables

No `.env` file exists yet. The following variables will be required when services are wired:

| Variable | Required for | Description |
|----------|-------------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase features | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase features | Supabase anonymous/public API key |

**For offline-only use (Phase 1 default):** No environment variables are required. The engine, canvas, and local persistence work entirely offline. Supabase variables are only needed if cloud grimoire backup or auth is enabled.
