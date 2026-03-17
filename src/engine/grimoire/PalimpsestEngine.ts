import type { DemonDomain, Sigil } from '@engine/sigil/Types'
import type { FamiliarityState } from '@engine/familiarity/FamiliarityEngine'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GrimoireMemory {
  totalRituals: number
  totalCorruptionAbsorbed: number
  dominantDomain: DemonDomain | null
  memoryScore: number          // hidden, 0–1
  lastBehaviorAt: number
  behaviors: GrimoireBehavior[]
  domainCounts: Record<string, number>
}

export type GrimoireBehaviorType =
  | 'page_reorder'
  | 'bleedthrough'
  | 'demon_suggestion'
  | 'whisper'

export interface GrimoireBehavior {
  type: GrimoireBehaviorType
  timestamp: number
  data: Record<string, unknown>
}

export interface GrimoireTickResult {
  memory: GrimoireMemory
  behavior: GrimoireBehavior | null
}

interface PageLike {
  demonId: string
  sigils: Sigil[]
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Memory score gained per ritual. */
const MEMORY_PER_RITUAL = 0.05

/** Memory score gained per unit of corruption absorbed. */
const MEMORY_PER_CORRUPTION = 0.02

/** Minimum interval between behaviors (5 minutes). */
const BEHAVIOR_INTERVAL_MS = 5 * 60_000

/** Maximum behaviors retained in history. */
const MAX_BEHAVIOR_HISTORY = 50

/** Behavior threshold: page reorder. */
const THRESHOLD_REORDER = 0.3

/** Behavior threshold: bleedthrough. */
const THRESHOLD_BLEEDTHROUGH = 0.5

/** Behavior threshold: demon suggestion / whisper. */
const THRESHOLD_SUGGESTION = 0.7

// ─── Grimoire whisper pool ────────────────────────────────────────────────

const GRIMOIRE_WHISPERS = [
  'The pages remember more than you wrote.',
  'Something turned a page while you were away.',
  'The grimoire is heavier than it was.',
  'Ink has bled between the bindings.',
  'A name appeared in the margin — yours.',
  'The grimoire hums when you are not looking.',
  'Pages you never drew have filled themselves.',
  'The binding creaks with something like contentment.',
  'Your grimoire has opinions now.',
  'It opened to a page you have not written yet.',
  'The ink smells different today. Older.',
  'Somewhere between the pages, something breathes.',
]

// ─── Factory ──────────────────────────────────────────────────────────────

export function createGrimoireMemory(now: number): GrimoireMemory {
  return {
    totalRituals: 0,
    totalCorruptionAbsorbed: 0,
    dominantDomain: null,
    memoryScore: 0,
    lastBehaviorAt: now,
    behaviors: [],
    domainCounts: {},
  }
}

// ─── Record a ritual ──────────────────────────────────────────────────────

/**
 * Record a completed ritual. Increments ritual count, updates domain tracking,
 * and grows the memory score.
 */
export function recordRitual(
  memory: GrimoireMemory,
  domains: DemonDomain[],
  corruptionAmount: number,
): GrimoireMemory {
  const totalRituals = memory.totalRituals + 1
  const totalCorruptionAbsorbed = memory.totalCorruptionAbsorbed + corruptionAmount

  // Update domain counts
  const domainCounts = { ...memory.domainCounts }
  for (const domain of domains) {
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
  }

  // Find dominant domain
  let dominantDomain: DemonDomain | null = null
  let maxCount = 0
  for (const [domain, count] of Object.entries(domainCounts)) {
    if (count > maxCount) {
      maxCount = count
      dominantDomain = domain as DemonDomain
    }
  }

  // Grow memory score
  const memoryGain = MEMORY_PER_RITUAL + corruptionAmount * MEMORY_PER_CORRUPTION
  const memoryScore = Math.min(1, memory.memoryScore + memoryGain)

  return {
    ...memory,
    totalRituals,
    totalCorruptionAbsorbed,
    dominantDomain,
    memoryScore,
    domainCounts,
  }
}

// ─── Tick (periodic behavior check) ──────────────────────────────────────

/**
 * Check for grimoire behaviors. Called periodically (every 300 seconds).
 * Returns the updated memory and an optional behavior.
 */
export function tickGrimoire(
  memory: GrimoireMemory,
  pages: PageLike[],
  familiarityStates: Record<string, FamiliarityState>,
  now: number,
): GrimoireTickResult {
  // Check interval
  if (now - memory.lastBehaviorAt < BEHAVIOR_INTERVAL_MS) {
    return { memory, behavior: null }
  }

  const behavior = pickBehavior(memory, pages, familiarityStates, now)
  if (!behavior) {
    return { memory, behavior: null }
  }

  const behaviors = [...memory.behaviors, behavior].slice(-MAX_BEHAVIOR_HISTORY)

  return {
    memory: { ...memory, lastBehaviorAt: now, behaviors },
    behavior,
  }
}

// ─── Behavior selection ──────────────────────────────────────────────────

function pickBehavior(
  memory: GrimoireMemory,
  pages: PageLike[],
  familiarityStates: Record<string, FamiliarityState>,
  now: number,
): GrimoireBehavior | null {
  const { memoryScore } = memory

  // Higher-threshold behaviors checked first (rarer, more interesting)
  if (memoryScore >= THRESHOLD_SUGGESTION) {
    // 50% chance of whisper vs suggestion at this tier
    if (Math.random() < 0.5) {
      return generateGrimoireWhisperBehavior(now)
    }
    const suggestion = generateDemonSuggestion(pages, familiarityStates, memory.dominantDomain, now)
    if (suggestion) return suggestion
  }

  if (memoryScore >= THRESHOLD_BLEEDTHROUGH) {
    const bleedthrough = generateBleedthrough(pages, now)
    if (bleedthrough) return bleedthrough
  }

  if (memoryScore >= THRESHOLD_REORDER) {
    const reorder = generatePageReorder(pages, familiarityStates, now)
    if (reorder) return reorder
  }

  return null
}

// ─── Individual behavior generators ──────────────────────────────────────

function generateGrimoireWhisperBehavior(now: number): GrimoireBehavior {
  return { type: 'whisper', timestamp: now, data: { text: generateGrimoireWhisper() } }
}

/**
 * Generate a grimoire whisper text. Distinct from corruption whispers —
 * these are about the grimoire itself, not the demons.
 */
export function generateGrimoireWhisper(): string {
  return GRIMOIRE_WHISPERS[Math.floor(Math.random() * GRIMOIRE_WHISPERS.length)]
}

function generateDemonSuggestion(
  pages: PageLike[],
  familiarityStates: Record<string, FamiliarityState>,
  dominantDomain: DemonDomain | null,
  now: number,
): GrimoireBehavior | null {
  if (pages.length === 0) return null

  // Prefer demons with high familiarity in the dominant domain
  let bestDemonId: string | null = null
  let bestScore = -1

  for (const page of pages) {
    const fam = familiarityStates[page.demonId]
    const score = fam?.score ?? 0
    // Bonus for matching dominant domain — demon's domain is not
    // directly available here, so we use familiarity score as proxy
    if (score > bestScore) {
      bestScore = score
      bestDemonId = page.demonId
    }
  }

  if (!bestDemonId || bestScore < 0.25) return null

  return {
    type: 'demon_suggestion',
    timestamp: now,
    data: { demonId: bestDemonId, reason: dominantDomain ? `domain_affinity` : 'familiarity' },
  }
}

function generateBleedthrough(
  pages: PageLike[],
  now: number,
): GrimoireBehavior | null {
  // Need at least 2 pages with sigils for bleedthrough
  const pagesWithSigils = pages.filter(p => p.sigils.length > 0)
  if (pagesWithSigils.length < 2) return null

  // Pick two random different pages
  const sourceIdx = Math.floor(Math.random() * pagesWithSigils.length)
  let targetIdx = Math.floor(Math.random() * (pagesWithSigils.length - 1))
  if (targetIdx >= sourceIdx) targetIdx++

  const sourcePage = pagesWithSigils[sourceIdx]
  const targetPage = pagesWithSigils[targetIdx]
  const sourceSigil = sourcePage.sigils[Math.floor(Math.random() * sourcePage.sigils.length)]

  return {
    type: 'bleedthrough',
    timestamp: now,
    data: {
      sourceDemonId: sourcePage.demonId,
      targetDemonId: targetPage.demonId,
      sigilId: sourceSigil.id,
      sigilIntegrity: sourceSigil.overallIntegrity,
    },
  }
}

function generatePageReorder(
  pages: PageLike[],
  familiarityStates: Record<string, FamiliarityState>,
  now: number,
): GrimoireBehavior | null {
  if (pages.length < 2) return null

  // Find the most-used demon (highest interaction count)
  let bestDemonId: string | null = null
  let bestCount = 0

  for (const page of pages) {
    const fam = familiarityStates[page.demonId]
    const count = fam?.interactionCount ?? 0
    if (count > bestCount) {
      bestCount = count
      bestDemonId = page.demonId
    }
  }

  // Only reorder if the best demon isn't already first
  if (!bestDemonId || pages[0].demonId === bestDemonId) return null

  return {
    type: 'page_reorder',
    timestamp: now,
    data: { demonId: bestDemonId, interactionCount: bestCount },
  }
}

// ─── Query helpers ───────────────────────────────────────────────────────

/** Get the most recent behavior of a given type. */
export function getLatestBehavior(
  memory: GrimoireMemory,
  type: GrimoireBehaviorType,
): GrimoireBehavior | null {
  for (let i = memory.behaviors.length - 1; i >= 0; i--) {
    if (memory.behaviors[i].type === type) return memory.behaviors[i]
  }
  return null
}

/** Get the suggested demon ID, if any recent suggestion exists. */
export function getSuggestedDemonId(memory: GrimoireMemory): string | null {
  const suggestion = getLatestBehavior(memory, 'demon_suggestion')
  return (suggestion?.data?.demonId as string) ?? null
}

/** Get the active bleedthrough, if any. */
export function getActiveBleedthrough(
  memory: GrimoireMemory,
): { sourceDemonId: string; targetDemonId: string; sigilIntegrity: number } | null {
  const bt = getLatestBehavior(memory, 'bleedthrough')
  if (!bt) return null
  return {
    sourceDemonId: bt.data.sourceDemonId as string,
    targetDemonId: bt.data.targetDemonId as string,
    sigilIntegrity: bt.data.sigilIntegrity as number,
  }
}

/** Get the preferred page order (front demon ID), if reorder occurred. */
export function getPageReorderTarget(memory: GrimoireMemory): string | null {
  const reorder = getLatestBehavior(memory, 'page_reorder')
  return (reorder?.data?.demonId as string) ?? null
}

/** Get the memory tier for display purposes. */
export function getMemoryTier(score: number): 'dormant' | 'stirring' | 'aware' | 'sentient' {
  if (score >= 0.7) return 'sentient'
  if (score >= 0.5) return 'aware'
  if (score >= 0.3) return 'stirring'
  return 'dormant'
}
