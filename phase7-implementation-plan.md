# Goetia — Phase 7 Implementation Plan

10 sub-phases (7A–7J), ordered so foundational data-tracking systems come first, features consuming that data come next, visual/atmospheric features follow, and multiplayer closes out. Each sub-phase is independently testable and adds value.

---

## Dependency Graph

```
7A Temporal Tides
 │
 v
7B Sigil Decay ─────────> 7D Sigil Dreaming
 │                          │
 v                          v
7C Demon Familiarity       7E Living Grimoire
 │                          │
 v                          v
7F Inverted Rites/Vessel   7G Harmonics/Feral Sigils
 │                          │
 └────────┬─────────────────┘
          v
        7H Ritual Conditions / Camera Scrying / Acoustic
          │
          v
        7I Negotiations / Glyph Evolution / Shadow Grimoire
          │
          v
        7J Multiplayer (Collective Seals, Broadcast, Inner Circle, Anamnesis, etc.)
```

---

## Sub-Phase 7A: Temporal Tides — "The Hours of Darkness"

**Features:** F (Temporal Tides)

Pure-math foundation with zero new game state. Produces multipliers that every subsequent sub-phase consumes (charging, corruption, decay, purification). Goes first so all later features inherit temporal sensitivity for free.

### New Files

| File | Purpose |
|------|---------|
| `src/engine/temporal/TemporalEngine.ts` | Moon phase calc, witching hour detection, composite modifiers |
| `src/engine/temporal/TemporalEngine.test.ts` | Unit tests |

### Types

```typescript
export interface MoonPhase {
  phase: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' |
         'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent'
  illumination: number  // 0-1
  daysSinceNew: number
}

export interface TemporalModifiers {
  chargeMultiplier: number       // 1.0 base; 2.0 witching hour
  corruptionMultiplier: number   // 1.0 base; 2.0 witching hour
  purificationMultiplier: number // 1.0 base; 1.5 full moon
  veilReduction: number          // 0.0 base; 0.15 new moon
  isWitchingHour: boolean
  isSolstice: boolean
  isEquinox: boolean
  moonPhase: MoonPhase
}
```

### Functions

- `getMoonPhase(timestamp)` — Meeus synodic month algorithm (known new moon epoch + 29.53059-day cycle)
- `isWitchingHour(timestamp)` — local hour 0–3
- `isSolstice(timestamp)` — Jun 20–22, Dec 20–22
- `isEquinox(timestamp)` — Mar 19–21, Sep 22–24
- `getTemporalModifiers(timestamp)` — composite of all above

### Files to Modify

| File | Change |
|------|--------|
| `src/main.ts` | Compute `getTemporalModifiers(now)` at top of tick loop. Multiply into chargeMultiplier: `worldStore.getChargeMultiplier() * temporalModifiers.chargeMultiplier`. Pass corruptionMultiplier to corruption additions. |
| `src/ui.ts` | Moon phase text indicator in toolbar. Method `updateTemporalState(modifiers)`. |

### Store Changes
None. Temporal modifiers are computed fresh each tick (pure function of timestamp).

### Verification
- `npx vitest run src/engine/temporal/TemporalEngine.test.ts`
- Moon phase returns valid phase for any timestamp
- Witching hour identifies midnight–3am local time
- Charge multiplier doubles during witching hour
- Full moon boosts purification multiplier to 1.5
- `npx tsc --noEmit` clean

### Dependencies
None (first sub-phase).

---

## Sub-Phase 7B: The Fading Mark — Sigil Decay

**Features:** I (Sigil Decay & Rebinding), partial Q (rebind count tracking for Strata)

Decay introduces urgency and a reason to revisit sigils. Must exist before familiarity (7C) because familiarity interactions reference sigil age. Creates the rebinding mechanic that feeds into Strata and "ancient" status.

### New Files

| File | Purpose |
|------|---------|
| `src/engine/sigil/DecayEngine.ts` | Decay calculation, rebinding logic, ancient status |
| `src/engine/sigil/DecayEngine.test.ts` | Unit tests |

