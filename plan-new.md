# Grimoire — Full Implementation Plan (Phases 2–6)

---

## Current State: Phase 1 Complete

Phase 1 (The Ritual Canvas) is fully built and working:

- **Engine** (10 modules): Types, geometry, StrokeEvaluator, SealReconstructor, GlyphLibrary, GlyphRecognizer, BindingRingEvaluator, CoherenceRules, IntentCoherenceChecker, SigilComposer
- **Canvas** (5 modules): AtmosphericLayer, SealLayer, GlyphLayer, BindingRingLayer, RitualCanvas
- **Stores** (2): canvasStore (Zustand vanilla), grimoireStore (Zustand vanilla)
- **DB**: GrimoireDB (localStorage-backed CRUD with status-transition rules)
- **Services**: haptics.ts, audio.ts (Web Audio synthesis)
- **UI**: UIManager (DOM overlay with 3 screens: demon select, ritual canvas, grimoire viewer)
- **Infra**: Vite + TypeScript, PWA manifest, GitHub Actions deploy, path aliases

**Verification**: `npx tsc --noEmit` passes, `npx vitest run` passes (86 tests across 6 files).

---

## Phase 2 — Living Sigils

Sigils gain a real-time lifecycle: charge them with attention, receive demonic demands, and manage the hold window before they destabilise.

### 2.1 — Sigil Lifecycle State Machine

**File**: `src/engine/sigil/SigilLifecycle.ts`

Formalise the status transitions already sketched in `GrimoireDB.VALID_TRANSITIONS`:

```
draft → complete → resting → awakened → charged → spent
```

Create a `SigilLifecycleManager` class:
- `canTransition(from: SigilStatus, to: SigilStatus): boolean`
- `transition(sigil: Sigil, to: SigilStatus): Sigil` — returns new sigil with updated status + timestamp
- `getTimeSinceStatusChange(sigil: Sigil): number`
- Track `statusChangedAt: number` on the Sigil type (new field)

**Types change**: Add `statusChangedAt: number` to the `Sigil` type in `Types.ts`. This is backwards-compatible since existing sigils can default to `createdAt`.

**Tests**: `SigilLifecycle.test.ts`
- Valid transitions succeed
- Invalid transitions throw
- Timestamps are updated

### 2.2 — Charging Engine

**File**: `src/engine/charging/ChargingEngine.ts`

Pure engine logic. No DOM, no timers.

```typescript
interface ChargingState {
  sigilId: string
  demonRank: DemonRank
  startedAt: number
  chargeProgress: number      // 0–1
  lastAttentionAt: number
  attentionCount: number
  decayRate: number           // progress lost per second without attention
}
```

**Core logic**:
- `getRequiredChargeTime(rank: DemonRank): number` — returns milliseconds based on rank:
  - Baron: 8 min (480_000ms)
  - Knight/President: 12 min
  - Earl/Marquis: 18 min
  - Duke: 25 min (1_500_000ms)
  - Prince: 45 min
  - King: 90 min (5_400_000ms)
- `createChargingState(sigilId, demonRank): ChargingState`
- `tick(state: ChargingState, now: number): ChargingState` — advances progress based on elapsed time, applies decay if no recent attention
- `registerAttention(state: ChargingState, now: number): ChargingState` — records attention gesture, resets decay timer
- `isFullyCharged(state: ChargingState): boolean`
- `getDecayAmount(state: ChargingState, now: number): number`

**Decay rule**: If `now - lastAttentionAt > 60_000` (1 minute), progress decays at `0.002/sec` (loses ~12% per minute of inattention). Attention gestures reset the decay timer.

**Tests**: `ChargingEngine.test.ts`
- Charge time scales with rank
- Progress advances with time
- Decay kicks in after 60s of no attention
- Attention resets decay timer
- Fully charged at 1.0

### 2.3 — Attention Gestures

**File**: `src/engine/charging/AttentionGesture.ts`

Define gesture types and recognition:

