import type { Point, GlyphId, GlyphInvariant, StrokeResult, GlyphResult, GlyphDifficulty, GlyphDifficultyConfig } from './Types'
import { GLYPH_DIFFICULTY_CONFIGS } from './Types'
import { GLYPH_TEMPLATES } from './GlyphLibrary'
import {
  signedArea,
  doesPathSelfIntersect,
  isPathClosed,
  normalizePathToUnitSpace,
  resamplePath,
} from './geometry'

// ─── Private helpers ─────────────────────────────────────────────────────────

function checkInvariant(
  invariant: GlyphInvariant,
  stroke: StrokeResult
): boolean {
  switch (invariant) {
    case 'must_close':
      return isPathClosed(stroke.simplifiedPoints, 0.20)
    case 'must_not_close':
      return !isPathClosed(stroke.simplifiedPoints, 0.20)
    case 'must_self_intersect':
      return doesPathSelfIntersect(stroke.simplifiedPoints)
    case 'single_stroke':
      return true // enforced at call site by strokeCount check
    case 'clockwise':
      return signedArea(stroke.simplifiedPoints) < 0
    case 'counterclockwise':
      return signedArea(stroke.simplifiedPoints) > 0
    default:
      return true
  }
}

function procrustesScore(drawn: Point[], template: Point[], rmsdMultiplier: number): number {
  if (drawn.length === 0 || template.length === 0) return 0

  // Step 1 — Center both at origin
  const drawnMeanX = drawn.reduce((s, p) => s + p.x, 0) / drawn.length
  const drawnMeanY = drawn.reduce((s, p) => s + p.y, 0) / drawn.length
  const templateMeanX = template.reduce((s, p) => s + p.x, 0) / template.length
  const templateMeanY = template.reduce((s, p) => s + p.y, 0) / template.length

  const drawnCentered = drawn.map(p => ({ x: p.x - drawnMeanX, y: p.y - drawnMeanY }))
  const templateCentered = template.map(p => ({ x: p.x - templateMeanX, y: p.y - templateMeanY }))

  // Step 2 — Scale both to unit size (RMS distance from origin)
  const drawnScale = Math.sqrt(
    drawnCentered.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0) / drawnCentered.length
  )
  const templateScale = Math.sqrt(
    templateCentered.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0) / templateCentered.length
  )

  if (drawnScale === 0 || templateScale === 0) return 0

  const drawnNorm = drawnCentered.map(p => ({ x: p.x / drawnScale, y: p.y / drawnScale }))
  const templateNorm = templateCentered.map(p => ({ x: p.x / templateScale, y: p.y / templateScale }))

  // Step 3 — Find optimal rotation using covariance method
  let h00 = 0, h01 = 0, h10 = 0, h11 = 0
  for (let i = 0; i < drawnNorm.length; i++) {
    const d = drawnNorm[i]
    const t = templateNorm[i]
    h00 += d.x * t.x
    h01 += d.x * t.y
    h10 += d.y * t.x
    h11 += d.y * t.y
  }

  const angle = Math.atan2(h10 - h01, h00 + h11)
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)

  const drawnRotated = drawnNorm.map(p => ({
    x: p.x * cosA - p.y * sinA,
    y: p.x * sinA + p.y * cosA,
  }))

  // Step 4 — Compute RMSD
  const rmsd = Math.sqrt(
    drawnRotated.reduce((s, p, i) => {
      const dx = p.x - templateNorm[i].x
      const dy = p.y - templateNorm[i].y
      return s + dx * dx + dy * dy
    }, 0) / drawnRotated.length
  )

  // Step 5 — Convert to score (rmsdMultiplier controls strictness)
  return Math.max(0, 1 - rmsd * rmsdMultiplier)
}

// ─── GlyphRecognizer ─────────────────────────────────────────────────────────

export class GlyphRecognizer {
  private readonly RESAMPLE_COUNT = 32
  private _config: GlyphDifficultyConfig

  constructor(difficulty: GlyphDifficulty = 'normal') {
    this._config = GLYPH_DIFFICULTY_CONFIGS[difficulty]
  }

  /** Change the difficulty level at runtime. */
  setDifficulty(difficulty: GlyphDifficulty): void {
    this._config = GLYPH_DIFFICULTY_CONFIGS[difficulty]
  }

  recognize(strokes: StrokeResult[]): GlyphResult {
    // Guard: empty or all strokes have fewer than 3 points
    if (
      strokes.length === 0 ||
      strokes.every(s => s.simplifiedPoints.length < 3)
    ) {
      return { recognized: null, confidence: 0, alternates: [] }
    }

    // Combine all stroke points
    const allPoints = strokes.flatMap(s => s.simplifiedPoints)

    // Build a synthetic combined stroke for invariant checking
    const combinedStroke: StrokeResult = {
      ...strokes[0],
      simplifiedPoints: allPoints,
      pathPoints: strokes.flatMap(s => s.pathPoints),
    }

    // Normalize and resample the drawn path
    const drawnNorm = normalizePathToUnitSpace(allPoints)
    const drawnResampled = resamplePath(drawnNorm, this.RESAMPLE_COUNT)

    // Score each template
    const scores: Array<{ glyph: GlyphId; confidence: number }> = []

    for (const template of GLYPH_TEMPLATES) {
      // 1. Stroke count check
      if (Math.abs(strokes.length - template.strokeCount) > 1) {
        continue
      }

      // 2. Invariant check
      let invariantsPassed = true
      for (const invariant of template.invariants) {
        if (!checkInvariant(invariant, combinedStroke)) {
          invariantsPassed = false
          break
        }
      }
      if (!invariantsPassed) continue

      // 3. Procrustes score (RMSD multiplier varies by difficulty)
      const templateNorm = normalizePathToUnitSpace(template.canonicalPath)
      const templateResampled = resamplePath(templateNorm, this.RESAMPLE_COUNT)
      const score = procrustesScore(drawnResampled, templateResampled, this._config.rmsdMultiplier)
      scores.push({ glyph: template.id, confidence: score })
    }

    // Sort descending by confidence
    scores.sort((a, b) => b.confidence - a.confidence)

    if (scores.length === 0 || scores[0].confidence < this._config.confidenceThreshold) {
      return {
        recognized: null,
        confidence: scores[0]?.confidence ?? 0,
        alternates: scores.slice(0, 3),
      }
    }

    return {
      recognized: scores[0].glyph,
      confidence: scores[0].confidence,
      alternates: scores.slice(1, 4),
    }
  }
}
