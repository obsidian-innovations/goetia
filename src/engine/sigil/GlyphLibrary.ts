import type { Point, GlyphId, GlyphInvariant } from './Types'

// ─── Local types ────────────────────────────────────────────────────────────

interface GlyphTemplate {
  id: GlyphId
  name: string
  intent: string
  strokeCount: number
  invariants: GlyphInvariant[]
  canonicalPath: Point[]  // normalized 0-1, 10-16 points
}

// ─── GlyphId constants ──────────────────────────────────────────────────────

export const GLYPHS = {
  VECTOR_OUT:        'VECTOR_OUT'        as GlyphId & string,
  VECTOR_IN:         'VECTOR_IN'         as GlyphId & string,
  VECTOR_DIFFUSE:    'VECTOR_DIFFUSE'    as GlyphId & string,
  QUALITY_SHARP:     'QUALITY_SHARP'     as GlyphId & string,
  QUALITY_SUSTAIN:   'QUALITY_SUSTAIN'   as GlyphId & string,
  QUALITY_DELAY:     'QUALITY_DELAY'     as GlyphId & string,
  TARGET_PERSON:     'TARGET_PERSON'     as GlyphId & string,
  TARGET_PLACE:      'TARGET_PLACE'      as GlyphId & string,
  TARGET_OBJECT:     'TARGET_OBJECT'     as GlyphId & string,
  DURATION_INSTANT:  'DURATION_INSTANT'  as GlyphId & string,
  DURATION_SUSTAINED:'DURATION_SUSTAINED' as GlyphId & string,
  DURATION_TRIGGERED:'DURATION_TRIGGERED' as GlyphId & string,
} as const

// ─── Path helpers (module-private) ──────────────────────────────────────────

function pt(x: number, y: number): Point {
  return { x, y }
}

/** Evenly-spaced points from p0 to p1 inclusive, count total. */
function linspace(p0: Point, p1: Point, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1)
    return pt(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t)
  })
}

// ─── Glyph templates ────────────────────────────────────────────────────────

