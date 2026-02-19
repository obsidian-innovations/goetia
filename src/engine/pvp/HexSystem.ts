import type { Sigil, Demon } from '@engine/sigil/Types'
import { resolveClash, type ClashResult } from './ClashResolver'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Hex {
  id: string
  casterId: string
  targetId: string
  sigil: Sigil
  demon: Demon
  type: 'hex' | 'ward'
  expiresAt: number
  isActive: boolean
}

export interface WardResolutionResult {
  clashResult: ClashResult
  wardActivated: Hex
  hexNeutralized: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────

const HEX_DURATION_MS = 24 * 60 * 60 * 1000  // 24 hours

// ─── Factory functions ─────────────────────────────────────────────────────

/** Cast an offensive hex at a target player. */
export function castHex(
  casterId: string,
  targetId: string,
  sigil: Sigil,
  demon: Demon,
  now: number,
): Hex {
  return {
    id: `hex-${casterId}-${now}`,
    casterId,
    targetId,
    sigil,
    demon,
    type: 'hex',
    expiresAt: now + HEX_DURATION_MS,
    isActive: true,
  }
}

/** Place a defensive ward that auto-triggers against incoming hexes. */
export function castWard(
  casterId: string,
  sigil: Sigil,
  demon: Demon,
  now: number,
): Hex {
  return {
    id: `ward-${casterId}-${now}`,
    casterId,
    targetId: casterId,   // wards protect their caster
    sigil,
    demon,
    type: 'ward',
    expiresAt: now + HEX_DURATION_MS,
    isActive: true,
  }
}

// ─── State helpers ─────────────────────────────────────────────────────────

/** Returns true if the hex/ward is still active and not expired. */
export function isHexActive(hex: Hex, now: number): boolean {
  return hex.isActive && now < hex.expiresAt
}

/** Return a new Hex with isActive set to false. Does not mutate the original. */
export function deactivateHex(hex: Hex): Hex {
  return { ...hex, isActive: false }
}

// ─── Auto-resolution ────────────────────────────────────────────────────────

/**
 * Automatically resolve an incoming hex against the best available active ward.
 * Picks the ward with the highest overall integrity.
 * Returns null if no active wards exist.
 */
export function resolveHexWithWard(
  incomingHex: Hex,
  wards: Hex[],
  now: number,
): WardResolutionResult | null {
  const activeWards = wards.filter(w => isHexActive(w, now))
  if (activeWards.length === 0) return null

  // Pick the highest-integrity ward
  const bestWard = activeWards.reduce((best, w) =>
    w.sigil.overallIntegrity > best.sigil.overallIntegrity ? w : best,
  )

  const clashResult = resolveClash({
    attacker: { sigil: incomingHex.sigil, demon: incomingHex.demon },
    defender: { sigil: bestWard.sigil, demon: bestWard.demon },
  })

  const hexNeutralized = clashResult.winner !== 'attacker'

  return { clashResult, wardActivated: bestWard, hexNeutralized }
}
