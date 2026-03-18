// ─── Types ─────────────────────────────────────────────────────────────────

export type EntropyEventType = 'sigil_created' | 'sigil_corrupted' | 'sigil_spent' | 'sigil_destroyed'

export interface EntropyThreshold {
  /** Counter value that triggers this threshold */
  value: number
  /** Description of what happens at this threshold */
  label: string
  /** Whether this threshold has been triggered */
  triggered: boolean
}

export interface EntropyState {
  /** Total accumulated entropy counter (never resets) */
  counter: number
  /** Breakdown by event type */
  events: Record<EntropyEventType, number>
  /** Thresholds and their trigger status */
  thresholds: EntropyThreshold[]
}

export interface EntropyEffects {
  /** New encounter demons to awaken at this entropy level */
  newEncounterDemons: boolean
  /** Whether thin places should merge or split */
  thinPlaceMutation: boolean
  /** Glyph difficulty increase tier (0 = no change, 1 = one tier up) */
  glyphDifficultyIncrease: number
  /** Whether king events should fire automatically */
  autoKingEvents: boolean
  /** Binding ring weight modifier (decreases at extreme entropy) */
  ringWeightModifier: number
  /** Seal weight modifier (increases at extreme entropy) */
  sealWeightModifier: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Default thresholds for the entropy clock. */
const DEFAULT_THRESHOLDS: EntropyThreshold[] = [
  { value: 100, label: 'new_encounters', triggered: false },
  { value: 250, label: 'thin_place_mutation', triggered: false },
  { value: 500, label: 'glyph_difficulty_increase', triggered: false },
  { value: 1000, label: 'auto_king_events', triggered: false },
  { value: 2500, label: 'weight_shift', triggered: false },
]

// ─── Factory ───────────────────────────────────────────────────────────────

export function createEntropyState(): EntropyState {
  return {
    counter: 0,
    events: {
      sigil_created: 0,
      sigil_corrupted: 0,
      sigil_spent: 0,
      sigil_destroyed: 0,
    },
    thresholds: DEFAULT_THRESHOLDS.map(t => ({ ...t })),
  }
}

// ─── Core Logic ────────────────────────────────────────────────────────────

/**
 * Record a sigil event, incrementing the entropy counter.
 * Different event types contribute different amounts of entropy.
 */
export function recordEntropyEvent(
  state: EntropyState,
  eventType: EntropyEventType,
): EntropyState {
  const weight = getEventWeight(eventType)
  const counter = state.counter + weight
  const events = { ...state.events, [eventType]: state.events[eventType] + 1 }

  // Check and trigger thresholds
  const thresholds = state.thresholds.map(t =>
    !t.triggered && counter >= t.value ? { ...t, triggered: true } : t,
  )

  return { counter, events, thresholds }
}

/**
 * Get the entropy weight for an event type.
 * Corrupted and destroyed sigils generate more entropy.
 */
function getEventWeight(eventType: EntropyEventType): number {
  switch (eventType) {
    case 'sigil_created': return 1
    case 'sigil_spent': return 2
    case 'sigil_corrupted': return 3
    case 'sigil_destroyed': return 5
  }
}

/**
 * Get the current entropy effects based on triggered thresholds.
 */
export function getEntropyEffects(state: EntropyState): EntropyEffects {
  const triggered = new Set(
    state.thresholds.filter(t => t.triggered).map(t => t.label),
  )

  // Weight shift: binding ring weight decreases, seal weight increases
  const weightShift = triggered.has('weight_shift')
  const baseRingWeight = 0.25
  const baseSealWeight = 0.40

  return {
    newEncounterDemons: triggered.has('new_encounters'),
    thinPlaceMutation: triggered.has('thin_place_mutation'),
    glyphDifficultyIncrease: triggered.has('glyph_difficulty_increase') ? 1 : 0,
    autoKingEvents: triggered.has('auto_king_events'),
    ringWeightModifier: weightShift ? baseRingWeight * 0.6 : baseRingWeight,
    sealWeightModifier: weightShift ? baseSealWeight * 1.25 : baseSealWeight,
  }
}

/**
 * Get newly triggered thresholds (triggered this update but not before).
 * Useful for firing one-time events.
 */
export function getNewlyTriggered(
  before: EntropyState,
  after: EntropyState,
): EntropyThreshold[] {
  return after.thresholds.filter((t, i) => t.triggered && !before.thresholds[i].triggered)
}

/**
 * Check if a specific threshold has been triggered.
 */
export function isThresholdTriggered(state: EntropyState, label: string): boolean {
  return state.thresholds.some(t => t.label === label && t.triggered)
}
