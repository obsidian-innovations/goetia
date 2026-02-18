# CLAUDE.md — Goetia

Primary reference for any AI assistant working on this codebase. Written to make a new session with no prior context fully operational. Read it completely before writing any code.

---

## Project Overview

Goetia is a browser and mobile occult game where players craft sigils to summon and bind demons from the Ars Goetia (The Lesser Key of Solomon). The core mechanic is a three-layer ritual drawing system:

1. **Foundation Seal** — the player traces the unique geometric seal of the chosen demon
2. **Intent Glyphs** — the player inscribes symbolic glyphs that declare purpose and shape the binding
3. **Binding Ring** — the player draws a closing circle to seal the ritual

Completed sigils are stored in a personal **grimoire**. The long-term game spans PvE demon binding and PvP sigil combat.

**This codebase is Phase 1 only.** It implements the ritual canvas and grimoire. No multiplayer, no charging timer, no demonic demands, no location services, no push notifications. These systems are designed for but deliberately deferred.

---

## Architecture Overview

The codebase is organized into four layers. The boundary between them is enforced by convention and must be maintained.

```
engine  →  canvas  →  stores  →  services
  ↑                       ↑
(pure TS)            (Zustand slices)
```

**engine** (`src/engine/`)
Pure TypeScript game logic. No UI imports, no React, no side effects. The engine evaluates player input, computes scores, validates sigils, and manages demon data. It is the only layer covered by unit tests. If an engine file imports anything from React Native or Expo, that is a bug.

**canvas** (`src/canvas/`)
Skia rendering and gesture handling. This layer translates engine results into visual output and translates touch events into engine input. It imports from `@engine` and calls Zustand stores but has no business logic of its own. All coordinates leaving the canvas layer are normalized 0–1 before being handed to the engine.

**stores** (`src/stores/`)
Zustand state slices. Owns runtime state, delegates persistence reads/writes to services. Does not contain game logic. Does not call Skia directly.

**services** (`src/services/`)
External integrations: Supabase, haptics, audio. All haptic and audio calls go through `@services/haptics` and `@services/audio` — never directly through `expo-haptics` or `expo-av` at the call site. This allows the service layer to fail silently on web without scattering try/catch blocks everywhere.

The deliberate separation between **evaluation logic** (engine) and **rendering** (canvas) means every scoring algorithm is independently testable without a simulator.

---

## Tech Stack

| Package | Version | Role |
|---|---|---|
| `expo` | ~54.0.33 | Managed workflow; handles native builds, OTA, and platform shims |
| `@shopify/react-native-skia` | ^2.4.21 | GPU-accelerated 2D canvas for sigil rendering; chosen for Skia's Bezier and path primitives |
| `react-native-gesture-handler` | ^2.30.0 | Low-latency touch event pipeline; provides pressure data where available |
| `zustand` | ^5.0.11 | Minimal global state; one slice per domain, no boilerplate |
| `react-native-mmkv` | ^4.1.2 | Fast key-value store for session-level ephemeral data (active ritual state) |
| `@nozbe/watermelondb` | ^0.28.0 | Relational local database for structured grimoire records |
| `expo-sqlite` | ^16.0.10 | SQLite adapter WatermelonDB uses under the hood on Expo |
| `@supabase/supabase-js` | ^2.96.0 | Remote backend: auth, on-demand sync of grimoire data |
| `expo-status-bar` | ~3.0.9 | Status bar styling |

**Planned dependencies not yet installed** (required before their feature areas are implemented):

| Package | Role |
|---|---|
| `expo-haptics` | Haptic feedback for ritual events; must be wrapped in `@services/haptics` |
| `expo-av` | Audio playback for ambient and ritual sounds; must be wrapped in `@services/audio` |
| `expo-router` | File-based navigation; required before multi-screen layout is implemented |

---

## Directory Structure

