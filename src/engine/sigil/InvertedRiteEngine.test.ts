import { describe, it, expect } from 'vitest'
import {
  detectInvertedRite,
  composeInvertedSigil,
  evaluateBrokenRite,
} from './InvertedRiteEngine'
import type { Sigil, DrawingPhase } from './Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000

function makeSigil(overrides: Partial<Sigil> = {}): Sigil {
  return {
    id: 'sig-test',
    demonId: 'bael',
    sealIntegrity: 0.8,
    completedConnections: [],
    glyphs: [],
    intentCoherence: { score: 0.9, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
    bindingRing: {
      center: { x: 0.5, y: 0.5 },
      radius: 0.3,
      circularity: 0.9,
      closure: 0.85,
      consistency: 0.8,
      overallStrength: 0.85,
      weakPoints: [],
    },
    overallIntegrity: 0.85,
    visualState: 'charged',
    status: 'draft',
    createdAt: NOW,
    statusChangedAt: NOW,
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InvertedRiteEngine', () => {
  describe('detectInvertedRite', () => {
    it('detects RING before SEAL', () => {
      const history: DrawingPhase[] = ['RING', 'GLYPH', 'SEAL']
      expect(detectInvertedRite(history)).toBe(true)
    })

    it('returns false for normal order (SEAL before RING)', () => {
      const history: DrawingPhase[] = ['SEAL', 'GLYPH', 'RING']
      expect(detectInvertedRite(history)).toBe(false)
    })

    it('returns false if RING never visited', () => {
      const history: DrawingPhase[] = ['SEAL', 'GLYPH']
      expect(detectInvertedRite(history)).toBe(false)
    })

    it('returns false if SEAL never visited', () => {
      const history: DrawingPhase[] = ['RING', 'GLYPH']
      expect(detectInvertedRite(history)).toBe(false)
    })

    it('uses first occurrence of each phase', () => {
      // RING first, then SEAL, then RING again — still inverted
      const history: DrawingPhase[] = ['RING', 'SEAL', 'RING']
      expect(detectInvertedRite(history)).toBe(true)
    })

    it('handles SEAL first then RING then SEAL — not inverted', () => {
      const history: DrawingPhase[] = ['SEAL', 'RING', 'SEAL']
      expect(detectInvertedRite(history)).toBe(false)
    })

    it('returns false for empty history', () => {
      expect(detectInvertedRite([])).toBe(false)
    })

    it('handles direct RING→SEAL', () => {
      expect(detectInvertedRite(['RING', 'SEAL'])).toBe(true)
    })
  })

  describe('composeInvertedSigil', () => {
    it('swaps seal and ring weights', () => {
      const sigil = makeSigil({
        sealIntegrity: 0.8,
        bindingRing: {
          center: { x: 0.5, y: 0.5 }, radius: 0.3,
          circularity: 0.9, closure: 0.85, consistency: 0.8,
          overallStrength: 0.9, weakPoints: [],
        },
        intentCoherence: { score: 0.7, contradictions: [], incompleteChains: [], isolatedGlyphs: [] },
      })

      const result = composeInvertedSigil(sigil)

      // ring(0.9)*0.40 + coherence(0.7)*0.35 + seal(0.8)*0.25
      // = 0.36 + 0.245 + 0.20 = 0.805
      expect(result.sigil.overallIntegrity).toBeCloseTo(0.805)
      expect(result.isDefensive).toBe(true)
      expect(result.corruptionMultiplier).toBe(2.0)
    })

    it('handles null binding ring', () => {
      const sigil = makeSigil({ bindingRing: null })
      const result = composeInvertedSigil(sigil)
      // ring=0 → 0*0.40 + coherence*0.35 + seal*0.25
      expect(result.sigil.overallIntegrity).toBeCloseTo(0.9 * 0.35 + 0.8 * 0.25)
    })

    it('does not mutate original sigil', () => {
      const sigil = makeSigil()
      const originalIntegrity = sigil.overallIntegrity
      composeInvertedSigil(sigil)
      expect(sigil.overallIntegrity).toBe(originalIntegrity)
    })

    it('produces different integrity than normal composition', () => {
      const sigil = makeSigil({ sealIntegrity: 0.5 })
      const normalIntegrity = sigil.overallIntegrity
      const inverted = composeInvertedSigil(sigil)
      // Inverted weights ring higher, seal lower — should differ
      expect(inverted.sigil.overallIntegrity).not.toBeCloseTo(normalIntegrity)
    })
  })

  describe('evaluateBrokenRite', () => {
    it('produces sacrificial value for weak seal with ring', () => {
      const result = evaluateBrokenRite(0.3, 0.8)
      expect(result).not.toBeNull()
      // 0.8 * (1 - 0.3) = 0.56
      expect(result!.sacrificialValue).toBeCloseTo(0.56)
      // 0.56 * 0.5 = 0.28
      expect(result!.corruptionReduction).toBeCloseTo(0.28)
    })

    it('returns null when seal integrity >= 0.5', () => {
      expect(evaluateBrokenRite(0.5, 0.8)).toBeNull()
      expect(evaluateBrokenRite(0.9, 0.8)).toBeNull()
    })

    it('returns null when ring strength is 0', () => {
      expect(evaluateBrokenRite(0.3, 0)).toBeNull()
    })

    it('maximizes sacrificial value at zero seal integrity', () => {
      const result = evaluateBrokenRite(0, 1.0)
      expect(result).not.toBeNull()
      // 1.0 * (1 - 0) = 1.0
      expect(result!.sacrificialValue).toBeCloseTo(1.0)
    })

    it('scales with ring strength', () => {
      const weak = evaluateBrokenRite(0.2, 0.3)
      const strong = evaluateBrokenRite(0.2, 0.9)
      expect(strong!.sacrificialValue).toBeGreaterThan(weak!.sacrificialValue)
    })
  })
})
