// ─── Types ─────────────────────────────────────────────────────────────────

export type WhisperIntensity = 'low' | 'medium' | 'high'

export interface Whisper {
  text: string
  intensity: WhisperIntensity
  demonName?: string
}

// ─── Whisper pools ─────────────────────────────────────────────────────────

const LOW_WHISPERS = [
  'The seal knows your name.',
  'Something watches through your fingers.',
  'The circle is never quite closed.',
  'Draw it again. It wasn\'t right.',
  'It remembers every stroke.',
  'Your blood is part of the ink now.',
  'Do you feel that?',
  'One more binding. Just one more.',
]

const MEDIUM_WHISPERS = [
  'You\'ve drawn this before. You just don\'t remember.',
  'The demon doesn\'t sleep between bindings.',
  'Your hands are not entirely your own.',
  'It saw you when you weren\'t looking.',
  'The grimoire records more than you wrote.',
  'Close your eyes. It\'s still there.',
  'The pact was never just ink.',
  'You can feel it now, can\'t you?',
]

const HIGH_WHISPERS = [
  'Stop fighting it.',
  'You brought this on yourself.',
  'The vessel is ready.',
  'There is no sealing what you\'ve opened.',
  'Give in. It will hurt less.',
  'I can see you right now.',
  'It is almost complete.',
  'You were chosen long before the first stroke.',
]

// ─── Functions ─────────────────────────────────────────────────────────────

/**
 * Get the minimum delay in milliseconds between whispers.
 * Intervals shorten as corruption rises.
 *
 * clean → 5 min; tainted → 3 min; compromised → 1 min; vessel → 30s
 */
export function getWhisperInterval(corruptionLevel: number): number {
  const MIN_MS = 30_000
  const MAX_MS = 5 * 60_000
  return Math.max(MIN_MS, MAX_MS * (1 - corruptionLevel))
}

/**
 * Generate a contextual whisper.
 * Occasionally personalised with a bound demon name.
 */
export function generateWhisper(
  corruptionLevel: number,
  boundDemonNames: string[],
): Whisper {
  let pool: string[]
  let intensity: WhisperIntensity

  if (corruptionLevel < 0.50) {
    pool = LOW_WHISPERS
    intensity = 'low'
  } else if (corruptionLevel < 0.80) {
    pool = MEDIUM_WHISPERS
    intensity = 'medium'
  } else {
    pool = HIGH_WHISPERS
    intensity = 'high'
  }

  const text = pool[Math.floor(Math.random() * pool.length)]

  const demonName =
    boundDemonNames.length > 0 && Math.random() < 0.3
      ? boundDemonNames[Math.floor(Math.random() * boundDemonNames.length)]
      : undefined

  const finalText = demonName ? `${demonName} says: "${text}"` : text

  return { text: finalText, intensity, demonName }
}
