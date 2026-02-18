# Goetia

A browser-based occult game where players craft sigils to summon and bind demons from the Ars Goetia (The Lesser Key of Solomon).

Players draw ritual sigils through a multi-layered system: tracing a demon's foundation seal, inscribing intent glyphs, and closing with a binding ring. Completed sigils are stored in a personal grimoire.

## Stack

| Technology | Role |
|---|---|
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [TypeScript](https://www.typescriptlang.org/) | Language |
| [PixiJS 8](https://pixijs.com/) | 2D WebGL/WebGPU canvas rendering |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | Progressive Web App support |

## Development

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

## Deployment

The project deploys to GitHub Pages automatically via GitHub Actions.

Every push to `main` triggers the workflow at `.github/workflows/deploy.yml`, which:

1. Installs dependencies with `npm ci`
2. Runs `npm run build` (TypeScript check + Vite build)
3. Deploys the `dist/` folder to the `gh-pages` branch using [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)

To enable deployment, go to your repository **Settings > Pages** and set the source branch to `gh-pages`.

## Project Structure

```
src/
  engine/        # Pure TypeScript game logic (no UI dependencies)
    sigil/       # Sigil evaluation, stroke processing
    demons/      # Demon registry and data
    grimoire/    # Grimoire management
  canvas/        # PixiJS rendering and input handling
  stores/        # Zustand state slices
  services/      # External integrations (audio, haptics)
  db/            # Persistence layer
```
