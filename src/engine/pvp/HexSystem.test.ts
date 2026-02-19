import { describe, it, expect } from 'vitest'
import {
  castHex,
  castWard,
  isHexActive,
  deactivateHex,
  resolveHexWithWard,
} from './HexSystem'
import type { Sigil, Demon, DemonRank, DemonDomain } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(overrides: { integrity?: number; coherence?: number } = {}): Sigil {
  return {
    id: 'sig-' + Math.random().toString(36).slice(2),
    demonId: 'bael',
    sealIntegrity: overrides.integrity ?? 0.7,
    completedConnections: [],
    glyphs: [],
    intentCoherence: {
      score: overrides.coherence ?? 0.7,
      contradictions: [],
      incompleteChains: [],
      isolatedGlyphs: [],
    },
    bindingRing: null,
    overallIntegrity: overrides.integrity ?? 0.7,
    visualState: 'healthy',
    status: 'complete',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

function makeDemon(rank: DemonRank, domains: DemonDomain[]): Demon {
  return {
    id: 'demo-' + rank,
    name: rank,
    rank,
    domains,
    legions: 10,
    sealGeometry: { nodes: [], edges: [] },
    description: '',
  }
}

// ─── castHex ────────────────────────────────────────────────────────────────

describe('castHex', () => {
  it('creates a hex with correct fields', () => {
    const sigil = makeSigil()
    const demon = makeDemon('Baron', ['destruction'])
    const hex = castHex('player-1', 'player-2', sigil, demon, 1000)
    expect(hex.casterId).toBe('player-1')
    expect(hex.targetId).toBe('player-2')
    expect(hex.type).toBe('hex')
    expect(hex.isActive).toBe(true)
    expect(hex.sigil).toBe(sigil)
    expect(hex.demon).toBe(demon)
  })

  it('sets expiresAt 24h after now', () => {
    const now = 5000
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['knowledge']), now)
    expect(hex.expiresAt).toBe(now + 24 * 60 * 60 * 1000)
  })
})

// ─── castWard ───────────────────────────────────────────────────────────────

describe('castWard', () => {
  it('creates a ward with type ward', () => {
    const ward = castWard('player-1', makeSigil(), makeDemon('Baron', ['protection']), 1000)
    expect(ward.type).toBe('ward')
    expect(ward.isActive).toBe(true)
  })

  it('targets the caster themselves', () => {
    const ward = castWard('player-1', makeSigil(), makeDemon('Baron', ['protection']), 1000)
    expect(ward.casterId).toBe('player-1')
    expect(ward.targetId).toBe('player-1')
  })
})

// ─── isHexActive ────────────────────────────────────────────────────────────

describe('isHexActive', () => {
  it('returns true for a fresh hex', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    expect(isHexActive(hex, 1000)).toBe(true)
  })

  it('returns false after expiry', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    expect(isHexActive(hex, hex.expiresAt + 1)).toBe(false)
  })

  it('returns false when deactivated but not expired', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    const deactivated = deactivateHex(hex)
    expect(isHexActive(deactivated, 1000)).toBe(false)
  })
})

// ─── deactivateHex ──────────────────────────────────────────────────────────

describe('deactivateHex', () => {
  it('sets isActive to false', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    expect(deactivateHex(hex).isActive).toBe(false)
  })

  it('does not mutate the original', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    deactivateHex(hex)
    expect(hex.isActive).toBe(true)
  })
})

// ─── resolveHexWithWard ─────────────────────────────────────────────────────

describe('resolveHexWithWard', () => {
  it('returns null when no wards available', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    expect(resolveHexWithWard(hex, [], 1000)).toBeNull()
  })

  it('returns null when all wards are expired', () => {
    const hex = castHex('p1', 'p2', makeSigil(), makeDemon('Baron', ['destruction']), 0)
    const ward = castWard('p2', makeSigil(), makeDemon('Baron', ['protection']), 0)
    expect(resolveHexWithWard(hex, [ward], ward.expiresAt + 1)).toBeNull()
  })

  it('returns a WardResolutionResult when ward is available', () => {
    const hex = castHex('p1', 'p2', makeSigil({ integrity: 0.4 }), makeDemon('Baron', ['destruction']), 0)
    const ward = castWard('p2', makeSigil({ integrity: 0.9 }), makeDemon('King', ['protection']), 0)
    const result = resolveHexWithWard(hex, [ward], 1000)
    expect(result).not.toBeNull()
    expect(result!.wardActivated.id).toBe(ward.id)
    expect(result!.clashResult).toBeDefined()
  })

  it('picks the highest-integrity ward', () => {
    const hex = castHex('p1', 'p2', makeSigil({ integrity: 0.5 }), makeDemon('Baron', ['knowledge']), 0)
    const weakWard  = castWard('p2', makeSigil({ integrity: 0.3 }), makeDemon('Baron', ['protection']), 0)
    const strongWard = castWard('p2', makeSigil({ integrity: 0.9 }), makeDemon('King', ['protection']), 0)
    const result = resolveHexWithWard(hex, [weakWard, strongWard], 1000)
    expect(result!.wardActivated.id).toBe(strongWard.id)
  })

  it('sets hexNeutralized=true when ward wins', () => {
    const hex = castHex('p1', 'p2', makeSigil({ integrity: 0.1, coherence: 0.1 }), makeDemon('Baron', ['destruction']), 0)
    const ward = castWard('p2', makeSigil({ integrity: 0.9, coherence: 0.9 }), makeDemon('King', ['protection']), 0)
    const result = resolveHexWithWard(hex, [ward], 1000)
    expect(result!.hexNeutralized).toBe(true)
  })

  it('sets hexNeutralized=false when hex wins', () => {
    const hex = castHex('p1', 'p2', makeSigil({ integrity: 0.95, coherence: 0.95 }), makeDemon('King', ['binding']), 0)
    const ward = castWard('p2', makeSigil({ integrity: 0.1, coherence: 0.1 }), makeDemon('Baron', ['liberation']), 0)
    const result = resolveHexWithWard(hex, [ward], 1000)
    expect(result!.hexNeutralized).toBe(false)
  })
})
