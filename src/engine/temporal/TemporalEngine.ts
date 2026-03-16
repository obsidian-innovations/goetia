// ─── Types ─────────────────────────────────────────────────────────────────

export interface MoonPhase {
  phase: MoonPhaseName
  illumination: number  // 0-1
  daysSinceNew: number
}

export type MoonPhaseName =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent'

export interface TemporalModifiers {
  chargeMultiplier: number       // 1.0 base; 2.0 during witching hour
  corruptionMultiplier: number   // 1.0 base; 2.0 during witching hour
  purificationMultiplier: number // 1.0 base; 1.5 during full moon
  veilReduction: number          // 0.0 base; 0.15 during new moon
  isWitchingHour: boolean
  isSolstice: boolean
  isEquinox: boolean
  moonPhase: MoonPhase
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Average length of a synodic month in days. */
const SYNODIC_MONTH = 29.53058868

/** Known new moon epoch: January 6, 2000 18:14 UTC (Julian lunation 0 reference). */
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14, 0)

const MS_PER_DAY = 86_400_000

// ─── Moon Phase ────────────────────────────────────────────────────────────

/**
 * Calculate the moon phase for a given timestamp using the synodic month cycle.
 * Uses a known new moon epoch and the average synodic period to approximate
 * the lunar phase. Accuracy is ±1 day, sufficient for gameplay purposes.
 */
export function getMoonPhase(timestamp: number): MoonPhase {
  const daysSinceEpoch = (timestamp - NEW_MOON_EPOCH_MS) / MS_PER_DAY
  const daysSinceNew = ((daysSinceEpoch % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH

  // Phase fraction: 0 = new, 0.5 = full, 1 = next new
  const fraction = daysSinceNew / SYNODIC_MONTH

  // Approximate illumination using cosine (0 at new, 1 at full)
  const illumination = (1 - Math.cos(fraction * 2 * Math.PI)) / 2

  const phase = getPhaseNameFromFraction(fraction)

  return { phase, illumination, daysSinceNew }
}

function getPhaseNameFromFraction(fraction: number): MoonPhaseName {
  // 8 phases, each spanning ~3.69 days (1/8 of cycle)
  if (fraction < 0.0625) return 'new'
  if (fraction < 0.1875) return 'waxing_crescent'
  if (fraction < 0.3125) return 'first_quarter'
  if (fraction < 0.4375) return 'waxing_gibbous'
  if (fraction < 0.5625) return 'full'
  if (fraction < 0.6875) return 'waning_gibbous'
  if (fraction < 0.8125) return 'last_quarter'
  if (fraction < 0.9375) return 'waning_crescent'
  return 'new'
}

// ─── Witching Hour ─────────────────────────────────────────────────────────

/** Returns true if the local time is between midnight and 3am. */
export function isWitchingHour(timestamp: number): boolean {
  const date = new Date(timestamp)
  const hour = date.getHours()
  return hour >= 0 && hour < 3
}

// ─── Solstice / Equinox ────────────────────────────────────────────────────

/** Returns true if the date falls on a solstice (Jun 20-22 or Dec 20-22). */
export function isSolstice(timestamp: number): boolean {
  const date = new Date(timestamp)
  const month = date.getMonth() // 0-indexed
  const day = date.getDate()

  // June solstice: Jun 20-22 (month 5)
  if (month === 5 && day >= 20 && day <= 22) return true
  // December solstice: Dec 20-22 (month 11)
  if (month === 11 && day >= 20 && day <= 22) return true

  return false
}

/** Returns true if the date falls on an equinox (Mar 19-21 or Sep 22-24). */
export function isEquinox(timestamp: number): boolean {
  const date = new Date(timestamp)
  const month = date.getMonth()
  const day = date.getDate()

  // March equinox: Mar 19-21 (month 2)
  if (month === 2 && day >= 19 && day <= 21) return true
  // September equinox: Sep 22-24 (month 8)
  if (month === 8 && day >= 22 && day <= 24) return true

  return false
}

// ─── Composite Modifiers ───────────────────────────────────────────────────

/** Compute all temporal modifiers for a given timestamp. Pure function. */
export function getTemporalModifiers(timestamp: number): TemporalModifiers {
  const moonPhase = getMoonPhase(timestamp)
  const witching = isWitchingHour(timestamp)
  const solstice = isSolstice(timestamp)
  const equinox = isEquinox(timestamp)

  let chargeMultiplier = 1.0
  let corruptionMultiplier = 1.0
  let purificationMultiplier = 1.0
  let veilReduction = 0.0

  // Witching hour: double charge speed and corruption
  if (witching) {
    chargeMultiplier = 2.0
    corruptionMultiplier = 2.0
  }

  // New moon: thin the veil
  if (moonPhase.phase === 'new') {
    veilReduction = 0.15
  }

  // Full moon: aid purification
  if (moonPhase.phase === 'full') {
    purificationMultiplier = 1.5
  }

  // Solstice/equinox: minor charge boost (stacks with witching hour)
  if (solstice || equinox) {
    chargeMultiplier *= 1.25
  }

  return {
    chargeMultiplier,
    corruptionMultiplier,
    purificationMultiplier,
    veilReduction,
    isWitchingHour: witching,
    isSolstice: solstice,
    isEquinox: equinox,
    moonPhase,
  }
}

// ─── Moon Phase Display ────────────────────────────────────────────────────

const MOON_SYMBOLS: Record<MoonPhaseName, string> = {
  new: '\u{1F311}',             // 🌑
  waxing_crescent: '\u{1F312}', // 🌒
  first_quarter: '\u{1F313}',   // 🌓
  waxing_gibbous: '\u{1F314}',  // 🌔
  full: '\u{1F315}',            // 🌕
  waning_gibbous: '\u{1F316}',  // 🌖
  last_quarter: '\u{1F317}',    // 🌗
  waning_crescent: '\u{1F318}', // 🌘
}

/** Returns a moon phase emoji for atmospheric display. */
export function getMoonSymbol(phase: MoonPhaseName): string {
  return MOON_SYMBOLS[phase]
}
