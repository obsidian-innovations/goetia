import type { Demon, DemonRank } from '@engine/sigil/Types'
import { getRankPower } from '@engine/pvp/ClashResolver'
import type { PermanentScar } from './PurificationEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface VesselPerspectiveState {
  isActive: boolean
  dominantDemonId: string | null
  labelReplacements: Record<string, string>
  postPurificationFlickers: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Corruption threshold for vessel perspective activation. */
const VESSEL_PERSPECTIVE_THRESHOLD = 0.80

/** Label replacements when vessel perspective is active. */
const VESSEL_LABELS: Record<string, string> = {
  SEAL: 'CLAIM',
  GLYPH: 'MARK',
  RING: 'CHAIN',
  Bind: 'Submit',
}

// ─── Vessel perspective whisper pools ─────────────────────────────────────

const VESSEL_WHISPERS_GENERIC = [
  'You draw at our pleasure now.',
  'The sigils obey a deeper hand.',
  'Your fingers move, but not by your will.',
  'We see through your eyes. They are ours.',
  'The binding was always in the other direction.',
  'Submit your next offering.',
]

const VESSEL_WHISPERS_NAMED = [
  '{name} guides your hand across the seal.',
  '{name} approves of this glyph.',
  '{name} watches through the circle you draw.',
  'You belong to {name} now. Draw.',
  '{name} demands a more perfect seal.',
  'Good. {name} is pleased.',
]

// ─── First-person descriptions ────────────────────────────────────────────

const VESSEL_DESCRIPTIONS: Record<DemonRank, string> = {
  King: 'A crown presses against the inside of your skull. You are throne and subject both.',
  Prince: 'Noble authority flows through your veins. Your hands move with terrible grace.',
  Duke: 'Military precision guides every stroke. The seal draws itself.',
  Marquis: 'The boundary between you and the sigil has dissolved. You are the border now.',
  Earl: 'Ancient knowledge floods your mind. You understand things you should not.',
  Knight: 'Martial discipline stiffens your spine. Each line is a blade stroke.',
  President: 'Something whispers formulae in a language older than speech.',
  Baron: 'A weight settles in your chest. Something has made itself at home.',
}

// ─── Core functions ───────────────────────────────────────────────────────

/**
 * Compute vessel perspective state based on corruption level.
 * Active when corruption >= 0.80. Picks dominant demon by highest rank.
 */
export function getVesselPerspective(
  corruptionLevel: number,
  boundDemonIds: string[],
  demons: Demon[],
  scars: PermanentScar[],
): VesselPerspectiveState {
  const isActive = corruptionLevel >= VESSEL_PERSPECTIVE_THRESHOLD

  if (!isActive) {
    return {
      isActive: false,
      dominantDemonId: null,
      labelReplacements: {},
      postPurificationFlickers: hasPostPurificationFlicker(scars),
    }
  }

  // Find dominant demon (highest rank priority)
  let dominantDemonId: string | null = null
  let highestPriority = -1

  for (const demon of demons) {
    if (!boundDemonIds.includes(demon.id)) continue
    const priority = getRankPower(demon.rank)
    if (priority > highestPriority) {
      highestPriority = priority
      dominantDemonId = demon.id
    }
  }

  return {
    isActive: true,
    dominantDemonId,
    labelReplacements: VESSEL_LABELS,
    postPurificationFlickers: hasPostPurificationFlicker(scars),
  }
}

/**
 * Get a first-person description for the vessel perspective.
 */
export function getVesselDescription(demon: Demon): string {
  return VESSEL_DESCRIPTIONS[demon.rank]
}

/**
 * Generate a demon-voice whisper for vessel perspective.
 * If a dominant demon name is provided, uses personalized whispers.
 */
export function generateVesselWhisper(dominantDemonName?: string): string {
  if (dominantDemonName && Math.random() < 0.6) {
    const template = VESSEL_WHISPERS_NAMED[Math.floor(Math.random() * VESSEL_WHISPERS_NAMED.length)]
    return template.replace('{name}', dominantDemonName)
  }
  return VESSEL_WHISPERS_GENERIC[Math.floor(Math.random() * VESSEL_WHISPERS_GENERIC.length)]
}

/**
 * Check if post-purification visual flicker should persist.
 * True if the player has a 'persistent_distortion' permanent scar.
 */
export function hasPostPurificationFlicker(scars: PermanentScar[]): boolean {
  return scars.some(s => s.type === 'persistent_distortion')
}
