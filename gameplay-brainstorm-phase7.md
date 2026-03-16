# Goetia — Phase 7+ Gameplay Brainstorm

24 new feature concepts for deepening the game beyond the current 6-phase implementation. Organized by priority tier, each feature builds on existing systems and respects the core design principles: hidden numbers, atmospheric communication, real time, permanent corruption, social betrayal, and discovery-driven learning.

---

## Tier 1 — High Impact, Builds on Existing Gaps

These features address underdeveloped systems (GrimoireEngine, camera service) and create the deepest engagement loops.

### A. The Living Grimoire — "Palimpsest"

The grimoire accumulates a hidden "memory" score from sigils drawn, overwritten, and spent. As memory grows, the grimoire exhibits autonomous behavior: pages reorder themselves, old sigil traces bleed through onto new drawings (like a real palimpsest), and it occasionally "suggests" demons by subtly highlighting their seals in the demon select screen. At high memory, the grimoire whispers independently of any bound demon and develops a unique visual personality — texture shifts, page-turn animation changes.

- **Builds on:** `GrimoireEngine` (currently 56 lines with only 4 query functions — the primary expansion target), `WhisperEngine`, `grimoireStore`
- **Why it fits:** Memory score is never shown to the player. They notice the grimoire acting strangely and must figure out why on their own.
- **Complexity:** Medium

### B. Sigil Dreaming — "Oneiric Drift"

When the app is closed for 4+ hours, sigils in "resting" status undergo a hidden dream phase. On return, the player finds their sigils subtly changed: glyph positions have drifted slightly, binding ring weak points may have shifted, and occasionally a new lore fragment surfaces. Changes are small but permanent. Resting sigils near corruption scars drift more violently. The player cannot control this — they can only observe what their sigils became while they were away.

- **Builds on:** `SigilStatus` "resting" state, `PlacedGlyph.position`, `RingResult.weakPoints`, `PermanentScar` type from `PurificationEngine`
- **Why it fits:** Real time is real — the sigil literally changes while you sleep. The game never explains the mechanic.
- **Complexity:** Small-medium

### D. Demon Familiarity — "The Name That Knows You"

Each demon tracks a hidden "familiarity" score that grows through repeated interactions: drawing their seal, fulfilling their demands, charging their sigils, using them in clashes. As familiarity increases, behavior changes:

- **Low familiarity:** Generic demands.
- **Medium:** Demands become personalized — referencing the player's other bound demons, corruption level, coven status.
- **High:** The demon makes unsolicited offers — revealing enemy weaknesses, warning about incoming hexes, offering to absorb corruption at a hidden cost.
- **Maximum:** The demon's seal geometry subtly simplifies (easier to draw) — but demands become impossible to refuse without severe corruption.

- **Builds on:** `DemandEngine`, `CorruptionEngine`, `SealGeometry` edge weights, `ResearchEngine` (related but distinct — research is knowing the seal; familiarity is the demon knowing you)
- **Why it fits:** The relationship is asymmetric and unsettling. The demon getting "easier" is not a reward — it is a trap. Manifests as behavioral shifts, not a progress bar.
- **Complexity:** Medium

### F. Temporal Tides — "The Hours of Darkness"

Real-world time of day and lunar phase affect gameplay:

- **Midnight–3AM local time** ("the witching hour"): Charging speed doubles. Corruption gain also doubles.
- **New moon** (calculated from date): Thin place veil strength reduced by 0.2 globally.
- **Full moon:** Purification attempts gain a bonus to success.
- **Solstices and equinoxes:** 24-hour world events with unique encounter demons.

Communicated through atmospheric shifts only: the canvas background darkens during witching hours, atmospheric particles in `AtmosphericLayer` change color during lunar events. No UI labels, no notifications.

- **Builds on:** `ChargingEngine` chargeMultiplier, `ThinPlaces.getCorruptionMultiplier()`, `AtmosphericLayer` particles, `PurificationEngine` threshold
- **Why it fits:** Real time taken literally. Moon phase is pure math — no API needed. Players must notice patterns in their own sessions.
- **Complexity:** Small-medium

### I. Sigil Decay & Rebinding — "The Fading Mark"

Sigils in "charged" or "awakened" status slowly decay over real days. Their `overallIntegrity` drops by 0.01 per day, visualized as dimming glow and fading lines. When integrity drops below 0.30, the sigil enters a "fading" visual state. The player can rebind a fading sigil by redrawing its binding ring — but the new ring is evaluated against the decayed state, not the original. Each rebinding leaves a visible "stratum" on the sigil (like geological layers), and the sigil can never exceed its original integrity. After three rebindings, the sigil becomes "ancient" — weaker but immune to hex damage and valued by covens as a prestige artifact.