```typescript
type AttentionGestureType = 'trace_ring' | 'hold_seal' | 'tap_glyph'

interface AttentionGesture {
  type: AttentionGestureType
  required: boolean           // must be performed this cycle
  description: string         // for UI hint display
  cooldownMs: number          // time before this gesture can be used again
}
```

- `getNextGesture(chargingState: ChargingState, demonId: string): AttentionGesture` — selects the next required gesture based on charge progress and demon personality
- `validateGesture(type: AttentionGestureType, stroke: StrokeResult, context: { ringResult?: RingResult }): boolean` — checks if the player's stroke satisfies the gesture

Gesture schedule: Attention required every 30–90 seconds depending on demon rank (higher rank = more frequent). Cycle through trace_ring → hold_seal → tap_glyph.

**Tests**: `AttentionGesture.test.ts`

### 2.4 — Hold Window & Destabilisation

**File**: `src/engine/charging/HoldWindow.ts`

Once fully charged, the sigil enters a hold window:

```typescript
interface HoldWindowState {
  chargedAt: number
  windowDurationMs: number    // 2–4 hours based on integrity
  destabilisationRate: number // 0–1, increases over time past window
}
```

- `getHoldWindowDuration(sigil: Sigil): number` — 2h for integrity < 0.5, 3h for 0.5–0.8, 4h for > 0.8
- `getDestabilisation(state: HoldWindowState, now: number): number` — 0 during window, increases linearly after
- `isCollapsed(state: HoldWindowState, now: number): boolean` — true when destabilisation reaches 1.0 (full collapse ~1h after window ends)

**Tests**: `HoldWindow.test.ts`

### 2.5 — Demonic Demands Engine

**File**: `src/engine/demands/DemandEngine.ts`

Demands are generated from templates tied to demon domain and rank.

```typescript
interface DemonicDemand {
  id: string
  demonId: string
  type: 'silence' | 'darkness' | 'sacrifice' | 'revelation' | 'isolation' | 'offering'
  description: string         // human-readable demand text
  durationMs: number | null   // null for one-shot demands
  issuedAt: number
  deadlineMs: number          // time before the demon considers it ignored
  fulfilled: boolean
  selfReported: boolean       // always true — no surveillance
}
```

**File**: `src/engine/demands/DemandTemplates.ts`

Template registry keyed by `[DemonDomain, DemonRank]`:

- **knowledge** demons: "Be in complete darkness for 20 minutes", "Write down a secret you've never told anyone", "Spend 10 minutes in silence"
- **destruction** demons: "Destroy something you value", "Delete a saved sigil from your grimoire"
- **illusion** demons: "Do not look at a mirror for 6 hours", "Lie to someone today"
- **binding** demons: "Offer the coordinates of someone you have hexed", "Do not leave your current location for 1 hour"
- **revelation** demons: "Tell someone a truth they don't want to hear"
- **transformation** demons: "Change your appearance in some way today"
- **discord** demons: "Do not speak to another player for 6 hours"
- **protection** demons: "Guard a Thin Place for 30 minutes"
- **liberation** demons: "Free a bound demon in your grimoire"

Rank scales demand difficulty:
- Baron: mild demands, 24h deadline
- Duke: moderate, 12h deadline
- King: severe, 6h deadline

**Core logic**:
- `generateDemand(demon: Demon, bindingIntegrity: number): DemonicDemand`
- `escalateDemand(previousDemand: DemonicDemand, demon: Demon): DemonicDemand` — subsequent demands get harder
- `evaluateCompliance(demand: DemonicDemand, selfReported: boolean): DemandOutcome`

`DemandOutcome`:
- `fulfilled` — binding strengthened slightly
- `ignored` — binding weakens, future demands escalate
- `lied` — hidden flag tracked internally; demon becomes unreliable (random chance of sigil misfiring)

**Tests**: `DemandEngine.test.ts`, `DemandTemplates.test.ts`

### 2.6 — Charging Store

**File**: `src/stores/chargingStore.ts`

Zustand vanilla store managing active charging sessions:

