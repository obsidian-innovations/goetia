// ─── Types ─────────────────────────────────────────────────────────────────

export interface GeoCoord {
  lat: number
  lng: number
}

// ─── Permission helper ──────────────────────────────────────────────────────

/** Query current geolocation permission state without prompting. */
export async function queryPermission(): Promise<PermissionState> {
  if (!('permissions' in navigator)) return 'prompt'
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' })
    return result.state
  } catch {
    return 'prompt'
  }
}

// ─── One-shot position ──────────────────────────────────────────────────────

/**
 * Fetches the player's current position once.
 * Returns null if geolocation is unavailable or denied.
 */
export function getCurrentPosition(): Promise<GeoCoord | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 },
    )
  })
}

// ─── Continuous watch ───────────────────────────────────────────────────────

/**
 * Starts watching the player's position. Returns the watch ID.
 * Call `clearWatch(id)` to stop.
 */
export function watchPosition(callback: (pos: GeoCoord) => void): number {
  if (!('geolocation' in navigator)) return -1

  return navigator.geolocation.watchPosition(
    (pos) => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => { /* silently ignore watch errors */ },
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
  )
}

/** Stops a geolocation watch started by `watchPosition`. */
export function clearWatch(id: number): void {
  if (id >= 0 && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(id)
  }
}