### Types

```typescript
export interface DecayState {
  sigilId: string
  lastDecayCheck: number
  rebindCount: number       // >= 3 = "ancient"
  totalDecayed: number      // cumulative integrity lost
}

export interface DecayResult {
  newIntegrity: number
  decayed: number           // amount lost this tick
  needsRebinding: boolean   // integrity < 0.30
  isAncient: boolean        // rebindCount >= 3
}
```

### Functions

- `calculateDecay(sigil, decayState, now, temporalModifiers?)` — 0.01/day base; witching hour doubles; corruption scars amplify 1.5x
- `applyDecay(sigil, decayResult)` — returns new Sigil with reduced integrity, updated visualState
- `recordRebind(decayState)` — increment rebindCount
- `isAncient(decayState)` — rebindCount >= 3
- `createDecayState(sigilId, now)` — factory
- Only applies to status `charged` or `awakened`

### Files to Modify

| File | Change |
|------|--------|
| `src/engine/sigil/Types.ts` | Add optional `rebindCount?: number` and `isAncient?: boolean` to `Sigil` |
| `src/db/grimoire.ts` | Extend `GrimoireData` with `decay: Record<string, DecayState>`. Add `getDecayState()`, `saveDecayState()`, `getAllDecayStates()`. Backwards-compatible load. |
| `src/stores/grimoireStore.ts` | Add `decayStates: Record<string, DecayState>` to state. Add `loadDecayStates()`, `updateDecay()` actions. |
| `src/main.ts` | In tick loop, every 60 seconds iterate charged/awakened sigils and apply decay. Call `grimoireStore.updateDecay()`. |

### UI/Canvas
- Grimoire viewer: integrity bar with visual strata stripes (one per rebind)
- "REBIND" button when `needsRebinding` is true → transitions to RING phase

### Verification
- Sigil at 0.85 integrity after 10 days decays to 0.75
- Sigil with 3 rebindings marked ancient
- Ancient sigils receive `isAncient: true`
- Decay states persist across reload
- Temporal modifiers affect decay rate
- No decay on draft/complete/resting/spent

### Dependencies
7A (TemporalEngine) — witching hour decay doubling.

---

## Sub-Phase 7C: The Name That Knows You — Demon Familiarity

**Features:** D (Demon Familiarity)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/familiarity/FamiliarityEngine.ts` | Familiarity tracking, tier system, seal simplification |
| `src/engine/familiarity/FamiliarityEngine.test.ts` | Unit tests |

### Types

```typescript
export type FamiliarityTier = 'stranger' | 'acquaintance' | 'familiar' | 'bonded'

export interface FamiliarityState {
  demonId: string
  score: number            // hidden, 0-1
  tier: FamiliarityTier
  interactionCount: number
  lastInteractionAt: number
  simplifiedEdges: Array<{ from: NodeId; to: NodeId }>
}

