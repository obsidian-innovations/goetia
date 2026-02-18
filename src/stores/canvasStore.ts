import { createStore } from 'zustand/vanilla'
import type {
  ConnectionResult,
  GlyphId,
  IntentCoherenceResult,
  PlacedGlyph,
  RingResult,
  Sigil,
} from '@engine/sigil/Types'

// ─── Drawing phase ─────────────────────────────────────────────────────────

export type DrawingPhase = 'SEAL' | 'GLYPH' | 'RING'

// ─── Store shape ───────────────────────────────────────────────────────────

interface CanvasState {
  currentDemonId: string | null
  currentPhase: DrawingPhase
  completedConnections: ConnectionResult[]
  sealIntegrity: number
  placedGlyphs: PlacedGlyph[]
  coherenceResult: IntentCoherenceResult | null
  ringResult: RingResult | null
  composedSigil: Sigil | null
}

interface CanvasActions {
  selectDemon: (demonId: string) => void
  addConnection: (connection: ConnectionResult) => void
  updateSealIntegrity: (integrity: number) => void
  addGlyph: (glyph: PlacedGlyph) => void
  removeGlyph: (glyphId: GlyphId) => void
  setCoherence: (result: IntentCoherenceResult) => void
  setRingResult: (result: RingResult) => void
  setPhase: (phase: DrawingPhase) => void
  setComposedSigil: (sigil: Sigil) => void
  resetCanvas: () => void
}

type CanvasStore = CanvasState & CanvasActions

// ─── Initial state ─────────────────────────────────────────────────────────

const INITIAL_STATE: CanvasState = {
  currentDemonId: null,
  currentPhase: 'SEAL',
  completedConnections: [],
  sealIntegrity: 0,
  placedGlyphs: [],
  coherenceResult: null,
  ringResult: null,
  composedSigil: null,
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useCanvasStore = createStore<CanvasStore>((set) => ({
  ...INITIAL_STATE,

  selectDemon(demonId: string) {
    set({ ...INITIAL_STATE, currentDemonId: demonId })
  },

  addConnection(connection: ConnectionResult) {
    set(state => ({
      completedConnections: [...state.completedConnections, connection],
    }))
  },

  updateSealIntegrity(integrity: number) {
    set({ sealIntegrity: integrity })
  },

  addGlyph(glyph: PlacedGlyph) {
    // Deduplicate: replace any existing glyph with the same id
    set(state => ({
      placedGlyphs: [
        ...state.placedGlyphs.filter(g => g.glyphId !== glyph.glyphId),
        glyph,
      ],
    }))
  },

  removeGlyph(glyphId: GlyphId) {
    set(state => ({
      placedGlyphs: state.placedGlyphs.filter(g => g.glyphId !== glyphId),
    }))
  },

  setCoherence(result: IntentCoherenceResult) {
    set({ coherenceResult: result })
  },

  setRingResult(result: RingResult) {
    set({ ringResult: result })
  },

  setPhase(phase: DrawingPhase) {
    set({ currentPhase: phase })
  },

  setComposedSigil(sigil: Sigil) {
    set({ composedSigil: sigil })
  },

  resetCanvas() {
    set(INITIAL_STATE)
  },
}))
