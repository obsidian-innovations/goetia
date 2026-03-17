import type { Sigil, SigilStatus, GlyphId, Point, DemonDomain, RingWeakPoint } from './Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DreamState {
  sigilId: string
  lastDreamCheck: number
  driftHistory: DriftEvent[]
  loreFragmentsRevealed: string[]
}

export interface DriftEvent {
  timestamp: number
  glyphShifts: Array<{ glyphId: GlyphId; dx: number; dy: number }>
  ringWeakPointShifts: Array<{ index: number; startAngle: number; endAngle: number }>
  loreFragment: string | null
}

export interface DreamResult {
  drifted: boolean
  driftEvent: DriftEvent | null
  updatedSigil: Sigil
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MS_PER_HOUR = 3_600_000

/** Minimum hours between dream checks. */
const DREAM_INTERVAL_HOURS = 4

/** Base glyph drift magnitude in normalised space. */
const BASE_GLYPH_DRIFT = 0.03

/** Maximum ring weak-point angular shift in radians (~15 degrees). */
const MAX_RING_SHIFT_RAD = (15 * Math.PI) / 180

/** Probability of a lore fragment per dream event. */
const LORE_FRAGMENT_CHANCE = 0.20

/** Maximum number of drift events to retain in history. */
const MAX_DRIFT_HISTORY = 20

/** Statuses eligible for dreaming. */
export const DREAMABLE_STATUSES = new Set<SigilStatus>(['resting'])

// ─── Lore fragment pools by domain ────────────────────────────────────────

const DOMAIN_LORE: Record<DemonDomain, string[]> = {
  knowledge: [
    'The seal unfolded in your sleep — a page you never wrote.',
    'It whispered a name you cannot pronounce, but recognize.',
    'Letters drift in the dark, arranging into truths you never asked for.',
    'The demon showed you a library that burned before it was built.',
    'A formula appeared behind your eyelids — correct, but forbidden.',
    'You dreamed of knowing everything. It was unbearable.',
  ],
  destruction: [
    'Something cracked in the dream. The sound lingered after waking.',
    'The sigil burned through its page and into the one below.',
    'You watched the seal devour itself, edge by edge.',
    'The demon crushed a star between two fingers. It smiled.',
    'Ash fell in the dream like snow. It was warm.',
    'Everything you touched in the dream broke open.',
  ],
  illusion: [
    'The seal looked different each time you glanced at it.',
    'A face appeared in the ring — yours, but reversed.',
    'You drew the same glyph three times; each was a different shape.',
    'The demon wore your shadow like a cloak.',
    'Nothing in the dream was solid. Especially the truth.',
    'You woke uncertain which side of sleep you are on.',
  ],
  binding: [
    'Chains appeared where the edges met. They were warm to the touch.',
    'The demon offered its wrist. The seal tightened.',
    'You felt the binding from both sides — captor and captive.',
    'The ring contracted in the dream. It did not let go.',
    'Thread wove through every glyph, connecting them to your pulse.',
    'The seal knows your heartbeat. It adjusts to match.',
  ],
  transformation: [
    'The glyphs shifted into shapes you had not drawn.',
    'Your hand changed in the dream. The seal fit better.',
    'The sigil molted — beneath it, something newer gleamed.',
    'The demon showed you what the seal will become.',
    'Each edge dissolved and reformed. The pattern was the same, but different.',
    'You woke with the sense that something has been rearranged.',
  ],
  discord: [
    'The glyphs argued in the dream. You could almost hear them.',
    'Two edges crossed where they should not. The intersection burned.',
    'The seal split itself in two, each half accusing the other.',
    'The demon laughed at a contradiction you cannot find.',
    'Harmony broke in the dream. The silence after was worse.',
    'You dreamed of a version of this seal that contradicts itself — and works.',
  ],
  protection: [
    'The ring thickened in the dream. It held something back.',
    'The seal built walls you did not ask for.',
    'A shield appeared inside the ring. It bore your scars.',
    'The demon guarded the edges while you slept.',
    'You felt safe in the dream. That frightened you more.',
    'The seal closed ranks around something precious. You could not see what.',
  ],
  revelation: [
    'The seal opened like an eye. It saw further than you.',
    'A hidden edge appeared — one you never drew.',
    'The demon pointed at something beyond the ring. You could not look away.',
    'Light poured from the nodes in the dream. It was not pleasant.',
    'You saw the seal from above. It was part of a larger pattern.',
    'Truth leaked from the glyphs. It stained everything it touched.',
  ],
  liberation: [
    'The ring opened in the dream. Nothing escaped.',
    'The demon slipped one edge and returned it, laughing.',
    'Constraints loosened in the seal. The glyphs spread wider.',
    'You dreamed of drawing without a circle. The power scattered.',
    'The seal rattled like something trying to get out.',
    'Bonds dissolved and reformed. Freedom was temporary.',
  ],
}

/** Fallback pool when no domain matches. */
const GENERIC_LORE = [
  'The sigil shifted in the dark.',
  'Something stirred beneath the ink.',
  'The seal remembers what you drew — and what you meant.',
  'In the dream, the binding was alive.',
]

// ─── Factory ──────────────────────────────────────────────────────────────

export function createDreamState(sigilId: string, now: number): DreamState {
  return {
    sigilId,
    lastDreamCheck: now,
    driftHistory: [],
    loreFragmentsRevealed: [],
  }
}

// ─── Core dream logic ─────────────────────────────────────────────────────

/**
 * Check whether a sigil dreams. Only resting sigils dream, and only after
 * 4+ hours since last check. Corruption amplifies drift magnitude.
 *
 * Returns null if the sigil is not eligible or not enough time has passed.
 */
export function checkDream(
  sigil: Sigil,
  dreamState: DreamState,
  now: number,
  corruptionLevel: number,
  domains: DemonDomain[],
): DreamResult | null {
  if (!DREAMABLE_STATUSES.has(sigil.status)) return null

  const elapsed = now - dreamState.lastDreamCheck
  if (elapsed < DREAM_INTERVAL_HOURS * MS_PER_HOUR) return null

  // Build drift event
  const driftMagnitude = BASE_GLYPH_DRIFT * (1 + corruptionLevel)

  // Glyph shifts
  const glyphShifts = sigil.glyphs.map(g => ({
    glyphId: g.glyphId,
    dx: randomInRange(-driftMagnitude, driftMagnitude),
    dy: randomInRange(-driftMagnitude, driftMagnitude),
  }))

  // Ring weak-point shifts
  const ringShift = MAX_RING_SHIFT_RAD * (1 + corruptionLevel)
  const ringWeakPointShifts = (sigil.bindingRing?.weakPoints ?? []).map(
    (wp: RingWeakPoint, index: number) => ({
      index,
      startAngle: wp.startAngle + randomInRange(-ringShift, ringShift),
      endAngle: wp.endAngle + randomInRange(-ringShift, ringShift),
    }),
  )

  // Lore fragment (20% chance, pick from domain-appropriate pool)
  let loreFragment: string | null = null
  if (Math.random() < LORE_FRAGMENT_CHANCE) {
    loreFragment = pickLoreFragment(domains, dreamState.loreFragmentsRevealed)
  }

  const driftEvent: DriftEvent = {
    timestamp: now,
    glyphShifts,
    ringWeakPointShifts,
    loreFragment,
  }

  const updatedSigil = applyDrift(sigil, driftEvent)

  return { drifted: true, driftEvent, updatedSigil }
}

// ─── Apply drift ──────────────────────────────────────────────────────────

/** Returns a new Sigil with shifted glyph positions and ring weak points. */
export function applyDrift(sigil: Sigil, drift: DriftEvent): Sigil {
  const shiftMap = new Map(drift.glyphShifts.map(s => [s.glyphId, s]))

  const glyphs = sigil.glyphs.map(g => {
    const shift = shiftMap.get(g.glyphId)
    if (!shift) return g
    return {
      ...g,
      position: clampPoint({
        x: g.position.x + shift.dx,
        y: g.position.y + shift.dy,
      }),
    }
  })

  let bindingRing = sigil.bindingRing
  if (bindingRing && drift.ringWeakPointShifts.length > 0) {
    const weakPoints = bindingRing.weakPoints.map((wp, i) => {
      const shift = drift.ringWeakPointShifts.find(s => s.index === i)
      if (!shift) return wp
      return { ...wp, startAngle: shift.startAngle, endAngle: shift.endAngle }
    })
    bindingRing = { ...bindingRing, weakPoints }
  }

  return { ...sigil, glyphs, bindingRing }
}

// ─── Batch processing ─────────────────────────────────────────────────────

/**
 * Process dreams for all eligible sigils. Returns updated sigils and dream states.
 * Designed to be called at app init and periodically.
 */
export function processDreamBatch(
  sigils: Sigil[],
  dreamStates: Record<string, DreamState>,
  now: number,
  corruptionLevel: number,
  demonDomains: Record<string, DemonDomain[]>,
): { updatedSigils: Sigil[]; updatedDreamStates: Record<string, DreamState> } {
  const updatedSigils: Sigil[] = []
  const updatedDreamStates = { ...dreamStates }

  for (const sigil of sigils) {
    if (!DREAMABLE_STATUSES.has(sigil.status)) continue

    // Ensure dream state exists
    if (!updatedDreamStates[sigil.id]) {
      updatedDreamStates[sigil.id] = createDreamState(sigil.id, now)
      continue // Start tracking from now
    }

    const state = updatedDreamStates[sigil.id]
    const domains = demonDomains[sigil.demonId] ?? []
    const result = checkDream(sigil, state, now, corruptionLevel, domains)

    if (result && result.drifted && result.driftEvent) {
      updatedSigils.push(result.updatedSigil)

      const newHistory = [...state.driftHistory, result.driftEvent]
        .slice(-MAX_DRIFT_HISTORY)

      const newLore = result.driftEvent.loreFragment
        ? [...state.loreFragmentsRevealed, result.driftEvent.loreFragment]
        : state.loreFragmentsRevealed

      updatedDreamStates[sigil.id] = {
        ...state,
        lastDreamCheck: now,
        driftHistory: newHistory,
        loreFragmentsRevealed: newLore,
      }
    } else {
      updatedDreamStates[sigil.id] = { ...state, lastDreamCheck: now }
    }
  }

  return { updatedSigils, updatedDreamStates }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clampPoint(p: Point): Point {
  return {
    x: Math.max(0, Math.min(1, p.x)),
    y: Math.max(0, Math.min(1, p.y)),
  }
}

function pickLoreFragment(
  domains: DemonDomain[],
  alreadyRevealed: string[],
): string | null {
  // Build candidate pool from all relevant domains
  const pool: string[] = []
  for (const domain of domains) {
    pool.push(...(DOMAIN_LORE[domain] ?? []))
  }
  if (pool.length === 0) pool.push(...GENERIC_LORE)

  // Filter out already-revealed fragments
  const revealedSet = new Set(alreadyRevealed)
  const candidates = pool.filter(f => !revealedSet.has(f))

  // If all exhausted, allow repeats
  const source = candidates.length > 0 ? candidates : pool
  return source[Math.floor(Math.random() * source.length)]
}