export interface FamiliarityEvent {
  type: 'ritual_complete' | 'demand_fulfilled' | 'demand_ignored' |
        'charge_complete' | 'study' | 'hex_cast'
  amount: number
}
```

### Tier Thresholds & Interaction Amounts

| Tier | Score Range | Demand Style |
|------|-------------|--------------|
| stranger | < 0.25 | Generic |
| acquaintance | 0.25–0.49 | Personalized (references other demons, corruption) |
| familiar | 0.50–0.79 | Unsolicited offers (reveal enemy weakness, absorb corruption) |
| bonded | >= 0.80 | Seal simplifies, demands unrefusable |

| Event | Amount |
|-------|--------|
| ritual_complete | +0.05 |
| charge_complete | +0.04 |
| demand_fulfilled | +0.03 |
| hex_cast | +0.02 |
| study | +0.01 |
| demand_ignored | -0.02 |

### Functions

- `createFamiliarityState(demonId)` — factory
- `getTier(score)` — threshold lookup
- `addInteraction(state, event, now)` — update score and tier
- `getDemandPersonalization(tier)` — `'generic' | 'personalized' | 'offers' | 'unrefusable'`
- `getSimplifiedGeometry(state, demon)` — at bonded tier, reduce control points on 2 easiest edges
- `getUnsolicitedOffer(state, demon)` — at familiar+ tier, chance of offer text

### Files to Modify

| File | Change |
|------|--------|
| `src/db/grimoire.ts` | Add `familiarity: Record<string, FamiliarityState>` to `GrimoireData`. Add `getFamiliarity()`, `saveFamiliarity()`, `getAllFamiliarity()`. |
| `src/engine/demands/DemandEngine.ts` | `generateDemand()` accepts optional `familiarityTier`. At familiar+, personalized templates. At bonded, `demand.unrefusable = true`. |
| `src/stores/grimoireStore.ts` | Add `familiarityStates`, `updateFamiliarity` action, load on init. |
| `src/main.ts` | After ritual completion → `addInteraction('ritual_complete')`. After demand fulfillment → `addInteraction('demand_fulfilled')`. Etc. |

### UI/Canvas
- No raw scores. Grimoire page shows flavor text per tier: "A stranger's seal" / "It recognizes your hand" / "The demon speaks your name" / "You are bound together."
- At bonded tier, SealLayer renders simplified edges with fewer ghost points

### Verification
- 20 ritual completions move familiarity from stranger to bonded
- Demand personalization changes at each tier
- Simplified geometry has fewer control points at bonded
- Familiarity persists across reload

### Dependencies
None directly. Works alongside 7B's decay (rebinding also adds familiarity).

---

## Sub-Phase 7D: Oneiric Drift — Sigil Dreaming

**Features:** B (Sigil Dreaming)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/sigil/DreamEngine.ts` | Dream detection, glyph drift, ring shift, lore fragments |
| `src/engine/sigil/DreamEngine.test.ts` | Unit tests |

### Types

```typescript
export interface DreamState {
  sigilId: string
  lastDreamCheck: number
  driftHistory: DriftEvent[]
  loreFragmentsRevealed: string[]
}

export interface DriftEvent {
  timestamp: number
  glyphShifts: Array<{ glyphId: GlyphId; dx: number; dy: number }>
  ringWeakPointShifts: Array<{ index: number; newStartAngle: number; newEndAngle: number }>
  loreFragment: string | null
}

export interface DreamResult {
  drifted: boolean
  driftEvent: DriftEvent | null
  updatedSigil: Sigil
}
```

### Functions

- `checkDream(sigil, dreamState, now, corruptionLevel)` — only for `resting` status, 4+ hours since last check. Glyph shifts in [-0.03, 0.03] × (1 + corruptionLevel). Ring weak points shift up to 15 degrees. 20% lore fragment chance.
- `applyDrift(sigil, drift)` — returns sigil with shifted positions
- `createDreamState(sigilId, now)` — factory
- 12 dream-fragments per demon domain (lore pool)

### Files to Modify

| File | Change |
|------|--------|
| `src/db/grimoire.ts` | Add `dreams: Record<string, DreamState>` to `GrimoireData`. Add `getDreamState()`, `saveDreamState()`. |
| `src/stores/grimoireStore.ts` | Add `dreamStates`, `applyDream` action. |
| `src/main.ts` | On app init, after loading grimoire, iterate resting sigils and call `checkDream()`. Apply drifts and persist. |
| `src/engine/sigil/Types.ts` | Add optional `driftHistory?: DriftEvent[]` to `Sigil` for display. |

### UI/Canvas
- Grimoire viewer: shifted glyph positions render at new locations; ghost outlines at original positions (20% opacity)
- Ring weak points visually shift in BindingRingLayer

### Verification
- No drift if < 4 hours elapsed
- Drift occurs after 4+ hours for resting sigils
- Corruption amplifies drift magnitude
- Lore fragment probability ~20%
- Dream states persist across reload
- No drift on non-resting sigils

### Dependencies
7B (DecayEngine) — corruption scars reference. Corruption system (existing) — corruption level for drift amplification.

---

## Sub-Phase 7E: Palimpsest — The Living Grimoire