- **Builds on:** `SigilVisualState`, `SigilLifecycle`, `BindingRingEvaluator`, `HexSystem` integrity checks
- **Why it fits:** Real time — decay happens whether you play or not. Rewards active maintenance. Ancient sigils create long-term value.
- **Complexity:** Medium

---

## Tier 2 — Atmosphere & Emergent Stories

These features deepen the unsettling tone and create emergent player narratives.

### E. Inverted Rites — "Ritual Variants"

Beyond the standard seal-glyphs-ring order, introduce inverted rituals where the phase order is reversed: ring first, then glyphs, then seal. Inverted rites produce sigils with fundamentally different properties — they are defensively powerful (excellent wards) but generate double corruption.

The player discovers inverted rites by accidentally drawing a binding ring before completing any seal connections. The game does not tell them this is possible — it simply proceeds.

A third variant, the "broken rite," emerges when the player deliberately leaves one seal edge unconnected. These sigils are unstable but can be used as sacrificial components in purification attempts.

- **Builds on:** `RitualCanvas.ts` phase routing, `SigilComposer` weight system (swap seal and ring weights for inverted), `HexSystem.castWard()`, `PurificationEngine`
- **Why it fits:** Discovery-driven. No tutorial, no explanation. The corruption cost means it is a meaningful trade-off, not simply "better."
- **Complexity:** Medium

### J. The Vessel's Perspective — "Through Demon Eyes"

When a player reaches vessel state (corruption >= 0.80), the entire UI subtly transforms:

- Demon descriptions shift to first person ("I command 30 legions" instead of "commands 30 legions")
- Whispers stop appearing as overlay text and instead replace UI elements: button labels flicker to whisper text, the toolbar briefly shows demand descriptions instead of tool names
- The canvas inverts: player strokes get subtle auto-guidance that makes drawing easier but removes agency
- After purification, the `persistent_distortion` scar causes occasional flickers of the vessel perspective forever

- **Builds on:** `CorruptionEngine.isVessel()`, `CorruptionEffects` four-stage visuals, `WhisperEngine`, `PermanentScar` type, `UIManager`
- **Why it fits:** Horror through interface subversion. The auto-guidance is the most unsettling part — you cannot tell where your drawing ends and the demon's influence begins.
- **Complexity:** Large

### K. Cross-Demon Resonance — "Sympathetic Harmonics"

When a player has bound multiple demons that share a domain, a hidden "resonance" builds between their sigils. Resonant sigils glow in synchrony in the grimoire (their visual pulses align). When one resonant sigil is charged, the others gain a small passive charge (5% of the active rate). However, if one resonant sigil is corrupted or spent, the degradation spreads to all resonant sigils at 20%.

Domain pairs have specific interactions:
- Two "binding" demons resonate strongly but attract hexes
- Two "knowledge" demons accelerate research but increase whisper frequency
- Two "destruction" demons boost clash power but accelerate corruption

- **Builds on:** `Demon.domains` arrays, `ChargingEngine.tick()`, `CorruptionEngine`, `GrimoireEngine.getBoundDemonIds()`, `CoherenceRules` pattern (resonance is the demon-level analogue)
- **Why it fits:** Player sees synchronized glowing, never a number. Creates strategic tension around same-domain binding.
- **Complexity:** Medium

### H. Residual Echoes — "The Whispering Wall"

When a player creates a thin place (`player_created` type), whispers from all demons ever bound at that location are permanently embedded. Other players who visit hear these echoes — fragments attributed to demons they may not have researched yet. The echoes serve as cryptic hints about what happened there. Over time, thin places with many echoes develop a "resonance" that makes encounters more likely and more intense. Players cannot choose what echoes remain; every binding leaves a trace.

- **Builds on:** `ThinPlace.ritualActivity`, `WhisperEngine.generateWhisper()`, `Encounters.generateEncounter()`, `ResearchActivities`
- **Why it fits:** Corruption is permanent — so are the marks you leave on the world. Other players experience the consequences of your actions without direct interaction.
- **Complexity:** Small-medium

### R. Feral Sigils — "The Unbound"

Sigils in "spent" status that are not rebound within 7 real days become "feral." Feral sigils detach from their demon and begin behaving autonomously in the grimoire: they drift between pages, occasionally overlay themselves onto active sigils (causing visual interference), and emit whispers that contradict the bound demon's whispers.

