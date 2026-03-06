import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from './canvasStore'
import type { ConnectionResult, PlacedGlyph, RingResult, GlyphId, IntentCoherenceResult, Sigil } from '@engine/sigil/Types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConnection(edgeKey = 'a-b', accuracy = 0.8): ConnectionResult {
  return { fromNode: 'a', toNode: 'b', edgeKey, accuracy, valid: true } as ConnectionResult
}

function makeGlyph(glyphId: string, score = 0.7): PlacedGlyph {
  return {
    glyphId: glyphId as GlyphId,
    position: { x: 0.5, y: 0.5 },
    score,
    strokes: [],
  } as PlacedGlyph
}

function makeRingResult(strength = 0.75): RingResult {
  return {
    center: { x: 0.5, y: 0.5 },
    radius: 0.4,
    circularity: 0.8,
    closure: 0.7,
    consistency: 0.8,
    weakPoints: 0,
    overallStrength: strength,
  } as RingResult
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.getState().resetCanvas()
  })

  describe('initial state', () => {
    it('starts with null demon and SEAL phase', () => {
      const state = useCanvasStore.getState()
      expect(state.currentDemonId).toBeNull()
      expect(state.currentPhase).toBe('SEAL')
      expect(state.glyphDifficulty).toBe('normal')
      expect(state.completedConnections).toEqual([])
      expect(state.sealIntegrity).toBe(0)
      expect(state.placedGlyphs).toEqual([])
      expect(state.coherenceResult).toBeNull()
      expect(state.ringResult).toBeNull()
      expect(state.composedSigil).toBeNull()
    })
  })

  describe('selectDemon', () => {
    it('sets the demon and resets all other state', () => {
      const store = useCanvasStore.getState()
      // Populate some state first
      store.addConnection(makeConnection())
      store.setPhase('RING')

      store.selectDemon('paimon')
      const state = useCanvasStore.getState()
      expect(state.currentDemonId).toBe('paimon')
      expect(state.currentPhase).toBe('SEAL')
      expect(state.completedConnections).toEqual([])
    })
  })

  describe('addConnection', () => {
    it('appends connections', () => {
      const store = useCanvasStore.getState()
      store.addConnection(makeConnection('a-b'))
      store.addConnection(makeConnection('b-c'))
      expect(useCanvasStore.getState().completedConnections).toHaveLength(2)
    })
  })

  describe('addGlyph', () => {
    it('adds a glyph', () => {
      useCanvasStore.getState().addGlyph(makeGlyph('power'))
      expect(useCanvasStore.getState().placedGlyphs).toHaveLength(1)
    })

    it('deduplicates by glyphId', () => {
      const store = useCanvasStore.getState()
      store.addGlyph(makeGlyph('power', 0.6))
      store.addGlyph(makeGlyph('power', 0.9))
      const glyphs = useCanvasStore.getState().placedGlyphs
      expect(glyphs).toHaveLength(1)
      expect(glyphs[0].score).toBe(0.9)
    })
  })

  describe('removeGlyph', () => {
    it('removes by id and keeps others', () => {
      const store = useCanvasStore.getState()
      store.addGlyph(makeGlyph('power'))
      store.addGlyph(makeGlyph('duration'))
      store.removeGlyph('power' as GlyphId)
      const glyphs = useCanvasStore.getState().placedGlyphs
      expect(glyphs).toHaveLength(1)
      expect(glyphs[0].glyphId).toBe('duration')
    })
  })

  describe('setPhase', () => {
    it('changes the drawing phase', () => {
      useCanvasStore.getState().setPhase('GLYPH')
      expect(useCanvasStore.getState().currentPhase).toBe('GLYPH')
      useCanvasStore.getState().setPhase('RING')
      expect(useCanvasStore.getState().currentPhase).toBe('RING')
    })
  })

  describe('setRingResult', () => {
    it('stores the ring result', () => {
      const ring = makeRingResult(0.85)
      useCanvasStore.getState().setRingResult(ring)
      expect(useCanvasStore.getState().ringResult).toBe(ring)
    })
  })

  describe('setCoherence', () => {
    it('stores the coherence result', () => {
      const coherence: IntentCoherenceResult = {
        score: 0.9,
        contradictions: [],
        incompleteChains: [],
        isolatedGlyphs: [],
      }
      useCanvasStore.getState().setCoherence(coherence)
      expect(useCanvasStore.getState().coherenceResult).toBe(coherence)
    })
  })

  describe('setComposedSigil', () => {
    it('stores the composed sigil', () => {
      const sigil = { id: 'test', demonId: 'bael' } as Sigil
      useCanvasStore.getState().setComposedSigil(sigil)
      expect(useCanvasStore.getState().composedSigil).toBe(sigil)
    })
  })

  describe('resetCanvas', () => {
    it('restores all state to initial values', () => {
      const store = useCanvasStore.getState()
      store.selectDemon('bael')
      store.addConnection(makeConnection())
      store.addGlyph(makeGlyph('power'))
      store.setRingResult(makeRingResult())
      store.setPhase('RING')

      store.resetCanvas()
      const state = useCanvasStore.getState()
      expect(state.currentDemonId).toBeNull()
      expect(state.currentPhase).toBe('SEAL')
      expect(state.completedConnections).toEqual([])
      expect(state.placedGlyphs).toEqual([])
      expect(state.ringResult).toBeNull()
    })
  })
})
