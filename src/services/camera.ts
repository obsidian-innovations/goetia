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
