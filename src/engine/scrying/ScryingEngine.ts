// ─── Scrying Engine ─────────────────────────────────────────────────────────
// Pure engine: analyzes camera frame data for scrying triggers.
// All analysis is local-only — no network, no external APIs.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrameAnalysis {
  avgLuminance: number    // 0-255
  darkness: number        // 0-1 (derived from luminance)
  edgesDetected: number   // count of strong edge pixels
  circlesDetected: number // count of candidate circular features
}

export type ScryingTriggerType = 'lore' | 'whisper' | 'veil_reveal'

export interface ScryingResult {
  darkness: number
  edgesDetected: number
  circlesDetected: number
  triggerType: ScryingTriggerType | null
  loreText: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Edge detection: Sobel gradient magnitude threshold. */
const EDGE_THRESHOLD = 80

/** Minimum darkness for any scrying trigger to activate. */
const MIN_DARKNESS_FOR_SCRYING = 0.5

/** Edge density threshold (fraction of pixels) for veil_reveal. */
const EDGE_DENSITY_FOR_VEIL = 0.15

/** Circle feature threshold for whisper trigger. */
const CIRCLE_THRESHOLD = 3

// ─── Lore pool ───────────────────────────────────────────────────────────────

const SCRYING_LORE = [
  'Shapes writhe at the edge of perception...',
  'The darkness remembers what you drew.',
  'A seal, half-formed, flickers in the void.',
  'Something watches through the glass.',
  'The veil thins where light cannot reach.',
  'Geometry shifts in the shadows beyond.',
  'An old name surfaces, unbidden.',
  'The air tastes of iron and burnt paper.',
  'Circles within circles, turning in the dark.',
  'A whisper from the space between frames.',
]

const VEIL_REVEAL_LORE = [
  'The veil parts — a demon seal burns briefly in the air.',
  'For an instant, you see the geometry of binding.',
  'Edges align into something deliberate, then scatter.',
  'The camera sees what the eye refuses.',
]

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Analyze a single video frame for scrying-relevant features.
 * Operates on raw RGBA pixel data (ImageData).
 *
 * @param width - Frame width in pixels
 * @param height - Frame height in pixels
 * @param data - RGBA pixel data (Uint8ClampedArray, length = width * height * 4)
 */
export function analyzeFrame(
  width: number,
  height: number,
  data: Uint8ClampedArray,
): FrameAnalysis {
  // Compute average luminance
  let luminanceSum = 0
  const pixelCount = width * height

  // Build grayscale buffer for edge detection
  const gray = new Float32Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    gray[i] = lum
    luminanceSum += lum
  }

  const avgLuminance = luminanceSum / pixelCount
  const darkness = Math.max(0, Math.min(1, 1 - avgLuminance / 255))

  // Sobel edge detection (3x3 kernel) — compute once, reuse for circle detection
  const innerW = width - 2
  const innerH = height - 2
  const isEdge = new Uint8Array(innerW * innerH)
  let edgesDetected = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + width - 1] + gray[idx + width + 1]
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1]

      if (Math.sqrt(gx * gx + gy * gy) > EDGE_THRESHOLD) {
        isEdge[(y - 1) * innerW + (x - 1)] = 1
        edgesDetected++
      }
    }
  }

  // Circle detection: count edge pixels on circles centered near the frame center
  const cx = width / 2
  const cy = height / 2
  const minRadius = Math.min(width, height) * 0.1
  const maxRadius = Math.min(width, height) * 0.45
  const radiusBuckets = new Map<number, number>()

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!isEdge[(y - 1) * innerW + (x - 1)]) continue

      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist < minRadius || dist > maxRadius) continue

      const bucket = Math.round(dist / 5) * 5
      radiusBuckets.set(bucket, (radiusBuckets.get(bucket) ?? 0) + 1)
    }
  }

  const minBucketCount = Math.max(10, pixelCount * 0.001)
  let circlesDetected = 0
  for (const count of radiusBuckets.values()) {
    if (count >= minBucketCount) circlesDetected++
  }

  return { avgLuminance, darkness, edgesDetected, circlesDetected }
}

/**
 * Determine scrying trigger from frame analysis and corruption level.
 * Higher corruption makes scrying more sensitive (lower thresholds).
 */
export function getScryingTrigger(
  analysis: FrameAnalysis,
  corruptionLevel: number,
): ScryingResult {
  const base: ScryingResult = {
    darkness: analysis.darkness,
    edgesDetected: analysis.edgesDetected,
    circlesDetected: analysis.circlesDetected,
    triggerType: null,
    loreText: null,
  }

  // Must be sufficiently dark for any scrying
  const adjustedDarknessThreshold = MIN_DARKNESS_FOR_SCRYING - corruptionLevel * 0.2
  if (analysis.darkness < adjustedDarknessThreshold) return base

  // Veil reveal: high edge density + circles (sees hidden geometry)
  const totalPixels = 1 // Normalize against edgesDetected directly
  const adjustedEdgeThreshold = EDGE_DENSITY_FOR_VEIL * (1 - corruptionLevel * 0.3)
  if (analysis.circlesDetected >= CIRCLE_THRESHOLD && analysis.edgesDetected > adjustedEdgeThreshold * totalPixels * 100) {
    base.triggerType = 'veil_reveal'
    base.loreText = VEIL_REVEAL_LORE[Math.floor(Math.random() * VEIL_REVEAL_LORE.length)]
    return base
  }

  // Whisper: circles detected in the dark (demon seals appearing)
  const adjustedCircleThreshold = Math.max(1, CIRCLE_THRESHOLD - Math.floor(corruptionLevel * 2))
  if (analysis.circlesDetected >= adjustedCircleThreshold) {
    base.triggerType = 'whisper'
    base.loreText = SCRYING_LORE[Math.floor(Math.random() * SCRYING_LORE.length)]
    return base
  }

  // Lore: just dark enough (ambient scrying)
  if (analysis.darkness >= 0.7) {
    base.triggerType = 'lore'
    base.loreText = SCRYING_LORE[Math.floor(Math.random() * SCRYING_LORE.length)]
    return base
  }

  return base
}