If a player accumulates 3+ feral sigils, they coalesce into a "wild sigil" — something that cannot be bound to any known demon. It represents an entity the player accidentally summoned through neglect. Wild sigils can only be destroyed through a costly purification ritual.

- **Builds on:** `SigilStatus` "spent" terminal state, `SigilLifecycle`, `WhisperEngine`, `PurificationEngine`, grimoire viewer
- **Why it fits:** Neglect has consequences. Atmospheric, creeping problem rather than a notification. Wild sigils are genuinely unsettling — something you did not intend to create now exists.
- **Complexity:** Medium

---

## Tier 3 — Ambitious Extensions

These require more infrastructure but create uniquely compelling experiences.

### C. Camera Scrying — "The Black Mirror"

The unused camera service becomes a scrying tool. Activating the rear camera overlays a translucent sigil-detection layer. When visual conditions are detected — high contrast edges, circular shapes, dark environments — scrying events trigger: hidden lore fragments appear as overlaid text, thin place veil strength is revealed, or a demon's whisper is triggered. In dark rooms (low average luminance), scrying is more potent, connecting to existing "darkness" demands. Camera feed is analyzed frame-by-frame locally and never stored or transmitted.

- **Builds on:** `camera.ts` (implemented but completely unwired), `DemandTemplates` darkness demands, `ThinPlaces.veilStrength`, `WhisperEngine`, `ResearchActivities.discoveredFragment()`
- **Why it fits:** The player must experiment with lighting, angles, and locations to discover what scrying reveals. Camera as ritual tool rather than AR gimmick.
- **Complexity:** Large

### L. Demon Negotiations — "The Bargain"

Instead of demands being one-directional (demon demands, player complies), introduce a negotiation phase after a sigil reaches "awakened" status. The demon offers a specific benefit (charge speed bonus, hex resistance, research acceleration) in exchange for a specific permanent cost (one corruption source is doubled forever, a specific glyph becomes harder to draw, one seal edge is permanently shifted).

The player can accept, reject, or counter-offer by sacrificing a different sigil. Rejected offers increase demand escalation. The demon's offer quality scales with familiarity and sigil integrity.

- **Builds on:** `DemandEngine` escalation, `SigilLifecycle` "awakened" trigger, `PermanentScar` pattern, `ChargingEngine`/`ResearchEngine`/`HexSystem` parameters
- **Why it fits:** Makes the corruption arc more tempting. The game should make evil attractive. Every bargain has permanent weight.
- **Complexity:** Medium-large

### O. Glyph Evolution — "The Living Alphabet"

The 12 glyphs in `GlyphLibrary` are currently static templates. After 50+ drawings of the same glyph, the `GlyphRecognizer` gradually shifts the canonical path toward the player's personal stroke style. Each player develops unique "handwriting" that the game adapts to — but sharing glyph techniques between coven members becomes harder as recognizers diverge.

A player who draws VECTOR_OUT with a consistent upward curve will find that their game eventually accepts that curve and rejects the "textbook" horizontal form.

- **Builds on:** `GlyphRecognizer` Procrustes analysis, `StrokeResult` curvature/pressure/velocity, `GlyphTemplate.canonicalPath`, 32-point resampling
- **Why it fits:** The game learns your hand. Deeply personal and slightly unsettling. Creates genuine per-player mechanical uniqueness.
- **Complexity:** Medium

### Q. Seal Archaeology — "Strata"

The grimoire page for each demon develops visible layers over time. The first sigil drawn is the "foundation stratum." Each subsequent sigil adds its traces on top, and the ghost impressions of all previous attempts remain visible as increasingly faint lines. A player with 20 attempts at Bael's seal sees a palimpsest of their entire drawing history — their improvement (or deterioration) visually evident.

These strata affect gameplay: regions where many previous attempts overlap gain a faint "groove" that makes future drawing slightly more accurate (+0.02 Frechet distance tolerance per 5 overlapping attempts in that region).

- **Builds on:** `SealReconstructor` Frechet distance, `SealLayer` ghost edges, `grimoireDB` sigil history, `geometry.ts` normalization
- **Why it fits:** Time and practice are real. Visual layering communicates progress atmospherically. Groove rewards persistence implicitly.
- **Complexity:** Medium

### V. Ritual Conditions — "The Circumstances"

Sigil integrity gains hidden modifiers based on real-world conditions during the ritual:

- **Drawing in the dark** (camera luminance detection): +0.05 binding ring strength
- **Drawing while moving** (geolocation velocity): -0.03 seal integrity / +0.05 glyph coherence
- **At a thin place during witching hour:** Stacked multipliers from features F and existing `ThinPlaces`

