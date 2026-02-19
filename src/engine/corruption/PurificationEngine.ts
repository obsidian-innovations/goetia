import type { VesselState } from './VesselState.ts'

// ─── Types ─────────────────────────────────────────────────────────────────

export type PurificationOutcome = 'success' | 'failure'

export interface PermanentScar {
  type: 'suspicious_demon' | 'shifted_geometry' | 'persistent_distortion'
  demonId?: string
  description: string
}

export interface PurificationAttempt {
  purifierId: string
  targetVesselId: string
  /** Quality of the purification ritual seal (0–1). */
  sealIntegrity: number
}

export interface PurificationResult {
  outcome: PurificationOutcome
  /** New corruption level for the vessel player (success: 0.30, failure: unchanged) */
  targetCorruptionAfter: number
  /** Additional corruption gained by the purifier (failure: +0.10, success: 0) */
  purifierCorruptionGain: number
  /** Applied only on success */
  permanentScars: PermanentScar[]
  narrative: string
}

// ─── Core logic ────────────────────────────────────────────────────────────

/**
 * Attempt to purify a vessel.
 *
 * Required threshold = vesselPower / (vesselPower + 5).
 * High vessel power → harder to purify (approaching but never reaching 1.0).
 *
 * Success: target corruption set to 0.30, permanent scars applied.
 * Failure: purifier gains +0.10 corruption.
 */
export function attemptPurification(
  attempt: PurificationAttempt,
  vessel: VesselState,
): PurificationResult {
  const required = vessel.vesselPower / (vessel.vesselPower + 5)
  const success  = attempt.sealIntegrity >= required

  if (success) {
    return {
      outcome:                'success',
      targetCorruptionAfter:  0.30,
      purifierCorruptionGain: 0,
      permanentScars:         buildScars(vessel),
      narrative:
        'The vessel is cleansed — but not clean. The corruption recedes to 30%, ' +
        'leaving permanent marks on the soul. Some debts cannot be fully repaid.',
    }
  }

  return {
    outcome:                'failure',
    targetCorruptionAfter:  1.0,
    purifierCorruptionGain: 0.10,
    permanentScars:         [],
    narrative:
      `The purification failed. The vessel's power (${vessel.vesselPower.toFixed(1)}) ` +
      `repels the ritual. The corruption spreads to the purifier.`,
  }
}

/** Build permanent scars for a newly purified player. */
function buildScars(vessel: VesselState): PermanentScar[] {
  const scars: PermanentScar[] = [
    {
      type:        'persistent_distortion',
      description: 'A faint darkness clings to the canvas. It never fully resolves.',
    },
  ]

  if (vessel.boundDemonIds.length > 0) {
    const id = vessel.boundDemonIds[0]
    scars.push({
      type:        'suspicious_demon',
      demonId:     id,
      description: `${id} will never fully trust you again. Its demands are always maximum difficulty.`,
    })
  }

  if (vessel.boundDemonIds.length > 1) {
    const id = vessel.boundDemonIds[1]
    scars.push({
      type:        'shifted_geometry',
      demonId:     id,
      description: `${id}'s seal geometry has been permanently shifted. It can never be drawn as cleanly.`,
    })
  }

  return scars
}
