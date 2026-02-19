import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SigilLifecycleManager } from './SigilLifecycle'
import type { Sigil, SigilStatus } from './Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSigil(status: SigilStatus, statusChangedAt = 1_000_000): Sigil {
  return {
    id: 'test-sigil',
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SigilLifecycleManager', () => {
  let manager: SigilLifecycleManager

  beforeEach(() => {
    manager = new SigilLifecycleManager()
  })

  describe('canTransition', () => {
    it('allows draft → complete', () => {
      expect(manager.canTransition('draft', 'complete')).toBe(true)
    })

    it('allows complete → resting', () => {
      expect(manager.canTransition('complete', 'resting')).toBe(true)
    })

    it('allows resting → awakened', () => {
      expect(manager.canTransition('resting', 'awakened')).toBe(true)
    })

    it('allows resting → complete', () => {
      expect(manager.canTransition('resting', 'complete')).toBe(true)
    })

    it('allows awakened → charged', () => {
      expect(manager.canTransition('awakened', 'charged')).toBe(true)
    })

    it('allows awakened → spent', () => {
      expect(manager.canTransition('awakened', 'spent')).toBe(true)
    })

    it('allows awakened → resting', () => {
      expect(manager.canTransition('awakened', 'resting')).toBe(true)
    })

    it('allows charged → spent', () => {
      expect(manager.canTransition('charged', 'spent')).toBe(true)
    })

    it('allows charged → awakened', () => {
      expect(manager.canTransition('charged', 'awakened')).toBe(true)
    })

    it('rejects draft → resting', () => {
      expect(manager.canTransition('draft', 'resting')).toBe(false)
    })

    it('rejects spent → any', () => {
      const targets: SigilStatus[] = ['draft', 'complete', 'resting', 'awakened', 'charged']
      for (const t of targets) {
        expect(manager.canTransition('spent', t)).toBe(false)
      }
    })

    it('rejects complete → charged', () => {
      expect(manager.canTransition('complete', 'charged')).toBe(false)
    })
  })

  describe('transition', () => {
    it('returns a new sigil with updated status', () => {
      const sigil = makeSigil('draft')
      const updated = manager.transition(sigil, 'complete')
      expect(updated.status).toBe('complete')
    })

    it('does not mutate the original sigil', () => {
      const sigil = makeSigil('draft')
      manager.transition(sigil, 'complete')
      expect(sigil.status).toBe('draft')
    })

    it('updates statusChangedAt', () => {
      const now = 2_000_000
      vi.setSystemTime(now)
      const sigil = makeSigil('draft', 1_000_000)
      const updated = manager.transition(sigil, 'complete')
      expect(updated.statusChangedAt).toBe(now)
      vi.useRealTimers()
    })

    it('throws on invalid transition', () => {
      const sigil = makeSigil('draft')
      expect(() => manager.transition(sigil, 'charged')).toThrow(
        'Invalid sigil status transition: draft → charged',
      )
    })

    it('throws when transitioning from spent', () => {
      const sigil = makeSigil('spent')
      expect(() => manager.transition(sigil, 'complete')).toThrow()
    })
  })

  describe('getTimeSinceStatusChange', () => {
    afterEach(() => { vi.useRealTimers() })

    it('returns elapsed time since statusChangedAt', () => {
      vi.useFakeTimers()
      vi.setSystemTime(1_000_000)
      const sigil = makeSigil('complete', 900_000)
      const elapsed = manager.getTimeSinceStatusChange(sigil)
      expect(elapsed).toBe(100_000)
    })

    it('falls back to createdAt when statusChangedAt equals createdAt', () => {
      vi.useFakeTimers()
      vi.setSystemTime(1_500_000)
      const sigil = makeSigil('draft', 1_000_000)
      expect(manager.getTimeSinceStatusChange(sigil)).toBe(500_000)
    })
  })
})