**Features:** A (Living Grimoire)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/grimoire/PalimpsestEngine.ts` | Memory scoring, autonomous behaviors, grimoire whispers |
| `src/engine/grimoire/PalimpsestEngine.test.ts` | Unit tests |

### Types

```typescript
export interface GrimoireMemory {
  totalRituals: number
  totalCorruptionAbsorbed: number
  dominantDomain: DemonDomain | null
  memoryScore: number          // hidden 0-1
  lastBehaviorAt: number
  behaviors: GrimoireBehavior[]
}

export type GrimoireBehaviorType = 'page_reorder' | 'bleedthrough' | 'demon_suggestion' | 'whisper'

export interface GrimoireBehavior {
  type: GrimoireBehaviorType
  timestamp: number
  data: Record<string, unknown>
}
```

### Behavior Thresholds

| memoryScore | Behavior | Description |
|-------------|----------|-------------|
| > 0.3 | `page_reorder` | Move most-used demon page to front |
| > 0.5 | `bleedthrough` | Sigil from one page appears faintly on another |
| > 0.7 | `demon_suggestion` | Highlight demon in select screen based on domain + familiarity |
| > 0.7 | `whisper` | Grimoire-specific whisper (no demon attribution) |

Behavior check interval: every 5 minutes of real time.

### Functions

- `createGrimoireMemory()` — factory
- `recordRitual(memory, sigil, corruptionAmount)` — increment totalRituals, update dominant domain, grow memoryScore
- `tickGrimoire(memory, pages, familiarityStates, now)` — returns `{ memory, behavior | null }`
- `generateGrimoireWhisper(memory, pages)` — distinct whisper pool from corruption whispers

### Files to Modify

| File | Change |
|------|--------|
| `src/db/grimoire.ts` | Add `grimoireMemory?: GrimoireMemory` to `GrimoireData`. Add `getGrimoireMemory()`, `saveGrimoireMemory()`. |
| `src/stores/grimoireStore.ts` | Add `grimoireMemory` to state. Add `tickGrimoire`, `recordRitual` actions. |
| `src/main.ts` | Every 300s call `tickGrimoire()`. On ritual completion call `recordRitual()`. Route grimoire whispers through existing whisper UI. |

### UI/Canvas
- Grimoire pages may appear reordered
- Bleedthrough: faint sigil overlay from another demon's page (CSS opacity)
- Demon suggestion: highlighted demon card with "The grimoire suggests..." text

### Verification
- Memory score grows to 0.3 after ~6 rituals
- Behaviors only trigger at correct thresholds
- Grimoire memory persists across reload
- Grimoire whispers distinct from corruption whispers

### Dependencies
7C (FamiliarityEngine) — demon suggestions use familiarity. 7B (DecayEngine) — bleedthrough prefers decaying sigils.

---

## Sub-Phase 7F: Inverted Rites & Vessel Perspective

**Features:** E (Inverted Rites), J (Vessel Perspective "Through Demon Eyes")

### New Files

| File | Purpose |
|------|---------|
| `src/engine/sigil/InvertedRiteEngine.ts` | Phase-order detection, inverted composition, broken rites |
| `src/engine/corruption/VesselPerspective.ts` | UI label replacement, first-person descriptions, auto-guidance, post-purification flicker |
| `src/engine/sigil/InvertedRiteEngine.test.ts` | Unit tests |
| `src/engine/corruption/VesselPerspective.test.ts` | Unit tests |

### Inverted Rites

```typescript
export interface InvertedSigilResult {
  sigil: Sigil
  isDefensive: boolean
  corruptionMultiplier: number  // 2.0
}