```typescript
interface ChargingStoreState {
  activeCharges: Map<string, ChargingState>    // sigilId → state
  activeDemands: Map<string, DemonicDemand[]>  // demonId → demands
}
```

Actions:
- `startCharging(sigil: Sigil, demon: Demon): void`
- `tickAll(now: number): void` — advance all active charges
- `registerAttention(sigilId: string, now: number): void`
- `fulfillDemand(demandId: string): void`
- `getChargingState(sigilId: string): ChargingState | null`

### 2.7 — Charging UI

**Modifications to**: `src/ui.ts`

Add a fourth screen: `CHARGING`
- Shows the sigil being charged with a circular progress indicator
- Displays current attention gesture requirement (text + animation hint)
- Shows countdown to next required attention
- When charged, shows hold window countdown
- Displays active demonic demands with fulfill/ignore buttons
- Self-report compliance toggle for ongoing demands

**New canvas layer**: `src/canvas/ChargingOverlayLayer.ts`
- Pulse animation on the sigil during charging
- Visual decay indicator when attention lapses
- Glow intensifies as charge progresses

### 2.8 — Charging Integration

**Modifications to**: `src/main.ts`

- Add a `setInterval` or `requestAnimationFrame` tick loop that calls `chargingStore.tickAll(Date.now())` every second
- Wire attention gesture recognition into existing pointer event system
- Connect charging completion to sigil status transitions via `SigilLifecycleManager`
- Wire demand generation to occur when a sigil reaches `complete` status

### Phase 2 Checkpoint
- `npx tsc --noEmit` — no type errors
- `npx vitest run` — all tests pass (engine charging tests + existing)
- Manual: charge a sigil, perform attention gestures, see it reach charged state
- Manual: receive and self-report a demonic demand

---

## Phase 3 — The Grimoire (Research & Discovery)

Players discover new demons through research. Partial knowledge yields partial seals.

### 3.1 — Research Progress System

**File**: `src/engine/research/ResearchEngine.ts`

```typescript
interface ResearchState {
  demonId: string
  progress: number            // 0–1
  discoveredNodes: NodeId[]   // which seal nodes the player knows
  discoveredEdges: Array<{ from: NodeId; to: NodeId }>
  loreFragments: string[]     // flavour text unlocked at thresholds
}
```

- `initResearch(demonId: string): ResearchState` — starts at 0, no nodes known
- `addResearchProgress(state: ResearchState, amount: number, demon: Demon): ResearchState` — reveals nodes/edges as progress passes thresholds
- `getVisibleGeometry(state: ResearchState, demon: Demon): SealGeometry` — returns only discovered nodes/edges
- `isFullyResearched(state: ResearchState): boolean`

Research progress thresholds for node/edge reveal:
- 0.10: first 2 nodes revealed
- 0.25: first 2 edges revealed
- 0.50: half of all nodes + edges
- 0.75: all nodes, most edges
- 1.00: full geometry (identical to canonical seal)

**Tests**: `ResearchEngine.test.ts`

### 3.2 — Research Activities

**File**: `src/engine/research/ResearchActivities.ts`

Ways to earn research progress:
- `completedRitual(integrity: number): number` — research XP proportional to sigil quality
- `studiedSigil(sigil: Sigil): number` — small XP from examining grimoire entries
- `discoveredFragment(fragmentId: string): number` — lore fragments found via exploration (Phase 4 tie-in)
- `tradedKnowledge(otherPlayerProgress: number): number` — future multiplayer (Phase 5 tie-in)

### 3.3 — Research Persistence

**Modifications to**: `src/db/grimoire.ts`

Add `researchProgress` map to the stored data:

```typescript
interface GrimoireData {
  pages: GrimoirePage[]
  research: Record<string, ResearchState>  // demonId → research state
}
```

Update `GrimoireDB`:
- `getResearch(demonId: string): ResearchState | null`
- `saveResearch(state: ResearchState): void`

### 3.4 — Research Store

**File**: `src/stores/researchStore.ts`