```
goetia/
├── assets/                        # Static images; no game logic
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── src/
│   ├── engine/                    # Pure TypeScript game logic — zero UI dependencies
│   │   ├── index.ts               # Barrel: re-exports sigil, demons, grimoire
│   │   ├── sigil/
│   │   │   ├── index.ts           # Barrel: re-exports Types and StrokeEvaluator
│   │   │   ├── Types.ts           # Canonical type definitions — see Core Data Types section
│   │   │   ├── StrokeEvaluator.ts # Touch → StrokeResult; no UI imports, no side effects
│   │   │   └── StrokeEvaluator.test.ts  # Jest unit tests for StrokeEvaluator
│   │   ├── demons/
│   │   │   ├── index.ts           # Barrel: getDemon, listDemons
│   │   │   └── DemonRegistry.ts   # Static 6-demon registry; no API calls; offline-safe
│   │   └── grimoire/
│   │       └── index.ts           # Stub; grimoire engine logic goes here
│   ├── canvas/
│   │   └── index.ts               # Stub; Skia layers and gesture wiring go here
│   ├── stores/
│   │   └── index.ts               # Stub; Zustand slices go here
│   ├── services/
│   │   └── index.ts               # Stub; Supabase client, haptics wrapper, audio wrapper go here
│   └── db/
│       ├── index.ts               # Stub; WatermelonDB setup and model exports go here
│       └── migrations/
│           └── .gitkeep           # Directory placeholder for future schema migrations
├── App.tsx                        # Root component; placeholder until Expo Router is added
├── index.ts                       # Expo entry point; calls registerRootComponent
├── app.json                       # Expo config: slug, icons, orientation, architecture flags
├── babel.config.js                # babel-preset-expo + module-resolver for path aliases
├── jest.config.js                 # ts-jest, node environment, @engine alias mapped for tests
├── package.json                   # Dependencies and npm scripts
├── tsconfig.json                  # strict mode; path aliases for @engine, @canvas, @stores, @db, @services
└── CLAUDE.md                      # This file
```

**File rules:**
- `StrokeEvaluator.ts` — takes raw touch events, produces `StrokeResult` — no UI imports, no side effects
- `DemonRegistry.ts` — static data only — no fetch calls, no async, no side effects
- `Types.ts` — type definitions only — no runtime code, no imports from outside the sigil directory
- Any file under `src/engine/` — must never import from `react-native`, `expo`, `@shopify/react-native-skia`, or any UI package

---

## Path Aliases

Configured in both `tsconfig.json` and `babel.config.js`:

| Alias | Resolves to |
|---|---|
| `@engine` | `src/engine/index.ts` |
| `@engine/*` | `src/engine/*` |
| `@canvas` | `src/canvas/index.ts` |
| `@canvas/*` | `src/canvas/*` |
| `@stores` | `src/stores/index.ts` |
| `@stores/*` | `src/stores/*` |
| `@db` | `src/db/index.ts` |
| `@db/*` | `src/db/*` |
| `@services` | `src/services/index.ts` |
| `@services/*` | `src/services/*` |

The Jest config separately maps `@engine` and `@engine/*` for the test environment.

---

## Core Data Types

**Canonical source: `src/engine/sigil/Types.ts`**

All types are defined here. Do not redefine or shadow them elsewhere.

### Branded primitives

```ts
type NodeId = Brand<string, 'NodeId'>;
type GlyphId = Brand<string, 'GlyphId'>;
```

Branded types prevent accidental substitution. Cast with `id as NodeId` only inside registry or engine code.

### Key interfaces

**`Point`** — `{ x: number; y: number }`. All coordinates in the engine are normalized 0–1. Scaling to pixels happens only in the canvas layer.

**`TouchEvent`** — `{ x, y, pressure, timestamp }`. Pressure is normalized 0–1. Devices without pressure hardware default to `0.5` (handled in `StrokeEvaluator`).

**`StrokeResult`** — output of `StrokeEvaluator.finalize()`. Contains `pathPoints` (simplified), `averageVelocity`, `pressureProfile` (20 samples), `curvature`, `duration`, `startPoint`, `endPoint`.

**`ConnectionResult`** — result of matching one drawn stroke against a `NodeConnection`. Fields: `attempted`, `accuracy` (0–1), `deviationMap`, `valid`.

**`GlyphResult`** — result of recognizing a drawn glyph. Fields: `recognized` (GlyphId or null), `confidence` (0–1), `alternates`.

**`RingResult`** — result of evaluating the binding ring. Fields: `circularity`, `closure`, `consistency`, `overallStrength`, `weakPoints` (array of `ArcSegment`).

**`Demon`** — `{ id, name, rank, domains, legions, sealGeometry, loreFragments, attributes }`.