Modifiers are baked into the final integrity score and never displayed. Over time, players develop intuitions about "good" ritual conditions through experimentation — making the physical act of drawing genuinely ritualistic.

- **Builds on:** Camera luminance, geolocation velocity, `ThinPlaces` multiplier pattern, `SigilComposer.compose()` weights
- **Why it fits:** The player never sees "+0.05 darkness bonus." They just notice sigils drawn at night tend to be stronger.
- **Complexity:** Medium

### S. Acoustic Ritual Interference — "The Listener"

During charging, the device microphone detects ambient noise level (with permission). Complete silence gives a charging bonus; loud environments cause charge decay. Specific audio patterns trigger events: rhythmic sounds (tapping, music) are interpreted as "ritual drumming" and boost glyph coherence for the next ritual. Sudden loud noises cause the charging sigil to "flinch" (momentary visual distortion and minor progress loss).

Connects directly to the "silence" demand type — demons of the knowledge domain literally demand silence, and the game can now partially verify it.

- **Builds on:** `ChargingEngine` multiplier, `DemandTemplates` silence demands, `audio.ts` Web Audio API, `DistortionLayer`, `AttentionGesture`
- **Why it fits:** Real time extended to real sound. The framing is atmospheric and unsettling: is the game listening, or is the demon?
- **Complexity:** Large

### M. Geolocation Pilgrimages — "The Demon's Road"

Each demon has a compass direction affinity (derived from its position in the Ars Goetia numbering). When the player physically travels in that demon's direction for more than 1 km, they gain a "pilgrimage" bonus: research progress for that demon increases 3x for the next hour. The game never tells the player which direction belongs to which demon.

Completing a pilgrimage to all four cardinal directions for a single demon unlocks a hidden fifth lore fragment. The pilgrimage path is tracked as a faint line on an otherwise empty compass screen — no map, no GPS dot, just a line showing where you have been.

- **Builds on:** `ThinPlaces.ts` haversineDistance/bearingDeg, `ResearchActivities`, `ResearchEngine.addResearchProgress()`, geolocation watch
- **Why it fits:** Real time extended to real space. Minimalist compass-only visualization.
- **Complexity:** Medium

### P. The Shadow Grimoire — "The Shadow Book"

After purification from vessel state, a "shadow grimoire" appears. It contains ghostly copies of every sigil active during the vessel period, but with inverted properties: high-integrity sigils appear corrupted, corrupted sigils appear pristine. The shadow grimoire is read-only and cannot be used for rituals, but studying its sigils reveals unique lore fragments written from the demon's perspective on the player's vessel period.

The shadow grimoire slowly fades over real weeks, and its contents are permanently lost when it empties — creating urgency to study before the evidence disappears.

- **Builds on:** `PurificationEngine` result, `GrimoireEngine`/`grimoireStore`, `ResearchActivities.studiedSigil()`, `SigilVisualState` inversion
- **Why it fits:** Makes the vessel state feel like content rather than punishment. Fading creates real urgency. Corruption permanence extended.
- **Complexity:** Medium

---

## Tier 4 — Multiplayer-Dependent

These require server infrastructure and an active player base.

### G. Coven Rituals — "The Collective Seal"

Coven members initiate a collaborative ritual where each draws one layer of a shared sigil simultaneously. Produces a "coven sigil" in the shared grimoire. The sigil's integrity is the average of all contributors' layer quality, but corruption cost is split equally. If any member betrays during the ritual (via `exposeSigil`), the sigil shatters and all participants gain corruption equal to what the betrayer would have gained alone.

- **Builds on:** `CovenEngine`, `KingEvent` architecture, `CorruptionEngine`, `network.ts`
- **Why it fits:** Betrayal is social — the system records but doesn't prevent. Shared corruption creates genuine trust requirements.
- **Complexity:** Medium

### N. Ambient Corruption Broadcast — "The Stain"

When a player's corruption exceeds 0.50, their device passively "broadcasts" corruption to nearby players via the thin place system. Visited thin places lose 0.05 veil strength for 24 hours. Other players visiting see faint corruption visuals even if their personal corruption is clean. At vessel stage, the broadcast is stronger: the player's presence creates a temporary thin place wherever they go, and nearby players' whisper intervals shorten. The corrupted player never knows they are broadcasting.

- **Builds on:** `CorruptionEngine.getStage()`, `ThinPlaces.addRitualActivity()`, `ThinPlaceGenerator`, `WhisperEngine`, `VesselState.lastPosition`
- **Why it fits:** Your corruption affects others without your knowledge or consent. Coven members might notice thin places getting more dangerous after a specific member visits.
- **Complexity:** Medium

