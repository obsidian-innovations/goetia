import { describe, it, expect } from 'vitest'
import {
  createCorruptionState,
  addCorruption,
  getStage,
  getCorruptionAmount,
  isVessel,
  isFullyVessel,
  type CorruptionSource,
} from './CorruptionEngine'

function src(type: CorruptionSource['type'], amount: number): CorruptionSource {
  return { type, amount, timestamp: 0 }
}

describe('getStage', () => {
  it('clean below 0.25', () => expect(getStage(0)).toBe('clean'))
  it('clean at 0.24', () => expect(getStage(0.24)).toBe('clean'))
  it('tainted at 0.25', () => expect(getStage(0.25)).toBe('tainted'))
  it('tainted at 0.49', () => expect(getStage(0.49)).toBe('tainted'))
  it('compromised at 0.50', () => expect(getStage(0.50)).toBe('compromised'))
  it('compromised at 0.79', () => expect(getStage(0.79)).toBe('compromised'))
  it('vessel at 0.80', () => expect(getStage(0.80)).toBe('vessel'))
  it('vessel at 1.00', () => expect(getStage(1.00)).toBe('vessel'))
})

describe('createCorruptionState', () => {
  it('starts at level 0 with clean stage', () => {
    const s = createCorruptionState()
    expect(s.level).toBe(0)
    expect(s.stage).toBe('clean')
    expect(s.sources).toHaveLength(0)
  })
})

describe('addCorruption', () => {
  it('adds corruption level', () => {
    const s = addCorruption(createCorruptionState(), src('sigil_cast', 0.10))
    expect(s.level).toBeCloseTo(0.10)
  })

  it('records the source', () => {
    const s = addCorruption(createCorruptionState(), src('clash_loss', 0.08))
    expect(s.sources).toHaveLength(1)
    expect(s.sources[0].type).toBe('clash_loss')
  })

  it('does not decrease level', () => {
    let s = createCorruptionState()
    s = addCorruption(s, src('pact', 0.30))
    s = addCorruption(s, src('sigil_cast', 0.00))
    expect(s.level).toBeCloseTo(0.30)
  })

  it('caps level at 1.0', () => {
    let s = createCorruptionState()
    s = addCorruption(s, src('pact', 0.80))
    s = addCorruption(s, src('pact', 0.80))
    expect(s.level).toBeLessThanOrEqual(1.0)
  })

  it('updates stage when crossing threshold', () => {
    const s = addCorruption(createCorruptionState(), src('pact', 0.30))
    expect(s.stage).toBe('tainted')
  })

  it('does not mutate original state', () => {
    const orig = createCorruptionState()
    addCorruption(orig, src('pact', 0.50))
    expect(orig.level).toBe(0)
  })

  it('accumulates multiple sources', () => {
    let s = createCorruptionState()
    s = addCorruption(s, src('sigil_cast', 0.05))
    s = addCorruption(s, src('clash_loss', 0.10))
    expect(s.sources).toHaveLength(2)
    expect(s.level).toBeCloseTo(0.15)
  })
})

describe('getCorruptionAmount', () => {
  it('King pact is higher than Baron pact', () => {
    const king  = getCorruptionAmount('pact', 'King')
    const baron = getCorruptionAmount('pact', 'Baron')
    expect(king).toBeGreaterThan(baron)
  })

  it('clash_loss > sigil_cast for same rank', () => {
    const clash = getCorruptionAmount('clash_loss', 'Earl')
    const cast  = getCorruptionAmount('sigil_cast', 'Earl')
    expect(clash).toBeGreaterThan(cast)
  })

  it('caps at 0.20', () => {
    const amount = getCorruptionAmount('pact', 'King')
    expect(amount).toBeLessThanOrEqual(0.20)
  })
})

describe('isVessel / isFullyVessel', () => {
  it('not a vessel below 0.80', () => {
    const s = addCorruption(createCorruptionState(), src('pact', 0.70))
    expect(isVessel(s)).toBe(false)
  })

  it('is vessel at 0.80', () => {
    const s = addCorruption(createCorruptionState(), src('pact', 0.80))
    expect(isVessel(s)).toBe(true)
  })

  it('isFullyVessel only at 1.0', () => {
    let s = createCorruptionState()
    s = addCorruption(s, src('pact', 0.85))
    expect(isFullyVessel(s)).toBe(false)
    s = addCorruption(s, src('pact', 0.20))
    expect(isFullyVessel(s)).toBe(true)
  })
})