**`SealGeometry`** — `{ nodes, connections }`. Nodes hold normalized positions. Connections hold `expectedPath` in normalized coordinates. **Must be scaled to canvas dimensions at render time. Never stored in pixels.**

**`Sigil`** — the composed output of a completed ritual:
```ts
{
  id: string;
  demonId: string;
  sealIntegrity: number;       // 0–1, score from SealReconstructor
  glyphs: PlacedGlyph[];
  intentCoherence: IntentCoherenceResult;
  bindingRing: RingResult;
  overallIntegrity: number;    // weighted composite — never set directly
  visualState: SigilVisualState;
  createdAt: number;
  status: SigilStatus;
}
```

**Invariant: `overallIntegrity` is always a weighted composite of `sealIntegrity`, `intentCoherence.score`, and `bindingRing.overallStrength`. It is computed by `SigilComposer` and must never be set directly from outside.**

**`SigilStatus`** — one-directional state machine:
```
draft → complete → resting → awakened → charged → spent
```
Transitions must never skip states. Validation belongs in `SigilComposer`.

**`SigilVisualState`** — maps to integrity thresholds defined in `SigilComposer`:
```
dormant | unstable | healthy | corrupted | charged
```
Do not hardcode threshold values anywhere other than `SigilComposer`.

**`DemonDomain`** union (current values):
```
'knowledge' | 'destruction' | 'illusion' | 'binding' |
'transformation' | 'discord' | 'protection' | 'revelation' | 'liberation'
```

---

## Engine Modules

### Implemented

#### `StrokeEvaluator` (`src/engine/sigil/StrokeEvaluator.ts`)

**What it does:** Accumulates raw `TouchEvent` inputs from a single stroke gesture and computes a `StrokeResult`.

**API:**
- `addPoint(event: TouchEvent): void` — feed touch events in real time
- `finalize(): StrokeResult` — compute the result; throws if no points have been added
- `reset(): void` — clear all state for reuse

**Key algorithms:**
- **Ramer-Douglas-Peucker (RDP)** path simplification with `epsilon = 2.0`. Recursively reduces touch point count while preserving shape fidelity. The simplified path is what goes into `StrokeResult.pathPoints` and is compared against seal geometry.
- **Rolling-window velocity** with window size 5. Computes instantaneous velocities between sequential points, smooths them with a sliding average, then returns the grand mean.
- **Arc-length pressure resampling.** Pressure is resampled at 20 equally-spaced arc-length intervals using linear interpolation between neighbouring input points. Devices reporting pressure = 0 are normalized to 0.5 (the `DEFAULT_PRESSURE` constant).
- **Signed curvature** via cross product of adjacent direction vectors at each interior simplified point: `κ = (v1 × v2) / (|v1| · |v2|)`. Returns mean curvature across all interior points.

**Must never:** import from React Native, Expo, or Skia. Must never produce side effects. Must never store state between `reset()` calls.

**Tests:** `StrokeEvaluator.test.ts` — covers straight lines (near-zero curvature), circle strokes (nonzero curvature), short strokes, reset behavior, zero-pressure normalization, single-point edge case.

---

#### `DemonRegistry` (`src/engine/demons/DemonRegistry.ts`)

**What it does:** Provides a static, offline registry of all Phase 1 demons. Ships with the app bundle. No network calls.

**API:**
- `getDemon(id: string): Demon | undefined` — look up a demon by string id
- `listDemons(): readonly Demon[]` — return all demons in definition order

**Must never:** make async calls, fetch from a remote source, or mutate the registry after initialization.

---

### Planned (not yet implemented)

These modules are called for in the architecture but do not yet exist. Each belongs in `src/engine/sigil/` and must follow the same constraints as `StrokeEvaluator`: pure TypeScript, no UI imports, unit-tested.

#### `SealReconstructor`

**Planned role:** Accept a sequence of `StrokeResult` objects representing the player's attempt to draw a demon's seal. Compare the drawn path against `SealGeometry.connections` using **Fréchet distance**. Produce a `ConnectionResult` per connection and an aggregate `sealIntegrity` score (0–1).

**Seam for Phase 2:** The `ConnectionResult.accuracy` field will drive per-connection visual feedback in later phases.

#### `GlyphRecognizer`

