// ─── Glyph Evolution Engine ──────────────────────────────────────────────────
// Pure engine: tracks drawing history per glyph and evolves canonical paths
// after enough repetitions. The player's personal drawing style gradually
// replaces the template.

import type { Point, GlyphId } from '@engine/sigil/Types'
import { normalizePathToUnitSpace, discreteFrechetDistance } from '@engine/sigil/geometry'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlyphDrawingHistory {
  glyphId: GlyphId
  drawCount: number
  accumulatedPaths: Point[][] // last N drawings (keep MAX_STORED_PATHS)
  evolvedCanonicalPath: Point[] | null // null until EVOLUTION_THRESHOLD draws
  divergenceFromOriginal: number // Frechet distance from original canonical
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of recent paths to keep per glyph. */
const MAX_STORED_PATHS = 30

/** Number of draws required before evolution triggers. */
const EVOLUTION_THRESHOLD = 50

/** Number of recent paths to average when evolving. */
const AVERAGE_WINDOW = 20

/** Resample each path to this many points before averaging. */
const RESAMPLE_COUNT = 32

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Create a new empty drawing history for a glyph.
 */
export function createHistory(glyphId: GlyphId): GlyphDrawingHistory {
  return {
    glyphId,
    drawCount: 0,
    accumulatedPaths: [],
    evolvedCanonicalPath: null,
    divergenceFromOriginal: 0,
  }
}

/**
 * Record a new drawing of a glyph. Normalizes the path and stores it.
 */
export function recordDrawing(
  history: GlyphDrawingHistory,
  drawnPath: Point[],
): GlyphDrawingHistory {
  if (drawnPath.length < 3) return history

  const normalized = normalizePathToUnitSpace(drawnPath)
  const paths = [...history.accumulatedPaths, normalized]
  if (paths.length > MAX_STORED_PATHS) {
    paths.splice(0, paths.length - MAX_STORED_PATHS)
  }

  return {
    ...history,
    drawCount: history.drawCount + 1,
    accumulatedPaths: paths,
    // Keep existing evolved path — evolution runs separately
    evolvedCanonicalPath: history.evolvedCanonicalPath,
    divergenceFromOriginal: history.divergenceFromOriginal,
  }
}

/**
 * Resample a path to exactly `count` evenly-spaced points via linear interpolation.
 */
function resampleToCount(path: Point[], count: number): Point[] {
  if (path.length < 2) return path
  if (path.length === count) return path

  // Compute cumulative arc length
  const cumLen: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLen = cumLen[cumLen.length - 1]
  if (totalLen === 0) return Array.from({ length: count }, () => ({ ...path[0] }))

  const result: Point[] = []
  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * totalLen
    // Find segment
    let seg = 0
    while (seg < cumLen.length - 2 && cumLen[seg + 1] < target) seg++
    const segLen = cumLen[seg + 1] - cumLen[seg]
    const t = segLen > 0 ? (target - cumLen[seg]) / segLen : 0
    result.push({
      x: path[seg].x + t * (path[seg + 1].x - path[seg].x),
      y: path[seg].y + t * (path[seg + 1].y - path[seg].y),
    })
  }
  return result
}

/**
 * Attempt to evolve the glyph's canonical path from drawing history.
 * Returns updated history with evolved path if threshold is met.
 */
export function evolveGlyph(
  history: GlyphDrawingHistory,
  originalCanonicalPath: Point[],
): GlyphDrawingHistory {
  if (history.drawCount < EVOLUTION_THRESHOLD) return history
  if (history.accumulatedPaths.length < AVERAGE_WINDOW) return history

  // Average the last AVERAGE_WINDOW paths
  const recent = history.accumulatedPaths.slice(-AVERAGE_WINDOW)
  const resampled = recent.map(p => resampleToCount(p, RESAMPLE_COUNT))

  // Point-wise average
  const averaged: Point[] = []
  for (let i = 0; i < RESAMPLE_COUNT; i++) {
    let sx = 0, sy = 0
    for (const path of resampled) {
      sx += path[i].x
      sy += path[i].y
    }
    averaged.push({ x: sx / AVERAGE_WINDOW, y: sy / AVERAGE_WINDOW })
  }

  // Normalize the averaged path
  const evolvedPath = normalizePathToUnitSpace(averaged)

  // Calculate divergence from original
  const originalResampled = resampleToCount(
    normalizePathToUnitSpace(originalCanonicalPath),
    RESAMPLE_COUNT,
  )
  const divergence = discreteFrechetDistance(evolvedPath, originalResampled)

  return {
    ...history,
    evolvedCanonicalPath: evolvedPath,
    divergenceFromOriginal: divergence,
  }
}

/**
 * Get the effective template path for recognition: evolved if available, original otherwise.
 */
export function getEvolvedTemplate(
  history: GlyphDrawingHistory | undefined,
  originalPath: Point[],
): Point[] {
  return history?.evolvedCanonicalPath ?? originalPath
}

/**
 * Calculate divergence between two paths.
 */
export function calculateDivergence(pathA: Point[], pathB: Point[]): number {
  const a = resampleToCount(normalizePathToUnitSpace(pathA), RESAMPLE_COUNT)
  const b = resampleToCount(normalizePathToUnitSpace(pathB), RESAMPLE_COUNT)
  return discreteFrechetDistance(a, b)
}
