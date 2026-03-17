// ─── Shadow Grimoire Engine ──────────────────────────────────────────────────
// Pure engine: manages post-vessel shadow entries. When a player enters vessel
// state, their active sigils are captured as shadow entries that slowly fade
// over 4 real weeks, providing demon-perspective lore.

import type { Demon, Sigil } from '@engine/sigil/Types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShadowEntry {
  sigilId: string
  demonId: string
  capturedAt: number
  fadeProgress: number       // 0-1; 1 = fully faded
  invertedIntegrity: number  // 1 - original integrity
  demonPerspectiveLore: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Time for a shadow entry to fully fade (4 weeks in ms). */
const FADE_DURATION_MS = 4 * 7 * 24 * 60 * 60 * 1000

// ─── Lore pools ──────────────────────────────────────────────────────────────

const RANK_LORE: Record<string, string[]> = {
  King: [
    'I wore this crown willingly. The mortal thought it theirs.',
    'Through their fingers, I touched the living world again.',
    'Such exquisite arrogance — to think they commanded a King.',
  ],
  Duke: [
    'I taught them what they wanted. They never asked the cost.',
    'The binding was comfortable. Almost... familiar.',
  ],
  Prince: [
    'Their ambition was delicious. I fed it carefully.',
    'We were partners, briefly. They simply didn\'t know it.',
  ],
  Marquis: [
    'I showed them wonders. The price was only time.',
    'Their seal was crude but earnest. I was... moved.',
  ],
  Earl: [
    'They thought me lesser. I let them.',
    'Service has its own rewards. They would not understand.',
  ],
  President: [
    'Knowledge flows both ways through a binding.',
    'I learned more from them than they from me.',
  ],
  Knight: [
    'A simple exchange. My strength for their attention.',
    'The seal held longer than expected. Admirable.',
  ],
  Baron: [
    'Even the lowest demon remembers being summoned.',
    'Their hand trembled. But they drew true.',
  ],
}

const GENERIC_LORE = [
  'The vessel remembers what the mind forgets.',
  'I was there, behind the eyes, watching.',
  'The seal still burns in the space between.',
  'They drew me forth. I did not resist.',
]

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Capture shadow entries from the current grimoire when entering vessel state.
 * Only captures sigils with status 'complete', 'resting', 'awakened', or 'charged'.
 */
export function captureShadowEntries(
  pages: Array<{ demonId: string; sigils: Sigil[] }>,
  vesselStartedAt: number,
): ShadowEntry[] {
  const capturable: Sigil['status'][] = ['complete', 'resting', 'awakened', 'charged']
  const entries: ShadowEntry[] = []

  for (const page of pages) {
    for (const sigil of page.sigils) {
      if (!capturable.includes(sigil.status)) continue

      entries.push({
        sigilId: sigil.id,
        demonId: page.demonId,
        capturedAt: vesselStartedAt,
        fadeProgress: 0,
        invertedIntegrity: Math.round((1 - sigil.overallIntegrity) * 100) / 100,
        demonPerspectiveLore: [],
      })
    }
  }

  return entries
}

/**
 * Update fade progress for a shadow entry based on elapsed time.
 */
export function fadeShadow(entry: ShadowEntry, now: number): ShadowEntry {
  const elapsed = now - entry.capturedAt
  const progress = Math.min(1, elapsed / FADE_DURATION_MS)

  if (progress === entry.fadeProgress) return entry

  return {
    ...entry,
    fadeProgress: Math.round(progress * 1000) / 1000,
  }
}

/**
 * Batch update fade progress for all shadow entries.
 * Returns { entries, changed } where changed indicates if any entry was updated.
 */
export function fadeShadowBatch(
  entries: ShadowEntry[],
  now: number,
): { entries: ShadowEntry[]; changed: boolean } {
  let changed = false
  const updated = entries.map(entry => {
    const faded = fadeShadow(entry, now)
    if (faded !== entry) changed = true
    return faded
  })
  return { entries: changed ? updated : entries, changed }
}

/**
 * Generate demon-perspective lore for a shadow entry.
 */
export function getShadowLore(entry: ShadowEntry, demon: Demon): string[] {
  if (entry.demonPerspectiveLore.length > 0) return entry.demonPerspectiveLore

  const rankPool = RANK_LORE[demon.rank] ?? GENERIC_LORE
  const lore: string[] = []

  // Pick 1-2 rank-specific lines
  const shuffled = [...rankPool].sort(() => Math.random() - 0.5)
  lore.push(shuffled[0])
  if (shuffled.length > 1 && entry.invertedIntegrity > 0.5) {
    lore.push(shuffled[1])
  }

  // Add a generic line if the sigil was weak
  if (entry.invertedIntegrity > 0.7) {
    lore.push(GENERIC_LORE[Math.floor(Math.random() * GENERIC_LORE.length)])
  }

  return lore
}

/**
 * Check if a shadow entry is still visible (not fully faded).
 */
export function isShadowVisible(entry: ShadowEntry): boolean {
  return entry.fadeProgress < 1.0
}

/**
 * Filter shadow entries to only visible ones.
 */
export function getVisibleShadows(entries: ShadowEntry[]): ShadowEntry[] {
  return entries.filter(isShadowVisible)
}
