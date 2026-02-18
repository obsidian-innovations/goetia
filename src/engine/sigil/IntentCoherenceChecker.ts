import { GlyphId, IntentCoherenceResult, PlacedGlyph } from './Types'
import { COHERENCE_RULES } from './CoherenceRules'

export class IntentCoherenceChecker {
  /**
   * Evaluates the semantic coherence of a set of placed glyphs.
   * Returns a score in [0, 1] together with a breakdown of issues found.
   */
  checkCoherence(glyphs: PlacedGlyph[]): IntentCoherenceResult {
    const ids = glyphs.map(g => g.glyphId)

    const contradictions = this._findContradictions(ids)
    const incompleteChains = this._findIncompleteChains(ids)
    const isolatedGlyphs = this._findIsolatedGlyphs(ids)

    const score = this._computeScore(ids, contradictions, incompleteChains, isolatedGlyphs)

    return { score, contradictions, incompleteChains, isolatedGlyphs }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _findContradictions(ids: GlyphId[]): [GlyphId, GlyphId][] {
    const found: [GlyphId, GlyphId][] = []
    for (const [a, b] of COHERENCE_RULES.contradictions) {
      if (ids.includes(a) && ids.includes(b)) {
        found.push([a, b])
      }
    }
    return found
  }

  private _findIncompleteChains(ids: GlyphId[]): GlyphId[][] {
    const chains: GlyphId[][] = []
    for (const rule of COHERENCE_RULES.chainRequirements) {
      if (!ids.includes(rule.trigger)) continue
      const satisfied = rule.requires.some(r => ids.includes(r))
      if (!satisfied) {
        // Report the trigger as the head of the broken chain
        chains.push([rule.trigger, ...rule.requires])
      }
    }
    return chains
  }

  private _findIsolatedGlyphs(ids: GlyphId[]): GlyphId[] {
    if (ids.length === 0) return []

    const isolated: GlyphId[] = []
    for (const group of COHERENCE_RULES.isolatedCategories) {
      const groupSet = new Set<GlyphId>(group)
      // Glyphs in this group that are actually placed
      const placedInGroup = ids.filter(id => groupSet.has(id))
      if (placedInGroup.length === 0) continue

      // They are isolated if every placed glyph belongs to this same group
      const allInGroup = ids.every(id => groupSet.has(id))
      if (allInGroup) {
        isolated.push(...placedInGroup)
      }
    }
    return isolated
  }

  private _computeScore(
    ids: GlyphId[],
    contradictions: [GlyphId, GlyphId][],
    incompleteChains: GlyphId[][],
    isolatedGlyphs: GlyphId[],
  ): number {
    const BASE = 0.60
    const CONTRADICTION_PENALTY = 0.30
    const CHAIN_PENALTY = 0.15
    const ISOLATION_PENALTY = 0.10
    const COHERENCE_BONUS = 0.40

    let score = BASE

    // Reward a fully coherent non-empty sigil
    const hasIssues =
      contradictions.length > 0 ||
      incompleteChains.length > 0 ||
      isolatedGlyphs.length > 0
    if (ids.length > 0 && !hasIssues) {
      score += COHERENCE_BONUS
    }

    score -= contradictions.length * CONTRADICTION_PENALTY
    score -= incompleteChains.length * CHAIN_PENALTY
    score -= isolatedGlyphs.length * ISOLATION_PENALTY

    return Math.max(0, Math.min(1, score))
  }
}