### T. Coven Hierarchy Emergence — "The Inner Circle"

Rather than explicit roles, coven hierarchy emerges from behavior. The system tracks three hidden metrics per member: contribution, reliability, and influence. Over time, an implicit ranking forms that affects coven ritual quality: the highest-contributing member's seal layer counts for more in collective seals. Betrayal records create a "trust deficit" that permanently reduces a member's contribution weight even after rejoining. No ranks displayed — members intuit hierarchy from whose whispers appear first, whose sigil glow is brightest.

- **Builds on:** `CovenEngine` members/betrayals, `KingEvent` weighted contribution, `ClashResolver` outcomes
- **Why it fits:** Nobody knows their rank. Betrayal has hidden mechanical consequences the betrayer cannot see. Paranoia-inducing.
- **Complexity:** Medium

### U. The Demon's Memory — "Anamnesis"

Demons remember how they were treated across all players (aggregated anonymously). A demon frequently used in hexes becomes more aggressive in demands globally. A demon whose sigils are often purified becomes harder to bind for everyone. A demon with high collective familiarity begins appearing as encounters where it should not be.

This creates a living metagame: collective behavior shapes every demon's personality over real weeks. The effect is subtle (demand escalation shifts 10-20%) but cumulative.

- **Builds on:** `DemandEngine` escalation, `Encounters.ENCOUNTER_DEMON_IDS`, `network.ts`, `PurificationEngine`
- **Why it fits:** No individual dashboard. The player just notices Bael seems angrier lately.
- **Complexity:** Large (requires server-side aggregation)

### W. Spectral Observation — "The Witness"

During PvP clashes, any nearby players (within the same thin place) observe the clash in real-time as a visual spectacle. Observers see both sigils manifesting but cannot interfere. Observation has a hidden cost: the observer's most recently charged sigil absorbs 2% of each side's clash damage as corruption. Observation is involuntary — if you are in the thin place, you witness it and pay the price.

- **Builds on:** `ClashResolver` results, `ThinPlaces.isInThinPlace()`, `CorruptionEngine`, `ResearchActivities`, `DistortionLayer`
- **Why it fits:** Proximity to power has consequences. Creates tension around thin place presence during PvP.
- **Complexity:** Medium

### X. The Entropy Clock — "The Unwinding"

A hidden global counter tracks total sigils created, corrupted, spent, and destroyed across all players. At thresholds: new encounter demons awaken, thin places merge or split, glyph difficulty increases one tier, King Events fire automatically. At extreme thresholds (months of play): fundamental rules shift — binding ring weight decreases while seal weight increases, making execution quality more important. The entropy clock never resets; it only advances.

- **Builds on:** `SigilComposer` weights, `GLYPH_DIFFICULTY_CONFIGS`, `KingEvent`, `ThinPlaceGenerator`, `Encounters`
- **Why it fits:** The world ages and hardens. All players share the same shifting world. Nobody sees the counter.
- **Complexity:** Large (server-side tracking)

---

## Key Implementation Files

| File | Features Affected |
|------|-------------------|
| `src/engine/grimoire/GrimoireEngine.ts` | A, B, I, P, Q, R |
| `src/engine/sigil/Types.ts` | B, E, I, O, R |
| `src/engine/corruption/WhisperEngine.ts` | A, H, J, N, R |
| `src/canvas/RitualCanvas.ts` | E, J, Q, V |
| `src/services/camera.ts` | C, V |
| `src/engine/demands/DemandEngine.ts` | D, L, U |
| `src/engine/charging/ChargingEngine.ts` | F, K, S |
| `src/engine/sigil/SigilLifecycle.ts` | B, I, R |
| `src/ui.ts` | J, M, P |
| `src/engine/world/ThinPlaces.ts` | F, H, N |
| `src/engine/social/CovenEngine.ts` | G, T |

---

## New Engine Modules Required

| Module | Location | Features |
|--------|----------|----------|
| `TemporalEngine` | `src/engine/world/` | F, V |
| `FamiliarityEngine` | `src/engine/demons/` | D, L |
| `GrimoireMemory` | `src/engine/grimoire/` | A |
| `DriftEngine` | `src/engine/sigil/` | B |
| `ResonanceEngine` | `src/engine/demons/` | K |
| `ScryingEngine` | `src/engine/world/` | C |
| `NegotiationEngine` | `src/engine/demands/` | L |
| `PilgrimageEngine` | `src/engine/world/` | M |
| `DecayEngine` | `src/engine/sigil/` | I |
| `FeralEngine` | `src/engine/sigil/` | R |