**Planned role:** Accept a `StrokeResult` (or sequence of strokes for multi-stroke glyphs) and match it against a library of `GlyphTemplate` objects using **Procrustes analysis** (shape alignment via translation, scale, and rotation normalization). Produce a `GlyphResult` with confidence scores.

**Seam for Phase 2:** `GlyphResult.alternates` allows the UI to offer disambiguation when confidence is low.

#### `BindingRingEvaluator`

**Planned role:** Accept a `StrokeResult` representing the player's closing circle and compute a `RingResult`. Uses **least-squares circle fitting** to find the best-fit circle, then measures circularity, closure (gap between start and end point), and angular consistency.

#### `IntentCoherenceChecker`

**Planned role:** Accept an ordered list of `PlacedGlyph` objects and evaluate whether the combination forms a coherent intent. Produces `IntentCoherenceResult` with a score, contradiction pairs, and incomplete chain descriptions.

**Constraint:** All coherence rules live exclusively here. Do not duplicate them in UI components, stores, or other engine modules.

#### `SigilComposer`

**Planned role:** Combine `sealIntegrity`, `IntentCoherenceResult`, and `RingResult` into a final `Sigil`. Computes `overallIntegrity` as a weighted composite. Determines `visualState` from integrity thresholds (these thresholds are defined here and nowhere else). Validates `SigilStatus` transitions.

#### `GrimoireManager`

**Planned role:** Persist, query, and manage the player's collection of `Sigil` records. The `grimoireStore` Zustand slice delegates all reads and writes to this module. Lives in `src/engine/grimoire/`.

---

## Demon Registry

The registry is **static data bundled with the app**. It requires no API call and works fully offline.

### Phase 1 Demons

| id | Name | Rank | Primary Domains |
|---|---|---|---|
| `bael` | Bael | King | illusion, knowledge |
| `agares` | Agares | Duke | knowledge, destruction, liberation |
| `vassago` | Vassago | Prince | revelation, knowledge |
| `samigina` | Samigina | Marquis | knowledge, revelation |
| `marbas` | Marbas | President | knowledge, transformation, destruction |
| `valefor` | Valefor | Duke | discord, illusion, binding |

### Seal geometry invariants

- All node positions and connection paths use normalized coordinates in range [0, 1].
- **Never store or compare coordinates in pixels.** Scale to canvas dimensions at render time only (in the canvas layer).
- `maxDeviation` and `maxAngularError` in `NodeConnection.tolerance` are expressed in normalized units and degrees respectively.

### Adding a new demon

1. Add the `Demon` object to the `DEMONS` array in `DemonRegistry.ts`
2. Add any new `DemonDomain` values to the union in `Types.ts`
3. Update `IntentCoherenceChecker` rules if the new domains interact with existing glyph coherence logic

---

## Glyph System

**Status: Types defined; no glyph library implemented yet.**

`GlyphId` is a branded string type in `Types.ts`. `GlyphTemplate` defines the shape of a glyph definition (id, strokeCount, invariants, canonicalPath). Neither the 12 glyph definitions nor `GlyphRecognizer` exist yet.

### Planned 12 glyphs

These are the intended Phase 1 glyphs. `GlyphId` values, geometric forms, and coherence rules must be agreed upon and added to `Types.ts` and the `GlyphRecognizer` library simultaneously.

| GlyphId (planned) | Intent Meaning | Geometric Form |
|---|---|---|
| `glyph_dominion` | Command and authority | Star with inward strokes |
| `glyph_sight` | Perception, scrying, revelation | Open eye shape (ellipse + dot) |
| `glyph_silence` | Concealment, secrecy, invisibility | Horizontal line with closed ends |
| `glyph_ward` | Protection, barrier | Triangle with inward corners |
| `glyph_chain` | Binding, restraint, compulsion | Interlocked loops |
| `glyph_discord` | Chaos, disruption, entropy | Broken spiral |
| `glyph_flame` | Destruction, purging | Upward teardrop with acute base |
| `glyph_mirror` | Illusion, reflection, deception | Bilateral symmetry mark |
| `glyph_root` | Grounding, permanence, endurance | Downward branching form |
| `glyph_passage` | Liberation, transition, escape | Open gateway shape |
| `glyph_harvest` | Knowledge transfer, learning | Curved arc with downward stem |
| `glyph_tide` | Transformation, flux, change | S-curve with terminal loops |

