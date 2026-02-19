import { describe, it, expect } from 'vitest'
import {
  calcVesselPower,
  createVesselState,
  isVesselActive,
} from './VesselState'
import type { Demon } from '../sigil/Types'

function makeDemon(rank: Demon['rank'], id: string = rank): Demon {
  return {
    id, name: rank, rank, domains: ['knowledge'], legions: 10,
    sealGeometry: { nodes: [], edges: [] }, description: '',
  }
}

describe('calcVesselPower', () => {
  it('is 0 for no demons and 0 integrity', () => {
    expect(calcVesselPower([], 0)).toBe(0)
  })

  it('adds rank power for each demon', () => {
    const power = calcVesselPower([makeDemon('King'), makeDemon('Baron')], 0)
    expect(power).toBe(8 + 2)  // King=8, Baron=2
  })

  it('adds best sigil integrity', () => {
    const power = calcVesselPower([makeDemon('Duke')], 0.8)
    expect(power).toBeCloseTo(6 + 0.8)
  })
})

describe('createVesselState', () => {
  it('sets playerId and corruptedAt', () => {
    const v = createVesselState('p1', null, [], 0, 9999)
    expect(v.playerId).toBe('p1')
    expect(v.corruptedAt).toBe(9999)
  })

  it('maps boundDemonIds from demons', () => {
    const v = createVesselState('p1', null, [makeDemon('King', 'bael')], 0.5, 0)
    expect(v.boundDemonIds).toContain('bael')
  })

  it('stores lastPosition', () => {
    const pos = { lat: 51.5, lng: -0.1 }
    const v = createVesselState('p1', pos, [], 0, 0)
    expect(v.lastPosition).toEqual(pos)
  })
})

describe('isVesselActive', () => {
  it('is active just after creation', () => {
    const v = createVesselState('p1', null, [], 0, 1000)
    expect(isVesselActive(v, 2000)).toBe(true)
  })

  it('expires after 7 days', () => {
    const now = 1000
    const v = createVesselState('p1', null, [], 0, now)
    const afterExpiry = now + 7 * 24 * 60 * 60 * 1000 + 1
    expect(isVesselActive(v, afterExpiry)).toBe(false)
  })
})
