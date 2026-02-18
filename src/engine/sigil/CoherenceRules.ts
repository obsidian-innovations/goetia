import { GlyphId } from './Types'
import { GLYPHS } from './GlyphLibrary'

// ─── Rule types ────────────────────────────────────────────────────────────

export type ChainRequirement = {
  /** If this glyph is placed, at least one of `requires` must also be placed */
  trigger: GlyphId
  requires: GlyphId[]
}

export type CoherenceRulesData = {
  /** Pairs of glyphs whose simultaneous presence creates contradiction */
  contradictions: [GlyphId, GlyphId][]
  /** Directed dependency rules: trigger glyph demands at least one companion */
  chainRequirements: ChainRequirement[]
  /**
   * Semantic groups — a glyph is "isolated" if every placed glyph
   * belongs to the same isolated-category group (i.e. no cross-group companion).
   */
  isolatedCategories: GlyphId[][]
}

// ─── Data ──────────────────────────────────────────────────────────────────

export const COHERENCE_RULES: CoherenceRulesData = {
  contradictions: [
    // Opposing direction vectors cancel each other out
    [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN],
    // Instant firing is incompatible with persistent duration
    [GLYPHS.DURATION_INSTANT, GLYPHS.DURATION_SUSTAINED],
    // Fires-now is incompatible with fires-on-condition
    [GLYPHS.DURATION_INSTANT, GLYPHS.DURATION_TRIGGERED],
  ],

  chainRequirements: [
    // Vector glyphs need a target to direct power toward/from
    { trigger: GLYPHS.VECTOR_OUT,  requires: [GLYPHS.TARGET_PERSON, GLYPHS.TARGET_PLACE, GLYPHS.TARGET_OBJECT] },
    { trigger: GLYPHS.VECTOR_IN,   requires: [GLYPHS.TARGET_PERSON, GLYPHS.TARGET_PLACE, GLYPHS.TARGET_OBJECT] },
    { trigger: GLYPHS.VECTOR_DIFFUSE, requires: [GLYPHS.TARGET_PERSON, GLYPHS.TARGET_PLACE, GLYPHS.TARGET_OBJECT] },
    // Quality modifiers need a vector to modify
    { trigger: GLYPHS.QUALITY_SHARP,   requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
    { trigger: GLYPHS.QUALITY_SUSTAIN, requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
    { trigger: GLYPHS.QUALITY_DELAY,   requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
    // Duration glyphs need a vector to give timing context to
    { trigger: GLYPHS.DURATION_INSTANT,   requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
    { trigger: GLYPHS.DURATION_SUSTAINED, requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
    { trigger: GLYPHS.DURATION_TRIGGERED, requires: [GLYPHS.VECTOR_OUT, GLYPHS.VECTOR_IN, GLYPHS.VECTOR_DIFFUSE] },
  ],

  /**
   * Each inner array is a semantic group.  A glyph is considered "isolated"
   * when every placed glyph in the sigil belongs to the same group — meaning
   * there is no cross-group context to anchor its meaning.
   */
  isolatedCategories: [
    [GLYPHS.QUALITY_SHARP,      GLYPHS.QUALITY_SUSTAIN,    GLYPHS.QUALITY_DELAY],
    [GLYPHS.DURATION_INSTANT,   GLYPHS.DURATION_SUSTAINED, GLYPHS.DURATION_TRIGGERED],
    [GLYPHS.TARGET_PERSON,      GLYPHS.TARGET_PLACE,       GLYPHS.TARGET_OBJECT],
  ],
}
