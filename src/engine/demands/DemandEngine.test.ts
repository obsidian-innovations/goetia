import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateDemand, escalateDemand, evaluateCompliance } from './DemandEngine'
import { getDeadlineMs } from './DemandTemplates'
import type { Demon } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeDemon(overrides: Partial<Demon> = {}): Demon {
  return {
    id: 'bael',
    name: 'Bael',
    rank: 'King',
    domains: ['knowledge'],
    legions: 66,
    sealGeometry: { nodes: [], edges: [] },
    description: 'The first principal spirit.',
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

afterEach(() => vi.useRealTimers())

describe('DemandTemplates — getDeadlineMs', () => {
  it('returns 24h for Baron', () => {
    expect(getDeadlineMs('Baron')).toBe(24 * 60 * 60 * 1000)
  })

  it('returns 12h for Duke', () => {
    expect(getDeadlineMs('Duke')).toBe(12 * 60 * 60 * 1000)
  })

  it('returns 6h for King', () => {
    expect(getDeadlineMs('King')).toBe(6 * 60 * 60 * 1000)
  })

  it('rank scales deadline: Baron deadline > King deadline', () => {
    expect(getDeadlineMs('Baron')).toBeGreaterThan(getDeadlineMs('King'))
  })
})

describe('generateDemand', () => {
  it('creates a demand with the correct demonId', () => {
    const demon = makeDemon()
    const demand = generateDemand(demon, 0.5)
    expect(demand.demonId).toBe('bael')
  })

  it('has selfReported always true', () => {
    const demand = generateDemand(makeDemon(), 0.5)
    expect(demand.selfReported).toBe(true)
  })

  it('demand is not pre-fulfilled', () => {
    const demand = generateDemand(makeDemon(), 0.5)
    expect(demand.fulfilled).toBe(false)
  })

  it('has a description string', () => {
    const demand = generateDemand(makeDemon(), 0.5)
    expect(typeof demand.description).toBe('string')
    expect(demand.description.length).toBeGreaterThan(0)
  })

  it('deadline matches rank (King = 6h)', () => {
    const demand = generateDemand(makeDemon({ rank: 'King' }), 0.5)
    expect(demand.deadlineMs).toBe(6 * 60 * 60 * 1000)
  })

  it('deadline matches rank (Baron = 24h)', () => {
    const demand = generateDemand(makeDemon({ rank: 'Baron' }), 0.5)
    expect(demand.deadlineMs).toBe(24 * 60 * 60 * 1000)
  })

  it('generates unique ids', () => {
    const demon = makeDemon()
    const d1 = generateDemand(demon, 0.5)
    const d2 = generateDemand(demon, 0.5)
    expect(d1.id).not.toBe(d2.id)
  })
})

describe('escalateDemand', () => {
  it('generates a new demand with a different id', () => {
    const demon = makeDemon()
    const original = generateDemand(demon, 0.5)
    const escalated = escalateDemand(original, demon)
    expect(escalated.id).not.toBe(original.id)
  })

  it('has a shorter deadline than the original', () => {
    const demon = makeDemon({ rank: 'King' })
    const original = generateDemand(demon, 0.5)
    const escalated = escalateDemand(original, demon)
    expect(escalated.deadlineMs).toBeLessThan(original.deadlineMs)
  })

  it('description is marked as escalated', () => {
    const demon = makeDemon()
    const original = generateDemand(demon, 0.5)
    const escalated = escalateDemand(original, demon)
    expect(escalated.description).toContain('[ESCALATED]')
  })
})

describe('evaluateCompliance', () => {
  it('returns fulfilled outcome when self-reported true', () => {
    const demand = generateDemand(makeDemon(), 0.5)
    const result = evaluateCompliance(demand, true)
    expect(result.outcome).toBe('fulfilled')
    expect(result.bindingStrengthDelta).toBeGreaterThan(0)
    expect(result.escalate).toBe(false)
  })

  it('returns ignored outcome when demand expired and not reported', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const demand = generateDemand(makeDemon({ rank: 'King' }), 0.5)
    // Skip past the deadline
    vi.setSystemTime(demand.deadlineMs + 1000)
    const result = evaluateCompliance(demand, false)
    expect(result.outcome).toBe('ignored')
    expect(result.bindingStrengthDelta).toBeLessThan(0)
    expect(result.escalate).toBe(true)
  })

  it('returns lied outcome when lied flag is true', () => {
    const demand = generateDemand(makeDemon(), 0.5)
    const result = evaluateCompliance(demand, true, true)
    expect(result.outcome).toBe('lied')
    expect(result.bindingStrengthDelta).toBeLessThan(0)
    expect(result.escalate).toBe(true)
  })
})
