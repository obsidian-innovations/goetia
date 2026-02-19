import type { Demon } from '../sigil/Types.ts'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface VesselState {
  playerId: string
  lastPosition: { lat: number; lng: number } | null
  boundDemonIds: string[]
  corruptedAt: number
  vesselPower: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

const VESSEL_DURATION_MS = 7 * 24 * 60 * 60 * 1000  // 7 days

const RANK_POWER: Record<string, number> = {
  King: 8, Prince: 7, Duke: 6, Marquis: 5,
  Earl: 4, Knight: 3, President: 3, Baron: 2,
}

// ─── Functions ─────────────────────────────────────────────────────────────

/**
 * Calculate vessel power = sum of bound demon rank powers + best sigil integrity.
 */
export function calcVesselPower(
  boundDemons: Demon[],
  bestSigilIntegrity: number,
): number {
  const rankSum = boundDemons.reduce((sum, d) => sum + (RANK_POWER[d.rank] ?? 2), 0)
  return rankSum + bestSigilIntegrity
}

/**
 * Create a VesselState when a player's corruption reaches 1.0.
 */
export function createVesselState(
  playerId: string,
  lastPosition: { lat: number; lng: number } | null,
  boundDemons: Demon[],
  bestSigilIntegrity: number,
  now: number,
): VesselState {
  return {
    playerId,
    lastPosition,
    boundDemonIds: boundDemons.map(d => d.id),
    corruptedAt:   now,
    vesselPower:   calcVesselPower(boundDemons, bestSigilIntegrity),
  }
}

/**
 * A vessel remains active as a world threat for 7 days.
 */
export function isVesselActive(vessel: VesselState, now: number): boolean {
  return now - vessel.corruptedAt < VESSEL_DURATION_MS
}