Zustand vanilla store wrapping research persistence:
- `researching: Record<string, ResearchState>`
- `addProgress(demonId: string, amount: number): void`
- `getVisibleGeometry(demonId: string): SealGeometry | null`

### 3.5 — Partial Seal Rendering

**Modifications to**: `src/canvas/SealLayer.ts`

- Accept a `visibleGeometry: SealGeometry` that may be a subset of the demon's full geometry
- Render unknown nodes as dim question marks or barely-visible outlines
- Render unknown edges as faint dotted lines (hint at structure without revealing exact path)
- Player can still attempt to draw between unknown nodes — accuracy is scored but with no canonical reference, max accuracy is capped at 0.5

### 3.6 — Expanded Demon Registry

**File**: `src/engine/demons/DemonRegistry.ts` — expand to include more demons

Phase 3 adds 6 more demons (total: 12). Each needs:
- Unique seal geometry (nodes + edges)
- Rank, domains, legions, description
- Edge weights summing to ~1.0

Suggested additions (demons 7–12 from the Ars Goetia):
- **Amon** (7th, Marquis) — discord, knowledge
- **Barbatos** (8th, Duke) — knowledge, revelation
- **Paimon** (9th, King) — knowledge, binding
- **Buer** (10th, President) — knowledge, transformation
- **Gusion** (11th, Duke) — knowledge, revelation
- **Sitri** (12th, Prince) — illusion, discord

Players start with Bael visible. Others require research to discover.

### 3.7 — Discovery UI

**Modifications to**: `src/ui.ts`

- Demon select screen: cards for un-researched demons show as locked/shadowed with "???" name
- Research progress bar on each card
- Tap a locked demon to see hints about how to discover it
- Grimoire viewer shows research state per demon

### 3.8 — Sigil Study Screen

**New screen in**: `src/ui.ts`

When viewing a saved sigil in the grimoire:
- Show a visual reconstruction of the sigil (seal + glyphs + ring)
- "Study" button: grants small research XP toward that demon
- Cooldown on study (once per 10 minutes per sigil)
- Display sigil metadata: visual state, creation date, integrity

### Phase 3 Checkpoint
- `npx tsc --noEmit` — no type errors
- `npx vitest run` — all tests pass
- Manual: start with only Bael visible, complete rituals, see research progress reveal new demons
- Manual: draw on a partially-researched seal, observe reduced accuracy cap

---

## Phase 4 — The World (Thin Places & Location)

Geolocation integration. Real-world coordinates affect gameplay.

### 4.1 — Geolocation Service

**File**: `src/services/geolocation.ts`

Wraps the Geolocation API:
- `getCurrentPosition(): Promise<{ lat: number; lng: number } | null>`
- `watchPosition(callback: (pos) => void): number` (watch ID)
- `clearWatch(id: number): void`
- Permission handling with graceful fallback

### 4.2 — Thin Places Engine

**File**: `src/engine/world/ThinPlaces.ts`

```typescript
interface ThinPlace {
  id: string
  type: 'fixed' | 'dynamic' | 'player_created'
  center: { lat: number; lng: number }
  radiusMeters: number
  veilStrength: number        // 0–1; lower = thinner veil
  createdAt: number
  createdBy: string | null    // player ID for player-created
  ritualActivity: number      // accumulated ritual energy
}
```

- `isInThinPlace(playerPos, thinPlaces): ThinPlace | null`
- `getChargeMultiplier(thinPlace: ThinPlace | null): number` — 1.0 outside, 1.5–3.0 inside depending on veil strength
- `getCorruptionMultiplier(thinPlace: ThinPlace | null): number` — same scaling, corruption also increases faster
- `addRitualActivity(thinPlace: ThinPlace, intensity: number): ThinPlace` — dynamic places grow stronger with use

### 4.3 — Fixed Thin Places Data

**File**: `src/engine/world/FixedThinPlaces.ts`

Seed data for historically/mythologically significant locations:
- Crossroads, ancient ruins, sites referenced in goetic tradition
- ~20 fixed locations worldwide as initial seed data
- Configurable via JSON for easy expansion

