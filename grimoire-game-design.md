# Grimoire — Game Design Document

---

## Overview

Grimoire is a browser and mobile occult game inspired by goetic magic. Players craft sigils through a three-layer drawing system to summon and bind demons from the Ars Goetia. The core mechanic is simple: sigil quality determines power, and power always comes at a cost.

The game spans six phases of development, from a standalone ritual canvas to a full living world with PvP hex combat, demonic corruption, and cooperative covens.

---

## Central Tension: Control vs. Corruption

Every demon invoked leaves a mark. The more you push — more demons, more powerful bindings, more aggressive hexes — the more the corruption climbs. Hit the threshold and you lose yourself. Your character becomes a vessel, a PvE enemy for other players to hunt down and either purify or destroy permanently.

There is no safe way to play. There is only how far you're willing to go.

---

## The 72 Demons

The Ars Goetia's 72 demons form the mechanical backbone of the game. Each demon has:

- **Rank** — King, Duke, Prince, Marquis, Earl, Knight, President, or Baron. Rank determines raw power in PvP clashes and the difficulty of binding.
- **Domains** — knowledge, destruction, illusion, binding, transformation, discord, protection, revelation, liberation. Domains determine what a demon can do and how it interacts with other demons in conflict.
- **Legions** — the number of lesser spirits under their command, used in world-scale events.

Players don't start with knowledge of all 72. Demons must be researched — lore fragments discovered, texts deciphered, rituals completed. Knowledge itself is forbidden and earned.

---

## Sigil Crafting: The Three Layers

The sigil is the central object of the game. Every interaction flows through it. A sigil is built in three sequential layers.

### Layer 1 — Foundation Seal

Each demon has a canonical symbol from the Ars Goetia. Players reconstruct this seal by connecting nodes in sequence, drawing strokes that match the historical geometry. The accuracy of each stroke affects potency — a sloppy reconstruction weakens the binding before it begins.

Seal fragments are unlocked through research. Early-game players work with incomplete geometries, filling gaps with intuition. Experienced players know every node, every edge weight, every canonical path.

### Layer 2 — Intent Glyphs

Twelve symbolic glyphs form a grammar of intent. Players draw these freehand inside the seal space.

**Vectors** — the direction of power:
- VECTOR OUT — direct power outward toward a target
- VECTOR IN — draw power inward from a target
- VECTOR DIFFUSE — spread power in all directions

**Qualities** — the character of the effect:
- QUALITY SHARP — precise and cutting
- QUALITY SUSTAIN — lingering over time
- QUALITY DELAY — deferred until triggered

**Targets** — what the effect binds to:
- TARGET PERSON — a specific individual
- TARGET PLACE — a location
- TARGET OBJECT — a physical object

**Durations** — when the effect resolves:
- DURATION INSTANT — fires immediately, once
- DURATION SUSTAINED — continuous
- DURATION TRIGGERED — fires when a condition is met

Glyph combinations must be coherent. A sigil that vectors power outward and inward simultaneously contradicts itself. Sharp and sustained qualities cancel. The game penalises incoherence with reduced power and increased corruption risk.

A valid intent requires at minimum one VECTOR and one TARGET. Quality and duration glyphs placed without a vector are isolated — floating, purposeless, a waste of power.

### Layer 3 — Binding Ring

The final layer is a freehand circle drawn around the entire construction. This ring contains the invocation. A weak ring lets power bleed back onto the caster. A perfect ring means minimal corruption and maximum control.

The ring is evaluated on three axes: circularity, closure, and consistency of pressure. Weak segments are identified and marked — they become the points where the binding is most vulnerable to collapse.

---

## Integrity Scoring

A completed sigil receives an overall integrity score:

```
integrity = seal × 0.40 + intent × 0.35 + ring × 0.25
```

This score maps to a visual state:

| Score | State | Meaning |
|---|---|---|
| ≥ 0.85 | Charged | Potent. Ready. |
| 0.60–0.85 | Healthy | Sound binding. |
| 0.30–0.60 | Unstable | Risky to invoke. |
| < 0.30 | Corrupted | Likely to misfire. |
| No ring | Dormant | Inert regardless of score. |

Players never see raw numbers. The game communicates sigil quality through atmosphere — the colour of the ink, the steadiness of the glow, the sound of the binding settling.

---

## Coherence Rules

Intent glyphs must form a grammatically valid invocation. The coherence checker applies the following rules:

