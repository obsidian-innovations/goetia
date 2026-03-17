// ─── Glyph Evolution Engine ──────────────────────────────────────────────────
// Pure engine: tracks drawing history per glyph and evolves canonical paths
// after enough repetitions. The player's personal drawing style gradually
// replaces the template.

import type { Point, GlyphId } from '@engine/sigil/Types'
import { normalizePathToUnitSpace, resamplePath, discreteFrechetDistance } from '@engine/sigil/geometry'

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
export const EVOLUTION_THRESHOLD = 50

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
  const resampled = recent.map(p => resamplePath(p, RESAMPLE_COUNT))

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
  const divergence = calculateDivergence(evolvedPath, originalCanonicalPath)

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
  const a = resamplePath(normalizePathToUnitSpace(pathA), RESAMPLE_COUNT)
  const b = resamplePath(normalizePathToUnitSpace(pathB), RESAMPLE_COUNT)
  return discreteFrechetDistance(a, b)
}
