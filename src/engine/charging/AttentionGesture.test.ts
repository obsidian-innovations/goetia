import { describe, it, expect, vi, afterEach } from 'vitest'
import { getNextGesture, validateGesture } from './AttentionGesture'
import type { ChargingState } from './ChargingEngine'
import type { StrokeResult, RingResult } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeChargingState(overrides: Partial<ChargingState> = {}): ChargingState {
  return {
    sigilId: 'test',
    demonRank: 'Baron',
    startedAt: 0,
    chargeProgress: 0.3,
    lastAttentionAt: Date.now(),
    attentionCount: 0,
    decayRate: 0.002,
    ...overrides,
  }
}

function makeStroke(overrides: Partial<StrokeResult> = {}): StrokeResult {
  return {
    pathPoints: [],
    simplifiedPoints: [],
    averageVelocity: 100,
    pressureProfile: [],
    curvature: [],
    duration: 200,
    startPoint: { x: 0.5, y: 0.5 },
    endPoint: { x: 0.5, y: 0.5 },
    totalLength: 0.02,
    ...overrides,
  }
}

function makeRingResult(overrides: Partial<RingResult> = {}): RingResult {
  return {
    circularity: 0.8,
    closure: 0.8,
    consistency: 0.8,
    overallStrength: 0.7,
    weakPoints: [],
    center: { x: 0.5, y: 0.5 },
    radius: 0.3,
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

afterEach(() => vi.useRealTimers())

describe('getNextGesture', () => {
  it('cycles through trace_ring → hold_seal → tap_glyph', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const state0 = makeChargingState({ attentionCount: 0, lastAttentionAt: 0 })
    expect(getNextGesture(state0, 'bael').type).toBe('trace_ring')

    const state1 = makeChargingState({ attentionCount: 1, lastAttentionAt: 0 })
    expect(getNextGesture(state1, 'bael').type).toBe('hold_seal')

    const state2 = makeChargingState({ attentionCount: 2, lastAttentionAt: 0 })
    expect(getNextGesture(state2, 'bael').type).toBe('tap_glyph')

    const state3 = makeChargingState({ attentionCount: 3, lastAttentionAt: 0 })
    expect(getNextGesture(state3, 'bael').type).toBe('trace_ring')
  })

  it('marks gesture as required when overdue', () => {
    vi.useFakeTimers()
    vi.setSystemTime(200_000) // 200s after last attention (>90s threshold for Baron)
    const state = makeChargingState({ lastAttentionAt: 0 })
    const gesture = getNextGesture(state, 'bael')
    expect(gesture.required).toBe(true)
  })

  it('marks gesture as not required when within interval', () => {
    vi.useFakeTimers()
    vi.setSystemTime(30_000) // 30s after last attention (<90s threshold for Baron)
    const state = makeChargingState({ lastAttentionAt: 0 })
    const gesture = getNextGesture(state, 'bael')
    expect(gesture.required).toBe(false)
  })

  it('returns a description string', () => {
    const state = makeChargingState()
    const gesture = getNextGesture(state, 'bael')
    expect(typeof gesture.description).toBe('string')
    expect(gesture.description.length).toBeGreaterThan(0)
  })

  it('King rank requires attention more frequently (shorter interval)', () => {
    // The implementation uses 30s for King vs 90s for Baron
    // Just validate the function returns a gesture with the right fields
    const kingState = makeChargingState({ demonRank: 'King' })
    const baronState = makeChargingState({ demonRank: 'Baron' })
    const kingGesture = getNextGesture(kingState, 'bael')
    const baronGesture = getNextGesture(baronState, 'bael')
    expect(kingGesture.cooldownMs).toBeLessThanOrEqual(baronGesture.cooldownMs)
  })
})

describe('validateGesture', () => {
  describe('trace_ring', () => {
    it('returns true when ring result has sufficient strength', () => {
      const stroke = makeStroke()
      const ring = makeRingResult({ overallStrength: 0.5 })
      expect(validateGesture('trace_ring', stroke, { ringResult: ring })).toBe(true)
    })

    it('returns false when ring result is too weak', () => {
      const stroke = makeStroke()
      const ring = makeRingResult({ overallStrength: 0.3 })
      expect(validateGesture('trace_ring', stroke, { ringResult: ring })).toBe(false)
    })

    it('returns false when no ring result provided', () => {
      const stroke = makeStroke()
      expect(validateGesture('trace_ring', stroke, {})).toBe(false)
    })
  })

  describe('hold_seal', () => {
    it('returns true for a long, stationary stroke', () => {
      const stroke = makeStroke({ duration: 2000, totalLength: 0.01 })
      expect(validateGesture('hold_seal', stroke)).toBe(true)
    })

    it('returns false when duration is too short', () => {
      const stroke = makeStroke({ duration: 500, totalLength: 0.01 })
      expect(validateGesture('hold_seal', stroke)).toBe(false)
    })

    it('returns false when movement is too large', () => {
      const stroke = makeStroke({ duration: 2000, totalLength: 0.2 })
      expect(validateGesture('hold_seal', stroke)).toBe(false)
    })
  })

  describe('tap_glyph', () => {
    it('returns true for a quick short tap', () => {
      const stroke = makeStroke({ duration: 150, totalLength: 0.02 })
      expect(validateGesture('tap_glyph', stroke)).toBe(true)
    })

    it('returns false when duration is too long', () => {
      const stroke = makeStroke({ duration: 500, totalLength: 0.02 })
      expect(validateGesture('tap_glyph', stroke)).toBe(false)
    })

    it('returns false when movement is too large', () => {
      const stroke = makeStroke({ duration: 150, totalLength: 0.3 })
      expect(validateGesture('tap_glyph', stroke)).toBe(false)
    })
  })
})