export interface BrokenRiteResult {
  sacrificialValue: number      // 0-1, usable as purification component
  corruptionReduction: number
}
```

- `detectInvertedRite(phaseOrder: DrawingPhase[])` — true if RING drawn before SEAL
- `composeInvertedSigil(sigil)` — swap seal/ring weights (ring×0.40 + coherence×0.35 + seal×0.25). Mark defensive. Double corruption.
- `evaluateBrokenRite(sealIntegrity, ringStrength)` — incomplete seal (< 0.5) with ring = sacrificial purification. `sacrificialValue = ringStrength * (1 - sealIntegrity)`

### Vessel Perspective

```typescript
export interface VesselPerspectiveState {
  isActive: boolean
  dominantDemonId: string | null
  perspectiveTexts: Record<string, string>  // UI label replacements
  postPurificationFlickers: boolean
}
```

- `getVesselPerspective(corruptionLevel, boundDemonIds, demons)` — active when >= 0.80. Picks dominant demon (highest rank). Label replacements: SEAL→"CLAIM", GLYPH→"MARK", RING→"CHAIN", BIND→"SUBMIT".
- `getVesselDescription(demonId, demon)` — first-person descriptions
- `generateVesselWhisper(dominantDemon)` — demon-voice whispers
- `hasPostPurificationFlicker(permanentScars)` — true if `persistent_distortion` scar exists

### Files to Modify

| File | Change |
|------|--------|
| `src/stores/canvasStore.ts` | Add `phaseHistory: DrawingPhase[]` to track order. Append on `setPhase`. Derive `isInvertedRite`. |
| `src/canvas/RitualCanvas.ts` | In `composeSigil()`, check inverted rite. Apply inverted composition. Track phase transitions. |
| `src/ui.ts` | Vessel perspective: replace UI labels. Post-purification flicker (random opacity jitter at 2% frequency). |
| `src/main.ts` | On corruption store change, compute vessel perspective, pass to UI. On broken rite detection, compute sacrificial value. |

### Verification
- Drawing RING before SEAL triggers inverted rite
- Inverted sigils have 2x corruption multiplier and swapped weights
- Broken rite with incomplete seal produces sacrificial value
- Vessel perspective replaces UI labels at corruption >= 0.80
- Post-purification flicker persists permanently
- Inverted rite is discoverable only by accident (no UI hints)

### Dependencies
Existing corruption/purification systems. 7A (TemporalEngine) optional.

---

## Sub-Phase 7G: Sympathetic Harmonics & Feral Sigils

**Features:** K (Sympathetic Harmonics), R (Feral Sigils)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/grimoire/HarmonicsEngine.ts` | Domain resonance detection, passive charge, corruption spread |
| `src/engine/grimoire/FeralEngine.ts` | Feral detection, page drift, wild sigil coalescence |
| `src/engine/grimoire/HarmonicsEngine.test.ts` | Unit tests |
| `src/engine/grimoire/FeralEngine.test.ts` | Unit tests |

### Harmonics

```typescript
export interface ResonanceState {
  domain: DemonDomain
  resonatingDemonIds: string[]
  passiveChargeRate: number    // 0.05 (5%)
  corruptionSpreadRate: number // 0.20 (20%)
}

export interface DomainEffect {
  domain: DemonDomain
  chargeBonus: number
  corruptionPenalty: number
}
```

Domain-specific effects:
- **binding**: Strong resonance, attracts hexes
- **knowledge**: Accelerates research, increases whisper frequency
- **destruction**: Boosts clash power, accelerates corruption

Functions: `findResonatingDemons()`, `getDomainEffect()`, `calculatePassiveCharge()`, `calculateCorruptionSpread()`

### Feral Sigils

```typescript
export interface FeralSigilState {
  sigilId: string
  unboundAt: number
  feralAt: number | null      // 7 days after unboundAt
  isFeral: boolean
  driftOffset: { dx: number; dy: number }
}

export interface WildSigilEvent {
  triggered: boolean
  description: string
  purificationRequired: boolean
}
```

Functions: `checkFeralStatus(sigilId, spentAt, now)`, `tickFeralDrift()`, `checkWildSigil(feralSigils)` (3+ feral = wild sigil), `generateFeralWhisper()` (contradictory whisper pool)

### Files to Modify

