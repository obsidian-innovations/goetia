import { createStore } from 'zustand/vanilla'
import {
  createCorruptionState,
  addCorruption,
  isVessel,
  isFullyVessel,
  type CorruptionState,
  type CorruptionSource,
} from '@engine/corruption/CorruptionEngine'
import {
  getWhisperInterval,
  generateWhisper,
  type Whisper,
} from '@engine/corruption/WhisperEngine'
import type { VesselState } from '@engine/corruption/VesselState'

// ─── Store shape ───────────────────────────────────────────────────────────

interface CorruptionStoreState {
  corruption: CorruptionState
  vessel:     VesselState | null
  /** Whisper queued for display, or null if none pending */
  pendingWhisper: Whisper | null
  /** Timestamp of the last whisper display */
  lastWhisperAt: number
  /** Names of currently bound demons for whisper personalisation */
  boundDemonNames: string[]
}

interface CorruptionStoreActions {
  /** Add a corruption source to the state */
  addCorruption: (source: CorruptionSource) => void
  /** Override vessel state (set by server sync or vessel detection) */
  setVessel: (vessel: VesselState | null) => void
  /** Store a whisper to be shown by the UI */
  setWhisper: (whisper: Whisper) => void
  /** Clear the pending whisper after it has been displayed */
  clearWhisper: () => void
  /** Update the list of bound demon names (for whisper personalisation) */
  setBoundDemonNames: (names: string[]) => void
  /**
   * Tick: checks if a new whisper should be generated based on the
   * configured interval and corruption level.
   */
  tick: (now: number) => void
}

type CorruptionStore = CorruptionStoreState & CorruptionStoreActions

// ─── Store ─────────────────────────────────────────────────────────────────

export const useCorruptionStore = createStore<CorruptionStore>((set, get) => ({
  corruption:      createCorruptionState(),
  vessel:          null,
  pendingWhisper:  null,
  lastWhisperAt:   0,
  boundDemonNames: [],

  addCorruption(source: CorruptionSource) {
    set(state => ({
      corruption: addCorruption(state.corruption, source),
    }))
  },

  setVessel(vessel: VesselState | null) {
    set({ vessel })
  },

  setWhisper(whisper: Whisper) {
    set({ pendingWhisper: whisper, lastWhisperAt: Date.now() })
  },

  clearWhisper() {
    set({ pendingWhisper: null })
  },

  setBoundDemonNames(names: string[]) {
    set({ boundDemonNames: names })
  },

  tick(now: number) {
    const { corruption, lastWhisperAt, boundDemonNames } = get()
    if (corruption.level <= 0) return

    const interval = getWhisperInterval(corruption.level)
    if (now - lastWhisperAt >= interval) {
      const whisper = generateWhisper(corruption.level, boundDemonNames)
      set({ pendingWhisper: whisper, lastWhisperAt: now })
    }
  },
}))

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectCorruptionLevel  = (s: CorruptionStore) => s.corruption.level
export const selectCorruptionStage  = (s: CorruptionStore) => s.corruption.stage
export const selectIsVessel         = (s: CorruptionStore) => isVessel(s.corruption)
export const selectIsFullyVessel    = (s: CorruptionStore) => isFullyVessel(s.corruption)
export const selectPendingWhisper   = (s: CorruptionStore) => s.pendingWhisper