### 4.4 — Dynamic Thin Place Generation

**File**: `src/engine/world/ThinPlaceGenerator.ts`

Algorithm for creating dynamic thin places:
- Track player ritual activity by geographic cell (geohash-based grid)
- When ritual density in a cell exceeds threshold, spawn a dynamic thin place
- Dynamic places decay over time without continued activity (half-life of 48 hours)

### 4.5 — Player-Created Thin Places

Extension of dynamic generation:
- Requires sustained ritual activity at a specific location over 7+ days
- Must involve at least 3 unique demon types
- Once created, visible to all players (future multiplayer tie-in)
- Creator's sigils charged here get a bonus multiplier

### 4.6 — World Store

**File**: `src/stores/worldStore.ts`

```typescript
interface WorldState {
  playerPosition: { lat: number; lng: number } | null
  nearbyThinPlaces: ThinPlace[]
  currentThinPlace: ThinPlace | null
  locationPermission: 'granted' | 'denied' | 'prompt'
}
```

### 4.7 — World Map UI

**New screen in**: `src/ui.ts`

Minimal map view (no external map library — too heavy for Phase 4):
- Radar-style display showing nearby thin places as pulsing dots
- Distance and direction indicators
- Current thin place effects displayed when inside one
- Charge rate modifier shown on charging screen

### 4.8 — PvE Encounters

**File**: `src/engine/world/Encounters.ts`

Unbound demons haunt Thin Places:
- `generateEncounter(thinPlace: ThinPlace): Encounter | null` — random chance based on veil strength
- Encounters interfere with active rituals: canvas distortions, false node positions, glyph interference
- Players can attempt to bind encountered demons for bonus research XP

**File**: `src/canvas/DistortionLayer.ts`
- Visual distortion effects during PvE encounters
- Wavy node positions, flickering edges, colour shifts

### Phase 4 Checkpoint
- `npx tsc --noEmit` — no type errors
- `npx vitest run` — all tests pass
- Manual: grant location permission, see thin place indicator
- Manual: charge a sigil inside a thin place, observe faster charge rate

---

## Phase 5 — PvP (Clash Resolution & Covens)

