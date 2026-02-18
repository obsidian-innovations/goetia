# CLAUDE.md — Goetia

Primary reference for any AI assistant working on this codebase.

---

## Project Overview

Goetia is a browser-based occult game where players craft sigils to summon and bind demons from the Ars Goetia (The Lesser Key of Solomon). The core mechanic is a three-layer ritual drawing system:

1. **Foundation Seal** — the player traces the unique geometric seal of the chosen demon
2. **Intent Glyphs** — the player inscribes symbolic glyphs that declare purpose and shape the binding
3. **Binding Ring** — the player draws a closing circle to seal the ritual

Completed sigils are stored in a personal **grimoire**.

**This codebase is scaffolding only.** No game logic is implemented yet.

---

## Tech Stack

| Package | Role |
|---|---|
| `vite` | Build tool and dev server |
| `typescript` | Language (strict mode) |
| `pixi.js` v8 | 2D WebGL/WebGPU canvas rendering |
| `zustand` | Minimal global state management |
| `vite-plugin-pwa` | Progressive Web App support with auto-update |

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

## Directory Structure

```
goetia/
├── .github/workflows/deploy.yml   # GitHub Pages deployment
├── public/icons/                   # PWA icon placeholders
├── src/
│   ├── engine/
│   │   ├── sigil/
│   │   ├── demons/
│   │   └── grimoire/
│   ├── canvas/
│   ├── stores/
│   ├── services/
│   ├── db/
│   ├── main.ts                    # PixiJS app initialization
│   └── style.css                  # Global styles
├── index.html                     # Entry HTML with PWA meta tags
├── vite.config.ts                 # Vite + PWA plugin config
├── tsconfig.json                  # TypeScript config with path aliases
├── package.json
└── CLAUDE.md                      # This file
```

---

## Path Aliases

Configured in both `tsconfig.json` (paths) and `vite.config.ts` (resolve.alias):

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
- **All coordinates in the engine are normalized 0–1.** Scaling to pixels happens only in the canvas layer.
- **No game logic in canvas, stores, or services.** Logic belongs in the engine; other layers orchestrate and render.

---

## Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`:

1. `npm ci`
2. `npm run build`
3. Deploy `dist/` to `gh-pages` via `peaceiris/actions-gh-pages`

Set repository **Settings > Pages** source to `gh-pages` branch.