### Coherence rules (planned)

Coherence rules live **exclusively in `IntentCoherenceChecker`**. Do not encode them in UI or stores.

Known contradictions (do not combine):
- `glyph_silence` + `glyph_sight` (concealment contradicts revelation)
- `glyph_discord` + `glyph_ward` (chaos contradicts protection)
- `glyph_chain` + `glyph_passage` (binding contradicts liberation)
- `glyph_flame` + `glyph_root` (destruction contradicts permanence)

Valid intent chains (incomplete without the paired glyph):
- `glyph_dominion` requires at least one of: `glyph_chain`, `glyph_sight`, `glyph_ward`
- `glyph_harvest` requires `glyph_sight` or `glyph_passage`

### Adding a new glyph

1. Add `GlyphId` string literal to the union in `Types.ts`
2. Add `GlyphTemplate` definition to the `GlyphRecognizer` library
3. Add coherence rules (contradictions and chains) to `IntentCoherenceChecker`

---

## Canvas Architecture

**Status: Stub only (`src/canvas/index.ts`). Architecture defined here for implementation.**

### Layer composition order

Skia layers render bottom to top:

```
AtmosphericLayer    ← ambient particle effects, parchment texture
SealLayer           ← demon seal nodes and connection strokes
GlyphLayer          ← placed glyphs with confidence-weighted opacity
BindingRingLayer    ← closing ring with strength visualization
```

All layers are Skia primitives only. **No React Native `View`, `Text`, or other non-Skia components appear inside a Skia canvas.** UI overlays (e.g., phase labels, glyph picker) live outside the canvas in standard React Native components.

### Drawing state machine

```
SEAL_PHASE → GLYPH_PHASE → RING_PHASE → COMPLETE
```

Legal transitions:
- `SEAL_PHASE` → `GLYPH_PHASE`: when all required seal connections are drawn with sufficient accuracy
- `GLYPH_PHASE` → `RING_PHASE`: when the player explicitly completes glyph placement (minimum 1 glyph required)
- `RING_PHASE` → `COMPLETE`: when a binding ring stroke is finalized and passes `BindingRingEvaluator`
- Any phase → `SEAL_PHASE`: ritual restart (demon change or explicit reset)

State machine lives in `canvasStore`. Transitions are validated there. The canvas layer reads state but does not drive transitions directly — it calls store actions.

### Sizing

Canvas dimensions are determined with `onLayout`. **Never hardcode pixel dimensions.** All engine input and output uses normalized 0–1 coordinates; the canvas layer multiplies by canvas width/height at the point of rendering and divides when passing touch coordinates to the engine.

---

## State Management

**Status: All stores are stubs (`src/stores/index.ts`).**

### `canvasStore`

**Owns:** active ritual state — current demon, drawing phase, in-progress stroke data, completed seal connections, placed glyphs, ring result.

**Must not own:** persisted sigil history, user auth data.

**Lifetime:** reset completely on demon change and after sigil composition is finalized.

### `grimoireStore`

**Owns:** the player's persisted sigil collection (metadata and scores, not raw stroke data).

**Must not own:** auth state, active ritual state.

**Delegation rule:** all reads and writes go through `GrimoireManager`. The store holds the in-memory view; `GrimoireManager` is responsible for WatermelonDB operations.

### `userStore`

**Owns:** auth state (user id, session token, sync status).

**Must not own:** game data of any kind.

---

## Persistence Layer

### Two-tier strategy

**MMKV (`react-native-mmkv`)** — session-level ephemeral data. Fast synchronous reads. Used for: last-selected demon, UI preferences, partial ritual state that should survive an app backgrounding but not a reinstall.

**WatermelonDB (`@nozbe/watermelondb`)** — structured grimoire records. Relational. Queryable. Used for: completed `Sigil` records stored in the player's grimoire.

### Sync strategy (Phase 1)

- **Local is the source of truth in Phase 1.**
- Sync to Supabase is on-demand (explicit player action or app foreground event).
- Conflict resolution always prefers local.
- **The WatermelonDB built-in sync protocol is deliberately not used in Phase 1.** A custom on-demand sync adapter will be built in Phase 5. Do not wire up `synchronize()` from WatermelonDB yet.

