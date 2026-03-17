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
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
  return { width: targetWidth, height: targetHeight, data: imageData.data }
}
