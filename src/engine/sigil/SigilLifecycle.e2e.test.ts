import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SigilLifecycleManager } from './SigilLifecycle'
import type { Sigil, SigilStatus } from './Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(status: SigilStatus, statusChangedAt = 1_000_000): Sigil {
  return {
    id: 'lifecycle-test',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: null,
    overallIntegrity: 0.75,
    visualState: 'healthy',
    status,
    createdAt: 1_000_000,
    statusChangedAt,
  }
}

// ─── End-to-end lifecycle tests ─────────────────────────────────────────────

describe('SigilLifecycle (end-to-end)', () => {
  let manager: SigilLifecycleManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    manager = new SigilLifecycleManager()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('walks the full happy path: draft → complete → resting → awakened → charged → spent', () => {
    let sigil = makeSigil('draft')
    const original = sigil

    // draft → complete
    vi.setSystemTime(2_000_000)
    sigil = manager.transition(sigil, 'complete')
    expect(sigil.status).toBe('complete')
    expect(sigil.statusChangedAt).toBe(2_000_000)

    // complete → resting
    vi.setSystemTime(3_000_000)
    sigil = manager.transition(sigil, 'resting')
    expect(sigil.status).toBe('resting')
    expect(sigil.statusChangedAt).toBe(3_000_000)

    // resting → awakened
    vi.setSystemTime(4_000_000)
    sigil = manager.transition(sigil, 'awakened')
    expect(sigil.status).toBe('awakened')
    expect(sigil.statusChangedAt).toBe(4_000_000)

    // awakened → charged
    vi.setSystemTime(5_000_000)
    sigil = manager.transition(sigil, 'charged')
    expect(sigil.status).toBe('charged')
    expect(sigil.statusChangedAt).toBe(5_000_000)

    // charged → spent
    vi.setSystemTime(6_000_000)
    sigil = manager.transition(sigil, 'spent')
    expect(sigil.status).toBe('spent')
    expect(sigil.statusChangedAt).toBe(6_000_000)

    // original is never mutated
    expect(original.status).toBe('draft')
    expect(original.statusChangedAt).toBe(1_000_000)
  })

  it('supports resting → complete (re-entering the ritual)', () => {
    let sigil = makeSigil('draft')
    sigil = manager.transition(sigil, 'complete')
    sigil = manager.transition(sigil, 'resting')
    sigil = manager.transition(sigil, 'complete')
    expect(sigil.status).toBe('complete')
  })

  it('supports awakened → resting (backing off)', () => {
    let sigil = makeSigil('draft')
    sigil = manager.transition(sigil, 'complete')
    sigil = manager.transition(sigil, 'resting')
    sigil = manager.transition(sigil, 'awakened')
    sigil = manager.transition(sigil, 'resting')
    expect(sigil.status).toBe('resting')
  })

  it('supports charged → awakened (de-escalation)', () => {
    let sigil = makeSigil('draft')
    sigil = manager.transition(sigil, 'complete')
    sigil = manager.transition(sigil, 'resting')
    sigil = manager.transition(sigil, 'awakened')
    sigil = manager.transition(sigil, 'charged')
    sigil = manager.transition(sigil, 'awakened')
    expect(sigil.status).toBe('awakened')
  })

  it('supports awakened → spent (use without full charge)', () => {
    let sigil = makeSigil('draft')
    sigil = manager.transition(sigil, 'complete')
    sigil = manager.transition(sigil, 'resting')
    sigil = manager.transition(sigil, 'awakened')
    sigil = manager.transition(sigil, 'spent')
    expect(sigil.status).toBe('spent')
  })

  it('rejects all transitions from spent (terminal state)', () => {
    const sigil = makeSigil('spent')
    const allStatuses: SigilStatus[] = ['draft', 'complete', 'resting', 'awakened', 'charged', 'spent']
    for (const target of allStatuses) {
      expect(() => manager.transition(sigil, target)).toThrow()
    }
  })

  it('tracks time since last status change across multiple transitions', () => {
    let sigil = makeSigil('draft', 1_000_000)

    vi.setSystemTime(2_000_000)
    sigil = manager.transition(sigil, 'complete')
    expect(manager.getTimeSinceStatusChange(sigil)).toBe(0)

    vi.setSystemTime(2_500_000)
    expect(manager.getTimeSinceStatusChange(sigil)).toBe(500_000)

    vi.setSystemTime(3_000_000)
    sigil = manager.transition(sigil, 'resting')
    expect(manager.getTimeSinceStatusChange(sigil)).toBe(0)

    vi.setSystemTime(4_000_000)
    expect(manager.getTimeSinceStatusChange(sigil)).toBe(1_000_000)
  })
})