**Contradictions** — pairs that cancel each other, each reducing score by 0.25:
- VECTOR OUT + VECTOR IN
- QUALITY SHARP + QUALITY SUSTAIN
- DURATION INSTANT + DURATION SUSTAINED
- DURATION INSTANT + DURATION TRIGGERED
- VECTOR DIFFUSE + QUALITY SHARP

**Incomplete chain** — missing VECTOR or TARGET, each reducing score by 0.20

**Isolated glyphs** — QUALITY or DURATION placed without any VECTOR, each reducing score by 0.10

---

## The Charging Mechanic

A completed sigil is inert until charged. Charging requires the app to be open, attention gestures to be performed at intervals, and real time to pass. Charge time scales with demon rank:

| Rank | Charge Time |
|---|---|
| Baron | 8 minutes |
| Duke | 25 minutes |
| King | 90 minutes |

Attention gestures include tracing the binding ring, holding the seal, and other ritual interactions. A sigil left unattended during charging loses progress.

Once charged, a sigil has a hold window of two to four hours before it begins to destabilise. Invoke too early and the binding is weak. Wait too long and it collapses entirely. The timing creates genuine tension — charge now and risk being unprepared, or wait and risk losing the sigil.

---

## Demonic Demands

When a demon is bound, it issues demands. These are not transactional. They are strange, personal, and escalating.

Not "pay 100 gold." More like:

- Be in complete darkness for 20 minutes
- Do not speak to another player for 6 hours
- Offer the coordinates of someone you have hexed
- Destroy something you value

Demands are organised by domain and rank. A knowledge demon asks for secrets. A destruction demon asks for sacrifice. A binding demon asks for control over someone else.

Players self-report compliance. Lying makes the demon unreliable in return. There is no surveillance — this is thematically intentional. The game trusts you to be honest about the cost of what you are doing.

Demands continue after the initial binding. The relationship with a demon is ongoing. Ignore the demands long enough and the binding weakens. Ignore them entirely and the demon turns.

---

## PvP: Sigil Clash Resolution

When two sigils meet in conflict, the outcome is determined across three axes:

### 1. Demonic Hierarchy
Rank creates a base power differential, but domain relationships modify it significantly:
- Binding suppresses Liberation
- Illusion interferes with Revelation
- Destruction cuts through Protection
- Protection can contain Destruction

A lower-ranked demon with a favourable domain matchup can defeat a higher-ranked demon with a poor one.

### 2. Execution Quality
The overall integrity score of each sigil applies directly. A low-integrity sigil that loses a clash doesn't just fail — the power rebounds inward onto the caster. The worse the sigil, the worse the rebound.

### 3. Intent Coherence
Grammatically valid glyph combinations do exactly what they say. Incoherent combinations are imprecise and deflectable. An opponent who understands the grammar can exploit gaps in your invocation.

### Outcomes
- **Clean win** — dominant sigil achieves its intent fully
- **Contested win** — dominant sigil achieves intent with partial cost
- **Mutual destruction** — both sigils collapse, both casters take corruption
- **Catastrophic loss** — losing sigil inverts onto its own caster
- **Absorption** — rare outcome when a binding-domain sigil captures an attacking sigil, revealing fragments of the opponent's grimoire

---

## The World: Thin Places

Thin Places are locations where the veil between worlds is weak. They exist at three scales:

**Fixed** — anchored to historically significant sites. Ancient crossroads, ruins, places where blood was spilled. These are always active.

**Dynamic** — generated by the system based on player density and ritual activity in an area. More players doing more rituals in a location gradually thins the veil.

**Player-created** — sustained ritual activity at a specific location over time can create a new Thin Place. This requires coordinated effort and opens the location to all players, not just the creators.

Charging sigils in Thin Places is faster. Corruption also accrues faster. Unbound demons — demons that no one has successfully bound — haunt Thin Places as environmental phenomena. They interfere with rituals, distort the canvas, and can be encountered directly.

---

## Corruption Arc

The corruption meter rises with every pact made and every sigil cast. It never falls on its own.

As corruption climbs, the game becomes unreliable:
- Visual distortions appear on the ritual canvas
- UI elements flicker or misread
- Whispers appear in the interface — text that wasn't there before
- Sigils activate on their own, invoking effects the player didn't choose

At full corruption, the character becomes a vessel. They are removed from active play and placed into the world as a PvE enemy — their corrupted sigils and bound demons turned against other players. Other players can attempt a purification ritual to restore them.

