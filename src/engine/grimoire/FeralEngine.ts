import type { Sigil } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FeralSigilState {
  sigilId: string
  demonId: string
  unboundAt: number
  feralAt: number | null
  isFeral: boolean
  driftOffset: { dx: number; dy: number }
}

export interface WildSigilEvent {
  triggered: boolean
  description: string
  feralCount: number
}

export interface FeralTickResult {
  updatedStates: Record<string, FeralSigilState>
  statesChanged: boolean
  wildEvent: WildSigilEvent | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Days until a spent sigil turns feral. */
const FERAL_DELAY_MS = 7 * 24 * 60 * 60_000

/** Maximum drift per tick (normalised 0–1 space). */
const MAX_DRIFT_PER_TICK = 0.005

/** Number of feral sigils needed to trigger a wild sigil event. */
const WILD_SIGIL_THRESHOLD = 3

// ─── Feral whisper pool ───────────────────────────────────────────────────

const FERAL_WHISPERS = [
  'The sigil remembers a name you never spoke.',
  'Something you bound has slipped its leash.',
  'The ink writhes when you turn your back.',
  'A mark you made has begun to unmake itself.',
  'Two sigils are whispering to each other.',
  'The grimoire is writing in a hand that is not yours.',
  'A spent seal still draws breath.',
  'The binding was not broken — it was reversed.',
]

// ─── Core functions ───────────────────────────────────────────────────────

/**
 * Check if a spent sigil should become feral.
 * Returns a new or updated FeralSigilState.
 */
export function checkFeralStatus(
  sigil: Sigil,
  existingState: FeralSigilState | undefined,
  now: number,
): FeralSigilState | null {
  // Only spent sigils can go feral
  if (sigil.status !== 'spent') return null

  const unboundAt = existingState?.unboundAt ?? sigil.statusChangedAt
  const feralAt = unboundAt + FERAL_DELAY_MS
  const isFeral = now >= feralAt

  if (existingState && existingState.isFeral === isFeral) {
    return existingState // no change
  }

  return {
    sigilId: sigil.id,
    demonId: sigil.demonId,
    unboundAt,
    feralAt: isFeral ? feralAt : null,
    isFeral,
    driftOffset: existingState?.driftOffset ?? { dx: 0, dy: 0 },
  }
}

/**
 * Tick feral drift — feral sigils slowly shift position.
 * Returns updated states with drift applied.
 */
export function tickFeralDrift(
  states: Record<string, FeralSigilState>,
): Record<string, FeralSigilState> {
  let changed = false
  const updated: Record<string, FeralSigilState> = {}

  for (const [id, state] of Object.entries(states)) {
    if (!state.isFeral) {
      updated[id] = state
      continue
    }

    // Random drift in normalised space
    const dx = state.driftOffset.dx + (Math.random() - 0.5) * MAX_DRIFT_PER_TICK * 2
    const dy = state.driftOffset.dy + (Math.random() - 0.5) * MAX_DRIFT_PER_TICK * 2

    // Clamp to prevent excessive drift
    const clampedDx = Math.max(-0.1, Math.min(0.1, dx))
    const clampedDy = Math.max(-0.1, Math.min(0.1, dy))

    updated[id] = {
      ...state,
      driftOffset: { dx: clampedDx, dy: clampedDy },
    }
    changed = true
  }

  return changed ? updated : states
}

/**
 * Process all sigils for feral status and drift.
 * Called periodically (every 60s).
 */
export function tickFeral(
  sigils: Sigil[],
  existingStates: Record<string, FeralSigilState>,
  now: number,
): FeralTickResult {
  let statesChanged = false
  const updatedStates: Record<string, FeralSigilState> = { ...existingStates }

  // Check each sigil for feral status
  for (const sigil of sigils) {
    const result = checkFeralStatus(sigil, existingStates[sigil.id], now)
    if (result && result !== existingStates[sigil.id]) {
      updatedStates[sigil.id] = result
      statesChanged = true
    }
  }

  // Remove states for sigils that are no longer spent
  for (const id of Object.keys(updatedStates)) {
    const sigil = sigils.find(s => s.id === id)
    if (sigil && sigil.status !== 'spent') {
      delete updatedStates[id]
      statesChanged = true
    }
  }

  // Apply drift to feral sigils
  const drifted = tickFeralDrift(updatedStates)
  if (drifted !== updatedStates) {
    statesChanged = true
  }

  // Check for wild sigil event (3+ feral)
  const feralCount = Object.values(drifted).filter(s => s.isFeral).length
  const wildEvent = feralCount >= WILD_SIGIL_THRESHOLD
    ? { triggered: true, description: generateWildSigilDescription(feralCount), feralCount }
    : null

  return { updatedStates: drifted, statesChanged, wildEvent }
}

/**
 * Generate a feral whisper — contradictory and unsettling.
 */
export function generateFeralWhisper(): string {
  return FERAL_WHISPERS[Math.floor(Math.random() * FERAL_WHISPERS.length)]
}

// ─── Internal helpers ─────────────────────────────────────────────────────

function generateWildSigilDescription(feralCount: number): string {
  if (feralCount >= 5) {
    return 'The grimoire convulses. Five feral sigils have merged into something that was never summoned. Purification is the only answer.'
  }
  if (feralCount >= 4) {
    return 'Four wild sigils circle each other like wolves. The grimoire\'s spine cracks with the strain.'
  }
  return 'Three feral sigils have found each other. Something stirs between the pages that should not exist.'
}