| File | Change |
|------|--------|
| `src/db/grimoire.ts` | Add `feralStates: Record<string, FeralSigilState>` to `GrimoireData`. |
| `src/stores/grimoireStore.ts` | Add `feralStates`, `resonances`. Add `tickFeral`, `computeResonances` actions. |
| `src/main.ts` | Every 60s compute resonances, tick feral. Apply passive charge. Check wild sigil events. |

### Verification
- Two knowledge-domain demons produce resonance
- Passive charge is 5% of normal rate
- Corruption spreads at 20% between resonating sigils
- Spent sigil becomes feral after 7 days
- 3 feral sigils trigger wild sigil event
- Feral whispers are contradictory and distinct

### Dependencies
7B (DecayEngine) — decay interacts with feral timing. 7E (PalimpsestEngine) — feral sigils contribute to grimoire memory.

---

## Sub-Phase 7H: Ritual Conditions, Camera Scrying & Acoustic Interference

**Features:** V (Ritual Conditions), C (Camera Scrying), S (Acoustic Interference)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/ritual/ConditionsEngine.ts` | Condition detection, modifier calculation, stacking |
| `src/services/microphone.ts` | Web Audio API analyzer, silence/rhythm detection |
| `src/engine/scrying/ScryingEngine.ts` | Frame analysis (luminance, edges, circles), scrying triggers |
| `src/engine/ritual/ConditionsEngine.test.ts` | Unit tests |
| `src/engine/scrying/ScryingEngine.test.ts` | Unit tests (synthetic ImageData) |

### Ritual Conditions

```typescript
export interface RitualConditions {
  darkness: number           // 0-1 from camera luminance
  movement: number           // 0-1 from geolocation velocity
  silence: number            // 0-1 from microphone
  rhythmic: boolean          // from microphone onset detection
  thinPlaceMultiplier: number
  temporalMultiplier: number
}

