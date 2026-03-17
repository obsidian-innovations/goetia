// ─── Camera service ────────────────────────────────────────────────────────
// Side-effect integration for the device camera (getUserMedia).

/**
 * Start the camera and return the MediaStream.
 * Returns null if the camera is unavailable or the user denies permission.
 */
export async function startCamera(
  facingMode: 'user' | 'environment' = 'environment',
): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    })
  } catch {
    return null
  }
}

/** Stop all tracks on a stream and release the camera. */
export function stopCamera(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

/** Cached canvas for frame capture — avoid re-creating DOM element each tick. */
let _captureCanvas: HTMLCanvasElement | null = null
let _captureCtx: CanvasRenderingContext2D | null = null
let _captureW = 0
let _captureH = 0

/**
 * Capture a single frame from a video element as RGBA pixel data.
 * Downscales to targetWidth×targetHeight for efficient analysis.
 * Returns null if the canvas context cannot be created.
 */
export function captureFrame(
  video: HTMLVideoElement,
  targetWidth = 160,
  targetHeight = 120,
): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (!_captureCanvas || _captureW !== targetWidth || _captureH !== targetHeight) {
    _captureCanvas = document.createElement('canvas')
    _captureCanvas.width = targetWidth
    _captureCanvas.height = targetHeight
    _captureCtx = _captureCanvas.getContext('2d')
    _captureW = targetWidth
    _captureH = targetHeight
  }
  if (!_captureCtx) return null

  _captureCtx.drawImage(video, 0, 0, targetWidth, targetHeight)
  const imageData = _captureCtx.getImageData(0, 0, targetWidth, targetHeight)
  return { width: targetWidth, height: targetHeight, data: imageData.data }
}
