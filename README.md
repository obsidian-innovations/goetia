# Goetia

An occult game for browser and mobile where players craft sigils to summon and bind demons from the **Ars Goetia** — the first section of the 17th-century grimoire *The Lesser Key of Solomon*, cataloguing 72 demons of the Goetia hierarchy.

Players draw sigils on a magical canvas, invoke the correct seals and names of power, and bind demons to their will. Each of the 72 spirits has unique attributes, abilities, and binding conditions drawn from historical demonological tradition.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 54 — managed workflow |
| Language | TypeScript (strict mode) |
| Drawing / Canvas | [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) |
| Gestures | [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) |
| Global State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Key-Value Storage | [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) |
| Relational DB | [WatermelonDB](https://nozbe.github.io/WatermelonDB/) with SQLite adapter (`expo-sqlite`) |
| Backend / Auth | [Supabase JS](https://supabase.com/docs/reference/javascript) |

---

## Directory Structure

```
/
├── src/
│   ├── engine/               # Core game logic (no UI)
│   │   ├── sigil/            # Sigil construction, validation, and encoding
│   │   ├── demons/           # Ars Goetia demon definitions, attributes, and binding rules
│   │   └── grimoire/         # Player knowledge book — unlocked lore and demon records
│   │
│   ├── canvas/               # Skia-powered drawing surface and gesture integration
│   │
│   ├── stores/               # Zustand state slices (player, session, grimoire, etc.)
│   │
│   ├── db/                   # WatermelonDB schema, models, and adapters
│   │   └── migrations/       # Database migration files
│   │
│   └── services/             # External service clients (Supabase, analytics, etc.)
│
├── assets/                   # Static images, fonts, and sounds
├── App.tsx                   # Root component
├── app.json                  # Expo project configuration
├── babel.config.js           # Babel + module-resolver for path aliases
└── tsconfig.json             # TypeScript configuration with strict mode and path aliases
```

---

## TypeScript Path Aliases

Configured in `tsconfig.json` and resolved at runtime by `babel-plugin-module-resolver`:

| Alias | Resolves to |
|---|---|
| `@engine` | `src/engine` |
| `@canvas` | `src/canvas` |
| `@stores` | `src/stores` |
| `@db` | `src/db` |
| `@services` | `src/services` |

Example usage:

```ts
import { bindDemon } from '@engine/demons';
import { usePlayerStore } from '@stores';
import { supabase } from '@services';
```

---

## Getting Started

```bash
npm install
npx expo start
```

Run on web (`w`), Android (`a`), or iOS (`i`) from the Expo dev menu.

---

## Lore Note

The 72 demons of the Ars Goetia were traditionally summoned inside a magical triangle, constrained by the brass vessel of Solomon, and commanded using their unique sigil — a geometric seal encoding their true name. This game recreates that ritual as interactive play.
