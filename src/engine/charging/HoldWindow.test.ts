import { describe, it, expect } from 'vitest'
import {
  getHoldWindowDuration,
  createHoldWindowState,
  getDestabilisation,
  isCollapsed,
} from './HoldWindow'
import type { Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(overallIntegrity: number): Sigil {
  return {
    id: 'test',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity,
    visualState: 'healthy',
    status: 'charged',
    createdAt: 0,
    statusChangedAt: 0,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('getHoldWindowDuration', () => {
  it('returns 2 hours for integrity < 0.5', () => {
    expect(getHoldWindowDuration(makeSigil(0.3))).toBe(2 * 60 * 60 * 1000)
  })

  it('returns 3 hours for integrity in [0.5, 0.8]', () => {
    expect(getHoldWindowDuration(makeSigil(0.5))).toBe(3 * 60 * 60 * 1000)
    expect(getHoldWindowDuration(makeSigil(0.75))).toBe(3 * 60 * 60 * 1000)
  })

  it('returns 4 hours for integrity > 0.8', () => {
    expect(getHoldWindowDuration(makeSigil(0.9))).toBe(4 * 60 * 60 * 1000)
  })

  it('boundary: 0.8 integrity returns 3 hours (not >0.8)', () => {
    expect(getHoldWindowDuration(makeSigil(0.8))).toBe(3 * 60 * 60 * 1000)
  })
})

describe('getDestabilisation', () => {
  it('returns 0 during the hold window', () => {
    const sigil = makeSigil(0.9) // 4h window
    const state = createHoldWindowState(sigil, 0)
    // 2 hours in — still within 4h window
    expect(getDestabilisation(state, 2 * 60 * 60 * 1000)).toBe(0)
  })

  it('returns 0 at the exact window boundary', () => {
    const sigil = makeSigil(0.9) // 4h window
    const state = createHoldWindowState(sigil, 0)
    expect(getDestabilisation(state, state.windowDurationMs)).toBe(0)
  })

  it('increases linearly after window ends', () => {
    const sigil = makeSigil(0.9) // 4h window
    const state = createHoldWindowState(sigil, 0)
    // 30 min past window end
    const overtime = 30 * 60 * 1000
    const d = getDestabilisation(state, state.windowDurationMs + overtime)
    // 30min / 60min = 0.5
    expect(d).toBeCloseTo(0.5, 4)
  })

  it('caps at 1.0 after full collapse', () => {
    const sigil = makeSigil(0.5) // 3h window
    const state = createHoldWindowState(sigil, 0)
    // 2 hours past window end (full collapse ~1h past end)
    const d = getDestabilisation(state, state.windowDurationMs + 2 * 60 * 60 * 1000)
    expect(d).toBe(1)
  })
})

describe('isCollapsed', () => {
  it('returns false within the window', () => {
    const sigil = makeSigil(0.9)
    const state = createHoldWindowState(sigil, 0)
    expect(isCollapsed(state, state.windowDurationMs / 2)).toBe(false)
  })

  it('returns false just after window expires', () => {
    const sigil = makeSigil(0.9)
    const state = createHoldWindowState(sigil, 0)
    // 1ms after window
    expect(isCollapsed(state, state.windowDurationMs + 1)).toBe(false)
  })

  it('returns true when destabilisation reaches 1', () => {
    const sigil = makeSigil(0.5) // 3h window
    const state = createHoldWindowState(sigil, 0)
    // 1h + 5s past window end — slightly past the 1h collapse point to avoid float precision issues
    expect(isCollapsed(state, state.windowDurationMs + 60 * 60 * 1000 + 5_000)).toBe(true)
  })
})