const GLYPH_TEMPLATES: GlyphTemplate[] = [
  // ── VECTOR_OUT ────────────────────────────────────────────────────────────
  // Horizontal stroke left-to-right; arrow-like outward push
  {
    id: GLYPHS.VECTOR_OUT,
    name: 'Vector Out',
    intent: 'Direct power outward toward target',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 8 points evenly spaced from (0.1, 0.5) to (0.9, 0.5)
    canonicalPath: linspace(pt(0.1, 0.5), pt(0.9, 0.5), 8),
  },

  // ── VECTOR_IN ─────────────────────────────────────────────────────────────
  // Horizontal stroke right-to-left; pulling power inward
  {
    id: GLYPHS.VECTOR_IN,
    name: 'Vector In',
    intent: 'Draw power inward from target',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 8 points evenly spaced from (0.9, 0.5) to (0.1, 0.5)
    canonicalPath: linspace(pt(0.9, 0.5), pt(0.1, 0.5), 8),
  },

  // ── VECTOR_DIFFUSE ────────────────────────────────────────────────────────
  // Y-shape: stem up from bottom, fork left then backtrack and fork right
  {
    id: GLYPHS.VECTOR_DIFFUSE,
    name: 'Vector Diffuse',
    intent: 'Spread power in all directions',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 12 points: stem (0.5,0.9)→(0.5,0.5), left arm →(0.1,0.2),
    // backtrack to (0.5,0.5), right arm →(0.9,0.2)
    canonicalPath: [
      // Stem: 4 pts (0.5,0.9) → (0.5,0.5)
      pt(0.5, 0.9),
      pt(0.5, 0.767),
      pt(0.5, 0.633),
      pt(0.5, 0.5),
      // Left arm: 3 more pts → (0.1,0.2)
      pt(0.367, 0.4),
      pt(0.233, 0.3),
      pt(0.1,   0.2),
      // Backtrack through midpoint to (0.5,0.5): 2 pts
      pt(0.3,   0.35),
      pt(0.5,   0.5),
      // Right arm: 3 more pts → (0.9,0.2)
      pt(0.633, 0.4),
      pt(0.767, 0.3),
      pt(0.9,   0.2),
    ],
  },

  // ── QUALITY_SHARP ─────────────────────────────────────────────────────────
  // Lightning-bolt zigzag: down-right, back-left, down-right
  {
    id: GLYPHS.QUALITY_SHARP,
    name: 'Quality Sharp',
    intent: 'Make effect precise and cutting',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 12 points along (0.3,0.1)→(0.6,0.4)→(0.4,0.4)→(0.7,0.9)
    canonicalPath: [
      // Seg 1: (0.3,0.1)→(0.6,0.4), 4 pts
      pt(0.3,  0.1),
      pt(0.4,  0.2),
      pt(0.5,  0.3),
      pt(0.6,  0.4),
      // Seg 2: (0.6,0.4)→(0.4,0.4), 2 more pts
      pt(0.5,  0.4),
      pt(0.4,  0.4),
      // Seg 3: (0.4,0.4)→(0.7,0.9), 6 more pts
      pt(0.45, 0.483),
      pt(0.5,  0.567),
      pt(0.55, 0.65),
      pt(0.6,  0.733),
      pt(0.65, 0.817),
      pt(0.7,  0.9),
    ],
  },

  // ── QUALITY_SUSTAIN ───────────────────────────────────────────────────────
  // Full circle, counterclockwise; closed loop that lingers
  {
    id: GLYPHS.QUALITY_SUSTAIN,
    name: 'Quality Sustain',
    intent: 'Make effect linger over time',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_close', 'counterclockwise'],
    // 17 pts (i=0..16): angle = i/16 * 2π
    // x = 0.5 + 0.35*cos(angle), y = 0.5 + 0.35*sin(angle)
    // Start and end at (0.85, 0.5)
    canonicalPath: Array.from({ length: 17 }, (_, i) => {
      const angle = (i / 16) * 2 * Math.PI
      return pt(0.5 + 0.35 * Math.cos(angle), 0.5 + 0.35 * Math.sin(angle))
    }),
  },

  // ── QUALITY_DELAY ─────────────────────────────────────────────────────────
  // Flat line with a single dip; a delayed impulse
  {
    id: GLYPHS.QUALITY_DELAY,
    name: 'Quality Delay',
    intent: 'Defer effect until triggered',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 12 pts along (0.1,0.5)→(0.35,0.5)→(0.45,0.7)→(0.5,0.5)→(0.55,0.5)→(0.9,0.5)
    canonicalPath: [
      // Flat entry: 4 pts (0.1,0.5)→(0.35,0.5)
      pt(0.1,   0.5),
      pt(0.183, 0.5),
      pt(0.267, 0.5),
      pt(0.35,  0.5),
      // Dip down: 2 more pts →(0.45,0.7)
      pt(0.4,   0.6),
      pt(0.45,  0.7),
      // Dip up: 2 more pts →(0.5,0.5)
      pt(0.475, 0.6),
      pt(0.5,   0.5),
      // Flat exit: 4 more pts →(0.9,0.5)
      pt(0.55,  0.5),
      pt(0.667, 0.5),
      pt(0.783, 0.5),
      pt(0.9,   0.5),
    ],
  },

  // ── TARGET_PERSON ─────────────────────────────────────────────────────────
  // Venus symbol: circle arc at top, vertical stroke below
  {
    id: GLYPHS.TARGET_PERSON,
    name: 'Target Person',
    intent: 'Bind effect to a specific person',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 10 pts: 6-pt semicircle (0.65,0.3)→(0.35,0.3) counterclockwise over the top,
    // then 4-pt vertical stroke (0.5,0.4)→(0.5,0.9)
    // Circle center (0.5,0.3), radius 0.15; angles 0→−π in screen coords (goes upward)
    canonicalPath: [
      // Semicircle: i=0..5, angle = −i*π/5
      ...Array.from({ length: 6 }, (_, i) => {
        const angle = -(i / 5) * Math.PI
        return pt(0.5 + 0.15 * Math.cos(angle), 0.3 + 0.15 * Math.sin(angle))
      }),
      // Vertical stem: 4 pts (0.5,0.4)→(0.5,0.9)
      pt(0.5, 0.4),
      pt(0.5, 0.567),
      pt(0.5, 0.733),
      pt(0.5, 0.9),
    ],
  },

  // ── TARGET_PLACE ──────────────────────────────────────────────────────────
  // Triangle; location / fixed point in space
  {
    id: GLYPHS.TARGET_PLACE,
    name: 'Target Place',
    intent: 'Bind effect to a location',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 10 pts along triangle (0.5,0.1)→(0.9,0.85)→(0.1,0.85)→(0.5,0.1)
    canonicalPath: [
      // Right edge: 4 pts (0.5,0.1)→(0.9,0.85)
      pt(0.5,   0.1),
      pt(0.633, 0.35),
      pt(0.767, 0.6),
      pt(0.9,   0.85),
      // Base: 3 more pts →(0.1,0.85)
      pt(0.633, 0.85),
      pt(0.367, 0.85),
      pt(0.1,   0.85),
      // Left edge: 3 more pts →(0.5,0.1)
      pt(0.233, 0.6),
      pt(0.367, 0.35),
      pt(0.5,   0.1),
    ],
  },

  // ── TARGET_OBJECT ─────────────────────────────────────────────────────────
  // Square; a bounded physical thing
  {
    id: GLYPHS.TARGET_OBJECT,
    name: 'Target Object',
    intent: 'Bind effect to a physical object',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 12 pts tracing square (0.1,0.1)→(0.9,0.1)→(0.9,0.9)→(0.1,0.9), open end
    canonicalPath: [
      // Top edge: 4 pts
      pt(0.1,  0.1),
      pt(0.37, 0.1),
      pt(0.63, 0.1),
      pt(0.9,  0.1),
      // Right edge: 3 more pts
      pt(0.9,  0.37),
      pt(0.9,  0.63),
      pt(0.9,  0.9),
      // Bottom edge: 3 more pts
      pt(0.63, 0.9),
      pt(0.37, 0.9),
      pt(0.1,  0.9),
      // Left edge: 2 more pts (open — must_not_close)
      pt(0.1,  0.63),
      pt(0.1,  0.37),
    ],
  },

  // ── DURATION_INSTANT ──────────────────────────────────────────────────────
  // Vertical downstroke; a single decisive moment
  {
    id: GLYPHS.DURATION_INSTANT,
    name: 'Duration Instant',
    intent: 'Effect fires immediately and once',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 6 points evenly spaced from (0.5,0.1) to (0.5,0.9)
    canonicalPath: linspace(pt(0.5, 0.1), pt(0.5, 0.9), 6),
  },

  // ── DURATION_SUSTAINED ────────────────────────────────────────────────────
  // Lemniscate (figure-eight); continuous, self-renewing flow
  {
    id: GLYPHS.DURATION_SUSTAINED,
    name: 'Duration Sustained',
    intent: 'Effect persists continuously',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_close'],
    // 16 pts of the lemniscate of Bernoulli:
    // t = i/16 * 2π
    // x = 0.5 + 0.35 * cos(t) / (1 + sin(t)²)
    // y = 0.5 + 0.25 * sin(t)*cos(t) / (1 + sin(t)²)
    canonicalPath: Array.from({ length: 16 }, (_, i) => {
      const t = (i / 16) * 2 * Math.PI
      const s = Math.sin(t)
      const c = Math.cos(t)
      const d = 1 + s * s
      return pt(0.5 + (0.35 * c) / d, 0.5 + (0.25 * s * c) / d)
    }),
  },

  // ── DURATION_TRIGGERED ────────────────────────────────────────────────────
  // Open angle-bracket (chevron right); awaiting a condition
  {
    id: GLYPHS.DURATION_TRIGGERED,
    name: 'Duration Triggered',
    intent: 'Effect fires when condition is met',
    strokeCount: 1,
    invariants: ['single_stroke', 'must_not_close'],
    // 10 pts along (0.2,0.1)→(0.8,0.5)→(0.2,0.9)
    canonicalPath: [
      // Upper arm: 6 pts (0.2,0.1)→(0.8,0.5)
      pt(0.2,  0.1),
      pt(0.32, 0.18),
      pt(0.44, 0.26),
      pt(0.56, 0.34),
      pt(0.68, 0.42),
      pt(0.8,  0.5),
      // Lower arm: 4 more pts →(0.2,0.9)
      pt(0.65, 0.6),
      pt(0.5,  0.7),
      pt(0.35, 0.8),
      pt(0.2,  0.9),
    ],
  },
]

// ─── Exports ─────────────────────────────────────────────────────────────────

export { GLYPH_TEMPLATES }
export type { GlyphTemplate }

export function getGlyphTemplate(id: GlyphId): GlyphTemplate {
  const template = GLYPH_TEMPLATES.find(t => t.id === id)
  if (template === undefined) {
    throw new Error(`Unknown glyph: ${id}`)
  }
  return template
}