export interface ConditionModifiers {
  ringBonus: number          // +0.05 in darkness
  sealPenalty: number        // -0.03 during movement
  coherenceBonus: number     // +0.05 during movement
  chargeBonus: number        // from silence
  chargePenalty: number      // from noise
  coherenceRhythmBonus: number // from rhythmic sound
}
```

### Camera Scrying

```typescript
export interface ScryingResult {
  darkness: number
  edgesDetected: number
  circlesDetected: number
  triggerType: 'lore' | 'whisper' | 'veil_reveal' | null
  loreText: string | null
}
```

- `analyzeFrame(imageData)` — Sobel edges, Hough circles, average luminance. All local-only.
- `getScryingTrigger(result, corruptionLevel)` — higher corruption = more sensitive scrying

### Microphone

- `startMicrophone()` / `stopMicrophone()` — Web Audio API `AnalyserNode`
- `analyzeAudioLevel(stream)` → `{ level, isRhythmic, isSilent }` — energy-based onset detection for rhythm

### Files to Modify

| File | Change |
|------|--------|
| `src/services/camera.ts` | Add `captureFrame(video: HTMLVideoElement): ImageData` to grab single frame for analysis. |
| `src/canvas/RitualCanvas.ts` | Accept `conditionModifiers` and apply ring/seal/coherence adjustments in `composeSigil()`. |
| `src/main.ts` | Wire microphone (opt-in). Feed audio analysis into conditions. Wire camera scrying in camera mode. |
| `src/ui.ts` | Microphone permission button. Scrying results as ethereal text overlays. |

### Verification
- Darkness gives +0.05 ring bonus
- Movement gives -0.03 seal / +0.05 coherence
- Silence gives charge bonus
- Scrying detects darkness from synthetic ImageData
- All analysis local-only (no network)
- Conditions stack with temporal and thin place multipliers

### Dependencies
7A (TemporalEngine) — conditions stack with temporal. Existing camera service.

---

## Sub-Phase 7I: Demon Negotiations, Glyph Evolution & Shadow Grimoire

**Features:** L (Demon Negotiations), O (Glyph Evolution), P (Shadow Grimoire)

### New Files

| File | Purpose |
|------|---------|
| `src/engine/demands/NegotiationEngine.ts` | Offer generation, accept/reject/counter, permanent costs |
| `src/engine/sigil/GlyphEvolution.ts` | Drawing history, path averaging, evolved templates |
| `src/engine/grimoire/ShadowGrimoire.ts` | Post-vessel capture, inverted display, time-based fading |
| `src/engine/demands/NegotiationEngine.test.ts` | Unit tests |
| `src/engine/sigil/GlyphEvolution.test.ts` | Unit tests |
| `src/engine/grimoire/ShadowGrimoire.test.ts` | Unit tests |

### Demon Negotiations

```typescript
export interface DemonOffer {
  id: string
  demonId: string
  benefit: { type: 'charge_speed' | 'hex_resist' | 'corruption_shield'; value: number }
  cost: { type: 'doubled_corruption' | 'shifted_geometry' | 'permanent_demand'; description: string }
  expiresAt: number
}
```

- `generateOffer(demon, familiarity, sigil)` — only for awakened+ sigils, acquaintance+ familiarity
- `acceptOffer(offer)` — apply permanent cost, grant benefit
- `rejectOffer(offer)` — familiarity penalty, demand escalation
- `counterOffer(offer)` — modified offer with reduced benefit and cost

### Glyph Evolution

```typescript
export interface GlyphDrawingHistory {
  glyphId: GlyphId
  drawCount: number
  accumulatedPaths: Point[][]  // last N drawings (keep 30)
  evolvedCanonicalPath: Point[] | null  // null until 50+ draws
  divergenceFromOriginal: number
}
```

- `recordDrawing(history, drawnPath)` — store normalized path
- `evolveGlyph(history)` — after 50 draws, average last 20 paths to create evolved canonical
- `getEvolvedTemplate(history, originalPath)` — returns evolved or original
- `calculateDivergence(evolved, original)` — Frechet distance

### Shadow Grimoire

```typescript
export interface ShadowEntry {
  sigilId: string
  demonId: string
  capturedAt: number
  fadeProgress: number     // 0-1; 1 = fully faded (4 real weeks)
  invertedIntegrity: number
  demonPerspectiveLore: string[]
}
```

- `captureShadowEntries(pages, vesselStartedAt)` — snapshot active sigils
- `fadeShadow(entry, now)` — linear fade over 4 weeks
- `getShadowLore(entry, demon)` — demon-perspective lore
- `isShadowVisible(entry)` — fadeProgress < 1.0

### Files to Modify

| File | Change |
|------|--------|
| `src/db/grimoire.ts` | Add `glyphHistory`, `shadowEntries`, `activeOffers` to `GrimoireData`. |
| `src/stores/grimoireStore.ts` | Add state fields and actions for glyph history, shadow entries, offers. |
| `src/engine/sigil/GlyphRecognizer.ts` | Accept optional evolved templates. Use evolved path instead of canonical when available. |
| `src/main.ts` | Wire negotiation offers (generate after awakening). Record glyph draws. On vessel start, capture shadow entries. Tick shadow fading. |

### Verification
- Offers only for awakened+ with acquaintance+ familiarity
- Glyph evolution triggers after 50 draws
- Evolved glyph works with recognizer
- Shadow entries fade over 4 weeks
- Shadow lore is from demon perspective

### Dependencies
7C (FamiliarityEngine) — negotiation requires familiarity. 7F (VesselPerspective) — shadow captures during vessel state.

---

## Sub-Phase 7J: Multiplayer — Collective Seals, Broadcast, Inner Circle & More

**Features:** G (Collective Seal), N (Corruption Broadcast), T (Inner Circle), U (Anamnesis), W (Spectral Observation), X (Entropy Clock), H (Residual Echoes), M (Pilgrimages)

Largest sub-phase. All multiplayer features share network service dependency and are individually small. Grouped because they share infrastructure.

### New Files

| File | Purpose |
|------|---------|
| `src/engine/social/CollectiveRitual.ts` | Shared sigil drawing, avg integrity, split corruption, betrayal shatter |
| `src/engine/social/InnerCircle.ts` | Hidden member weights (contribution, reliability, influence), betrayal penalty |
| `src/engine/world/CorruptionBroadcast.ts` | Broadcast radius, thin place weakening, temp thin places |
| `src/engine/world/Echoes.ts` | Embed whispers at thin places, resonance modifier |
| `src/engine/world/Pilgrimages.ts` | Demon compass bearing, pilgrimage progress, research bonus |
| `src/engine/social/Anamnesis.ts` | Global demon treatment tracking, personality modifiers |
| `src/engine/social/SpectralObservation.ts` | Nearby clash detection, corruption absorption, observation XP |
| `src/engine/world/EntropyClock.ts` | Global sigil counter, thresholds, difficulty shifts, rule modifications |
| 8 corresponding test files | Unit tests |

### Key Types (abbreviated)

**Collective Ritual**: `CollectiveRitualState`, `RitualContribution`, `BetrayalShatter`
**Inner Circle**: `MemberWeight { contribution, reliability, influence }`, `HierarchyState`
**Echoes**: `Echo { text, demonId, intensity }`, `WhisperingWallState`
**Pilgrimages**: `PilgrimageState`, `CompassDirection` — demon bearing from Ars Goetia position
**Anamnesis**: `GlobalDemonMemory`, `DemonPersonality` — collective treatment aggregation
**Entropy Clock**: `EntropyState`, `EntropyThreshold` — global thresholds shift rules

### Files to Modify

| File | Change |
|------|--------|
| `src/services/network.ts` | Add message types for all new systems. Send/receive handlers. |
| `src/stores/pvpStore.ts` | Expand for collective rituals, inner circle, spectral observation. |
| `src/stores/worldStore.ts` | Add echo state, pilgrimage tracking, entropy clock, corruption broadcast. |
| `src/main.ts` | Wire all new systems into tick loop. Add network callbacks. |

### Verification
- Collective ritual averages member contributions
- Betrayal shatters sigil and distributes full corruption
- Inner circle weights affect ritual quality
- Corruption broadcast weakens visited thin places by 0.05/24h
- Echoes persist at thin places permanently
- Pilgrimage tracks movement toward demon bearing, 3x research bonus
- Entropy clock increments on sigil events, triggers at thresholds
- Spectral observation: 2% corruption absorption per clash side

### Dependencies
All previous sub-phases (7A–7I). Especially: 7C (Familiarity), 7A (Temporal), existing PvP/coven.

---

## Summary

### File Count

| Sub-phase | New files | Modified files | Features |
|-----------|-----------|----------------|----------|
| **7A** Temporal | 2 | 2 | F |
| **7B** Decay | 2 | 4 | I, partial Q |
| **7C** Familiarity | 2 | 4 | D |
| **7D** Dreaming | 2 | 4 | B |
| **7E** Palimpsest | 2 | 4 | A |
| **7F** Inverted/Vessel | 4 | 4 | E, J |
| **7G** Harmonics/Feral | 4 | 4 | K, R |
| **7H** Conditions/Scrying | 5 | 4 | V, C, S |
| **7I** Negotiation/Evolution | 6 | 4 | L, O, P |
| **7J** Multiplayer | 16 | 4 | G, N, T, U, W, X, H, M |
| **Total** | **~45** | **~38** | **All 24 features** |

### Critical Files (most frequently modified)

| File | Sub-phases that touch it |
|------|--------------------------|
| `src/db/grimoire.ts` | 7B, 7C, 7D, 7E, 7G, 7I |
| `src/stores/grimoireStore.ts` | 7B, 7C, 7D, 7E, 7G, 7I |
| `src/main.ts` | 7A, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7I, 7J |
| `src/engine/sigil/Types.ts` | 7B, 7D |
| `src/ui.ts` | 7A, 7F, 7H |
| `src/canvas/RitualCanvas.ts` | 7F, 7H |

### Verification Protocol (every sub-phase)

1. `npx tsc --noEmit` — no type errors
2. `npx vitest run` — all tests pass (existing + new)
3. Manual: play through the feature's discovery loop
4. Atmospheric check: confirm no raw numbers surface to the player