---

## Platform Differences

| Behavior | Mobile | Web |
|---|---|---|
| Haptics | Full haptic feedback via `expo-haptics` | Fails silently — `@services/haptics` absorbs the error |
| Pressure input | Hardware pressure where supported | Defaults to `0.5` via `StrokeEvaluator.normalizePressure` |
| Canvas sizing | `onLayout` callback | `onLayout` callback (same — never hardcode) |
| Audio | `expo-av` | `expo-av` (web support varies by browser) |

Never add `Platform.OS === 'web'` checks outside of the service wrappers. Platform differences are isolated to `@services/haptics` and `@services/audio`.

---

## What Is Deliberately Deferred

These systems are designed for but not implemented. Do not implement them unless a task explicitly calls for it.

| System | Seam in current code |
|---|---|
| **Charging timer** | `SigilStatus.charged` value exists; transition from `awakened → charged` is not implemented |
| **Demonic demands** | `Demon.attributes` and `loreFragments` fields exist; demand generation logic is deferred |
| **Location / Thin Places** | No seam yet; will require a new service and a `DemonDomain` value |
| **PvP clash resolution** | `SigilStatus.spent` exists as the terminal state; clash logic is deferred |
| **Coven system** | Not designed yet; deferred to Phase 4 |
| **Corruption arc** | `SigilVisualState.corrupted` exists; corruption progression logic is not implemented |
| **Full 72-demon roster** | `DemonRegistry.ts` accepts any demon added to the `DEMONS` array; 6 of 72 are defined |
| **WatermelonDB sync protocol** | WatermelonDB is installed; `synchronize()` must not be called until Phase 5 |
| **Push notifications** | Not designed; deferred to Phase 3 |
| **Expo Router navigation** | `App.tsx` is a placeholder; multi-screen layout requires installing `expo-router` |

---

## Development Conventions

- **Engine modules are pure TypeScript, tested with unit tests, no exceptions.** If a new engine module has no tests, it is not done.
- **All coordinates in the engine are normalized 0–1.** Scaling to pixels happens only in the canvas layer. If you find a pixel value in `src/engine/`, that is a bug.
- **Haptic and audio calls always go through `@services/haptics` and `@services/audio`.** Never call `expo-haptics` or `expo-av` directly from stores, canvas, or engine code.
- **New demon domains** require updates in three places: `Types.ts` (`DemonDomain` union), `IntentCoherenceChecker` rules, `DemonRegistry` entry.
- **New glyph types** require updates in three places: `Types.ts` (`GlyphId` union), `GlyphRecognizer` library, `IntentCoherenceChecker` rules.
- **Visual state thresholds** (`dormant`, `unstable`, `healthy`, `corrupted`, `charged`) map to `overallIntegrity` ranges defined in `SigilComposer`. Do not hardcode threshold numbers anywhere else.
- **`SigilStatus` transitions must be validated.** Do not skip states. Validation logic belongs in `SigilComposer`.
- **No UI imports in `src/engine/`.** TypeScript strict mode is enabled; treat any new import from a UI package in the engine layer as a blocking issue.
- **`overallIntegrity` is never set directly.** It is always computed by `SigilComposer` as a weighted composite.

---

## Running the Project

```bash
# Install dependencies
npm install

# Start Expo dev server (choose platform interactively)
npm start

# Web development
npm run web

# iOS simulator
npm run ios

# Android emulator
npm run android

# Run unit tests
npm test

# TypeScript type check (no emit)
npx tsc --noEmit

# Build for production (EAS)
eas build --platform all
```

Tests use Jest with `ts-jest`. Test files live adjacent to their source files (e.g., `StrokeEvaluator.test.ts` next to `StrokeEvaluator.ts`). The test environment is `node` — no jsdom, no React Native mocks needed for engine tests.

---

## Environment Variables

None are currently required to run the project in offline mode. The following will be required when Supabase integration is activated:

| Variable | Description | Required for offline use |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | No |

Variables prefixed with `EXPO_PUBLIC_` are inlined at build time by Expo and accessible in client code. Do not put secret keys in `EXPO_PUBLIC_` variables. Service-role keys must only appear in server-side environments (e.g., Supabase Edge Functions), never in the app bundle.

For local development, place variables in a `.env.local` file (already in `.gitignore`).