Multiplayer conflict system. Requires a backend (out of scope for this plan's code — architecture only).

### 5.1 — Backend Architecture (Design Only)

Required infrastructure:
- **WebSocket server** for real-time clash resolution
- **REST API** for grimoire sync, coven management, demand tracking
- **Database**: PostgreSQL for player accounts, sigils, covens; Redis for real-time state
- **Auth**: anonymous accounts initially (device ID), upgrade to email/OAuth later

Suggested stack: Node.js + Fastify + Prisma + WebSocket (ws library)

### 5.2 — Clash Resolution Engine

**File**: `src/engine/pvp/ClashResolver.ts`

Pure engine logic — no network code.

```typescript
interface ClashInput {
  attacker: { sigil: Sigil; demon: Demon }
  defender: { sigil: Sigil; demon: Demon }
}

type ClashOutcome = 'clean_win' | 'contested_win' | 'mutual_destruction' | 'catastrophic_loss' | 'absorption'

interface ClashResult {
  outcome: ClashOutcome
  winner: 'attacker' | 'defender' | null
  attackerDamage: number      // corruption gained by attacker
  defenderDamage: number      // corruption gained by defender
  details: string             // narrative description
}
```

Resolution formula across 3 axes:

**Axis 1 — Demonic Hierarchy** (weight: 0.35):
- Base power from rank: King=8, Prince=7, Duke=6, Marquis=5, Earl=4, Knight=3, President=3, Baron=2
- Domain modifiers (±2):
  - Binding > Liberation
  - Illusion > Revelation
  - Destruction > Protection (but Protection can contain Destruction with high integrity)
  - Knowledge is neutral

**Axis 2 — Execution Quality** (weight: 0.40):
- Direct comparison of `sigil.overallIntegrity`
- Difference amplified: `qualityAdvantage = (attackerIntegrity - defenderIntegrity) * 2`

**Axis 3 — Intent Coherence** (weight: 0.25):
- Incoherent sigils are deflectable
- `coherenceAdvantage = attackerCoherence - defenderCoherence`
- Contradictions in the loser's sigil amplify damage

Outcome thresholds:
- Score > 0.6: clean win
- Score 0.3–0.6: contested win
- Score -0.3–0.3: mutual destruction
- Score < -0.3: catastrophic loss
- Special: binding-domain sigil vs non-binding with score > 0.5 → absorption

**Tests**: `ClashResolver.test.ts` — extensive matrix of matchups

### 5.3 — Hex & Ward System

**File**: `src/engine/pvp/HexSystem.ts`

```typescript
interface Hex {
  id: string
  casterId: string
  targetId: string
  sigil: Sigil
  type: 'hex' | 'ward'
  expiresAt: number
  isActive: boolean
}
```

- Hexes: offensive sigils directed at a target player
- Wards: defensive sigils that auto-trigger against incoming hexes
- Ward vs hex → automatic clash resolution

### 5.4 — Misfire System

**File**: `src/engine/pvp/MisfireEngine.ts`

When a sigil loses a clash:
- `calculateMisfire(sigil: Sigil, clashResult: ClashResult): MisfireResult`
- Low-integrity sigils rebound harder: `misfireSeverity = (1 - integrity) * 1.5`
- Effects: corruption gain, sigil destroyed, random demand issued, canvas distortion applied

### 5.5 — Coven System

**File**: `src/engine/social/CovenEngine.ts`

```typescript
interface Coven {
  id: string
  name: string
  members: string[]           // player IDs
  sharedGrimoire: Sigil[]     // sigils contributed to the coven
  createdAt: number
}
```

- `createCoven(name, founderId): Coven`
- `inviteMember(coven, playerId): Coven`
- `contributeSigil(coven, sigil): Coven`
- `exposeSigil(coven, sigilId, targetPlayerId): void` — betrayal mechanic

No system enforcement of betrayal — it's purely social. The game records contributions and exposures but doesn't flag them automatically.

### 5.6 — PvP Network Layer

**File**: `src/services/network.ts`

WebSocket client for real-time PvP:
- `connect(serverUrl): void`
- `sendClashChallenge(targetId, sigil): void`
- `onClashResult(callback): void`
- `sendHex(targetId, sigil): void`
- `onIncomingHex(callback): void`

### 5.7 — PvP UI

**Modifications to**: `src/ui.ts`

New screens:
- **Clash screen**: shows both sigils facing off, animated resolution, outcome display
- **Hex/Ward management**: list active hexes and wards
- **Coven screen**: member list, shared grimoire, invite system

### Phase 5 Checkpoint
- `npx tsc --noEmit` — no type errors
- `npx vitest run` — clash resolver tests pass with full matchup matrix
- Manual: initiate a clash (mock opponent), see resolution animation

---

## Phase 6 — Endgame (Corruption, Vessels & Kings)

### 6.1 — Corruption System

**File**: `src/engine/corruption/CorruptionEngine.ts`

```typescript
interface CorruptionState {
  level: number               // 0–1
  sources: CorruptionSource[] // audit trail
  stage: 'clean' | 'tainted' | 'compromised' | 'vessel'
}

interface CorruptionSource {
  type: 'pact' | 'sigil_cast' | 'clash_loss' | 'misfire' | 'demand_ignored'
  amount: number
  timestamp: number
}
```

Corruption sources and amounts:
- Sigil cast: +0.01–0.05 (based on demon rank)
- Clash loss: +0.05–0.15
- Misfire: +0.03–0.10
- Demand ignored: +0.02–0.08
- Pact with high-rank demon: +0.05–0.20

Stage thresholds:
- clean: 0–0.25
- tainted: 0.25–0.50
- compromised: 0.50–0.80
- vessel: 0.80–1.00

**Corruption never decreases on its own.**

### 6.2 — Corruption Visual Effects

**File**: `src/canvas/CorruptionEffects.ts`

Progressive visual degradation:

**Tainted (0.25–0.50)**:
- Subtle colour shifts on the canvas (slight red tint)
- Occasional flicker on UI text
- Seal nodes drift slightly from true position (±2px)

**Compromised (0.50–0.80)**:
- Heavy colour distortion (desaturation + crimson overlay)
- UI elements sometimes display wrong values briefly
- "Whispers" — random text fragments appear in the interface for 1–3 seconds
- Seal geometry wobbles during drawing
- Sigils occasionally show false visual states

**Vessel (0.80–1.00)**:
- Canvas becomes nearly unusable with visual noise
- Player can no longer draw new sigils
- Transition to vessel state triggers within 24 hours

### 6.3 — Whisper System

**File**: `src/engine/corruption/WhisperEngine.ts`

Generates contextual whisper text based on corruption level and bound demons:
- Low corruption: cryptic hints ("The seal knows your name")
- Medium: disturbing observations ("You've drawn this before. You just don't remember.")
- High: direct threats ("Stop fighting it.")

Whispers are injected into the UI at random intervals (30s–5min, more frequent as corruption rises).

### 6.4 — Vessel State

**File**: `src/engine/corruption/VesselState.ts`

When corruption reaches 1.0:
- Player character is "taken"
- All bound demons + corrupted sigils become PvE content
- The vessel appears in Thin Places near the player's last known location
- Vessel power = sum of all bound demon ranks + highest sigil integrity

### 6.5 — Purification Ritual

**File**: `src/engine/corruption/PurificationEngine.ts`

Another player (or coven) can attempt purification:
- Requires drawing a purification seal (new unique geometry)
- Must match or exceed the vessel's combined power
- Success: player restored with corruption reduced to 0.30 (not zero — permanent scars)
- Failure: corruption spreads to the purifier (+0.10)

**Permanent scars after purification**:
- One random demon is permanently "suspicious" — demands are always max difficulty
- Seal geometry for one demon is permanently shifted by ±0.02 on each node (never draws as cleanly)
- Visual: slight persistent distortion on the canvas that never fully resolves

### 6.6 — Full 72 Demon Registry

**File**: `src/engine/demons/DemonRegistry.ts` — expand to all 72

This is a major content task. Each demon needs:
- Unique seal geometry (5–10 nodes, 5–12 edges)
- Rank, domains, legions (sourced from the Ars Goetia)
- Edge weights summing to ~1.0
- Unique description

Approach: generate geometry procedurally using geometric primitives (polygons, stars, overlapping shapes) seeded from demon attributes, then hand-tune for visual distinctiveness.

Organisation: split into multiple files by rank group:
- `src/engine/demons/kings.ts` (9 demons)
- `src/engine/demons/dukes.ts` (21 demons)
- `src/engine/demons/princes.ts` (3 demons)
- `src/engine/demons/marquises.ts` (14 demons)
- `src/engine/demons/earls.ts` (9 demons)
- `src/engine/demons/presidents.ts` (8 demons)
- `src/engine/demons/knights.ts` (3 demons)
- `src/engine/demons/barons.ts` (5 demons)
- `DemonRegistry.ts` re-exports merged registry

### 6.7 — King-Rank World Events

**File**: `src/engine/world/KingEvent.ts`

King-ranked demons require coven-level coordination:
- 3+ players must simultaneously maintain separate sigil components
- Each player is assigned one layer (seal, glyphs, or ring) of a shared meta-sigil
- Real-time synchronisation via WebSocket
- If any component fails, the entire binding collapses
- Failed King binding: the King becomes an unbound world event affecting all nearby players for 24 hours

### Phase 6 Checkpoint
- `npx tsc --noEmit` — no type errors
- `npx vitest run` — corruption + purification tests pass
- Manual: accumulate corruption, observe progressive visual degradation
- Manual: reach vessel state, observe character removal

---

## Implementation Priority & Dependencies

```
Phase 2 (Living Sigils)
  ├── 2.1 Lifecycle state machine (standalone)
  ├── 2.2 Charging engine (depends on 2.1)
  ├── 2.3 Attention gestures (depends on 2.2)
  ├── 2.4 Hold window (depends on 2.2)
  ├── 2.5 Demonic demands (standalone)
  ├── 2.6 Charging store (depends on 2.2, 2.5)
  ├── 2.7 Charging UI (depends on 2.6)
  └── 2.8 Integration (depends on all above)

Phase 3 (Research)
  ├── 3.1 Research engine (standalone)
  ├── 3.2 Research activities (depends on 3.1)
  ├── 3.3 Research persistence (depends on 3.1)
  ├── 3.4 Research store (depends on 3.1, 3.3)
  ├── 3.5 Partial seal rendering (depends on 3.1, 3.4)
  ├── 3.6 Expanded registry (standalone, large content task)
  ├── 3.7 Discovery UI (depends on 3.4, 3.6)
  └── 3.8 Sigil study screen (depends on 3.2, 3.4)

Phase 4 (World) — requires Phase 3
  ├── 4.1 Geolocation service (standalone)
  ├── 4.2 Thin places engine (standalone)
  ├── 4.3 Fixed thin places data (depends on 4.2)
  ├── 4.4 Dynamic generation (depends on 4.2)
  ├── 4.5 Player-created places (depends on 4.4)
  ├── 4.6 World store (depends on 4.1, 4.2)
  ├── 4.7 World map UI (depends on 4.6)
  └── 4.8 PvE encounters (depends on 4.2, 4.6)

Phase 5 (PvP) — requires Phase 4
  ├── 5.1 Backend architecture (design doc, no code)
  ├── 5.2 Clash resolver (standalone engine)
  ├── 5.3 Hex/ward system (depends on 5.2)
  ├── 5.4 Misfire engine (depends on 5.2)
  ├── 5.5 Coven system (standalone)
  ├── 5.6 Network layer (depends on 5.1)
  └── 5.7 PvP UI (depends on 5.2–5.6)

Phase 6 (Endgame) — requires Phase 5
  ├── 6.1 Corruption engine (standalone)
  ├── 6.2 Corruption effects (depends on 6.1)
  ├── 6.3 Whisper system (depends on 6.1)
  ├── 6.4 Vessel state (depends on 6.1)
  ├── 6.5 Purification (depends on 6.4)
  ├── 6.6 Full 72 demons (standalone, very large)
  └── 6.7 King events (depends on 5.5, 5.6, 6.6)
```

---

## New Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 2 | 8 engine + 1 store + 1 canvas + 5 test | main.ts, ui.ts, Types.ts |
| 3 | 3 engine + 1 store + 2 test | grimoire.ts, SealLayer.ts, DemonRegistry.ts, ui.ts |
| 4 | 5 engine + 1 service + 1 store + 1 canvas + 3 test | ui.ts, main.ts |
| 5 | 5 engine + 1 service + 3 test | ui.ts |
| 6 | 5 engine + 1 canvas + 8 demon files + 3 test | DemonRegistry.ts, ui.ts, main.ts |
| **Total** | **~45 new files** | **~10 modified files** |

---

## Key Architecture Decisions

1. **Engine purity maintained**: All new game logic goes in `src/engine/`. No PixiJS, no DOM, no network code in engine modules.

2. **Zustand vanilla stores**: Continue using `createStore` (not React `create`) since there's no React in this project.

3. **Backend deferred**: Phases 2–4 are fully offline/single-player. Backend only required starting Phase 5 (PvP).

4. **Progressive enhancement**: Each phase adds value independently. The game is playable after each phase completion.

5. **72 demons as content pipeline**: Demon data is the largest single task. Use procedural geometry generation + hand-tuning rather than hand-crafting all 72 from scratch.

6. **Corruption as atmosphere**: Visual corruption effects are the game's signature. Invest heavily in canvas shader/distortion quality for Phase 6.