Purification is not guaranteed. A failed attempt strengthens the vessel state. Success returns the player to active play, but the corruption doesn't reset to zero. It drops significantly but not completely. Every purified character carries permanent scars — slight visual distortions that never fully resolve, a demon that remains permanently suspicious, a seal that never quite reconstructs as cleanly as it once did.

---

## Covens

Players can form covens — small groups of practitioners who share resources, coordinate rituals, and pool power for world-scale events.

Covens introduce a betrayal mechanic. A coven member with access to the shared grimoire can expose sigils to outsiders, tip off opponents before a clash, or deliberately weaken a binding during a joint ritual. The game records nothing automatically. Discovery is social.

King-ranked demons in Phase 6 are world events requiring coven-level coordination. A single player cannot bind a King. The ritual requires multiple practitioners maintaining separate components simultaneously, each responsible for one layer of a shared sigil that exists across all of their canvases at once. If any component fails, the entire binding collapses — and the King, unbound, moves through the world as a major PvE event affecting all nearby players.

---

## Phase Roadmap

### Phase 1 — The Ritual Canvas
Standalone sigil drawing experience. Six demons available: Bael, Agares, Vassago, Samigina, Marbas, Valefor. Full three-layer drawing mechanic. Grimoire storage via localStorage. Atmospheric canvas with PixiJS. No combat, no multiplayer, no world. Deployable to GitHub Pages as a PWA.

### Phase 2 — Living Sigils
Full charging system with real-time requirements and attention gestures. Demonic demands launch as structured templates pulling from demon attributes. Demands continue and escalate after initial binding. Sigil status lifecycle becomes active: resting → awakened → charged → spent.

### Phase 3 — The Grimoire
Research layer for discovering new demons beyond the initial six. Seal fragments unlocked through rituals, discovery, and trade. Social layer: players can expose sigil pages, others can study and reverse-engineer. Partial knowledge creates partial seals — playable but weaker.

### Phase 4 — The World
Location services integrate. Thin Places mapped to real-world coordinates. Spatial charging mechanics — proximity to Thin Places affects charge rate. PvE demonic activity in Thin Places. Player-created Thin Places through sustained ritual.

### Phase 5 — PvP
Full clash resolution system. Hexes, wards, direct confrontations. Coven system with shared grimoires and betrayal mechanics. The misfire system activates — low-integrity sigils in lost clashes rebound onto their casters.

### Phase 6 — Endgame
Full corruption arc with visual and UI distortions. Vessel state — corrupted players become PvE enemies. Purification rituals. Permanent scarring after recovery. All 72 demons available. King-ranked demons as world events requiring coven coordination.

---

## Technical Notes

### Phase 1 Stack
- **Vite + TypeScript** — build tooling, instant start in Claude Code
- **PixiJS 8** — WebGL rendering, scene graph, pointer events
- **Zustand** — state management, no React dependency
- **localStorage** — grimoire persistence
- **GitHub Actions** — auto-deploy to gh-pages
- **PWA manifest** — install to home screen, fullscreen

### Engine Architecture
All game logic lives in `/src/engine/` with zero dependencies on PixiJS, the DOM, or any rendering library. The engine is platform-agnostic and fully unit-testable before a single pixel renders.

### Mobile Path
Once the web version is validated, wrap in Expo WebView for fast mobile release. Progressively replace WebView screens with native React Native as needed. The engine layer — pure TypeScript — moves to either path unchanged.

### Coordinate System
All paths in the engine are normalised to 0–1 space, device-independent. Canvas layers translate normalised coordinates to pixels with a 15% margin. Pointer events are translated from pixels to normalised space before engine processing.

---

## Design Principles

**The game never explains itself fully.** Discovery is part of the experience. Players piece together coherence rules by observing what happens when combinations fail. Demon domains and their interactions are not listed anywhere in the UI.

**Numbers are hidden.** Integrity is communicated atmospherically — the colour of the ink, the sound of the binding, the glow of the ring. Raw scores exist in the engine but never surface to players.

**Real time is real.** Charging takes actual minutes. Demands ask for actual behaviour. The game does not simulate the cost of power — it requires it.

**Corruption is permanent.** Purification helps but does not erase. Every player who pushes too far carries that history in their interface, in their seals, in the way their demons respond to them.

**Betrayal is social, not mechanical.** The game records no accusations. Discovery of treachery within a coven is a player problem, not a system problem. This is intentional.
