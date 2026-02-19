import { createStore } from 'zustand/vanilla'
import type { Sigil, Demon } from '@engine/sigil/Types'
import {
  createChargingState,
  tick,
  registerAttention as engineRegisterAttention,
  type ChargingState,
} from '@engine/charging/ChargingEngine'
import type { DemonicDemand } from '@engine/demands/DemandEngine'

// ─── Store shape ───────────────────────────────────────────────────────────

interface ChargingStoreState {
  /** Active charging sessions keyed by sigilId */
  activeCharges: Map<string, ChargingState>
  /** Active demands keyed by demonId */
  activeDemands: Map<string, DemonicDemand[]>
}

interface ChargingStoreActions {
  /** Begin charging a sigil */
  startCharging: (sigil: Sigil, demon: Demon) => void
  /** Advance all active charges to the given timestamp */
  tickAll: (now: number) => void
  /** Record an attention gesture for a sigil */
  registerAttention: (sigilId: string, now: number) => void
  /** Mark a demand as fulfilled */
  fulfillDemand: (demandId: string) => void
  /** Add a demand for a demon */
  addDemand: (demonId: string, demand: DemonicDemand) => void
  /** Stop charging a sigil */
  stopCharging: (sigilId: string) => void
  /** Get the current charging state for a sigil (null if not active) */
  getChargingState: (sigilId: string) => ChargingState | null
}

type ChargingStore = ChargingStoreState & ChargingStoreActions

// ─── Initial state ─────────────────────────────────────────────────────────

const INITIAL_STATE: ChargingStoreState = {
  activeCharges: new Map(),
  activeDemands: new Map(),
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useChargingStore = createStore<ChargingStore>((set, get) => ({
  ...INITIAL_STATE,

  startCharging(sigil: Sigil, demon: Demon) {
    set(state => {
      const charges = new Map(state.activeCharges)
      charges.set(sigil.id, createChargingState(sigil.id, demon.rank))
      return { activeCharges: charges }
    })
  },

  tickAll(now: number) {
    set(state => {
      const charges = new Map(state.activeCharges)
      for (const [id, chargeState] of charges) {
        charges.set(id, tick(chargeState, now))
      }
      return { activeCharges: charges }
    })
  },

  registerAttention(sigilId: string, now: number) {
    set(state => {
      const charges = new Map(state.activeCharges)
      const existing = charges.get(sigilId)
      if (existing) {
        charges.set(sigilId, engineRegisterAttention(existing, now))
      }
      return { activeCharges: charges }
    })
  },

  fulfillDemand(demandId: string) {
    set(state => {
      const demands = new Map(state.activeDemands)
      for (const [demonId, list] of demands) {
        const updated = list.map(d =>
          d.id === demandId ? { ...d, fulfilled: true } : d,
        )
        demands.set(demonId, updated)
      }
      return { activeDemands: demands }
    })
  },

  addDemand(demonId: string, demand: DemonicDemand) {
    set(state => {
      const demands = new Map(state.activeDemands)
      const existing = demands.get(demonId) ?? []
      demands.set(demonId, [...existing, demand])
      return { activeDemands: demands }
    })
  },

  stopCharging(sigilId: string) {
    set(state => {
      const charges = new Map(state.activeCharges)
      charges.delete(sigilId)
      return { activeCharges: charges }
    })
  },

  getChargingState(sigilId: string): ChargingState | null {
    return get().activeCharges.get(sigilId) ?? null
  },
}))
