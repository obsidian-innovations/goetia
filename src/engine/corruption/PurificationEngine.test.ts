import { describe, it, expect } from 'vitest'
import { attemptPurification } from './PurificationEngine'
import type { VesselState } from './VesselState'

function makeVessel(power: number, demonIds: string[] = []): VesselState {
  return {
    playerId: 'victim',
    lastPosition: null,
    boundDemonIds: demonIds,
    corruptedAt: 0,
    vesselPower: power,
  }
}

describe('attemptPurification', () => {
  it('succeeds when sealIntegrity >= required threshold', () => {
    // vessel power=5 → required = 5/(5+5) = 0.50
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 0.50 },
      makeVessel(5),
    )
    expect(result.outcome).toBe('success')
  })

  it('fails when sealIntegrity < required threshold', () => {
    // vessel power=5 → required = 0.50
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 0.49 },
      makeVessel(5),
    )
    expect(result.outcome).toBe('failure')
  })

  it('success sets targetCorruptionAfter to 0.30', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 1.0 },
      makeVessel(1),
    )
    expect(result.targetCorruptionAfter).toBeCloseTo(0.30)
  })

  it('failure spreads corruption +0.10 to purifier', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 0.0 },
      makeVessel(10),
    )
    expect(result.purifierCorruptionGain).toBeCloseTo(0.10)
  })

  it('failure leaves target corruption unchanged (1.0)', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 0.0 },
      makeVessel(10),
    )
    expect(result.targetCorruptionAfter).toBe(1.0)
  })

  it('success applies at least one permanent scar', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 1.0 },
      makeVessel(1, ['bael']),
    )
    expect(result.permanentScars.length).toBeGreaterThanOrEqual(1)
  })

  it('success gives 0 purifierCorruptionGain', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 1.0 },
      makeVessel(1),
    )
    expect(result.purifierCorruptionGain).toBe(0)
  })

  it('failure gives no permanent scars', () => {
    const result = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'victim', sealIntegrity: 0.0 },
      makeVessel(10),
    )
    expect(result.permanentScars).toHaveLength(0)
  })

  it('higher vessel power requires higher seal integrity', () => {
    // power=2 → required = 2/7 ≈ 0.286 → sealIntegrity=0.30 succeeds
    const easy = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'v1', sealIntegrity: 0.30 },
      makeVessel(2),
    )
    // power=15 → required = 15/20 = 0.75 → sealIntegrity=0.30 fails
    const hard = attemptPurification(
      { purifierId: 'p1', targetVesselId: 'v1', sealIntegrity: 0.30 },
      makeVessel(15),
    )
    expect(easy.outcome).toBe('success')
    expect(hard.outcome).toBe('failure')
  })
})
