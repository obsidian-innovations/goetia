import './style.css'
import { Application } from 'pixi.js'
import { RitualCanvas } from './canvas/RitualCanvas'
import { UIManager } from './ui'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import { useChargingStore } from '@stores/chargingStore'
import { haptic } from './services/haptics'
import { audioManager } from './services/audio'
import { getDemon } from '@engine/demons/DemonRegistry'
import { generateDemand } from '@engine/demands/DemandEngine'
import { getNextGesture } from '@engine/charging/AttentionGesture'
import { SigilLifecycleManager } from '@engine/sigil/SigilLifecycle'

const lifecycleManager = new SigilLifecycleManager()

async function init(): Promise<void> {
  // ── UI overlay first — visible even if PixiJS fails ─────────────────────
  const ui = new UIManager()

  // Load grimoire from localStorage
  useGrimoireStore.getState().load()

  // Show demon select immediately so the user sees something
  ui.showDemonSelect()

  // ── PixiJS application ────────────────────────────────────────────────────
  const app = new Application()

  await app.init({
    background: 0x08070f,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
    hello: !import.meta.env.PROD,
  })

  const container = document.getElementById('app')
  if (container) {
    container.appendChild(app.canvas)
  }

  // ── Core objects ──────────────────────────────────────────────────────────
  const ritualCanvas = new RitualCanvas(app)

  // ── UI callbacks ──────────────────────────────────────────────────────────
  ui.setCallbacks({
    onDemonSelect(demonId: string) {
      ritualCanvas.setDemon(demonId)
    },

    onPhaseChange(phase) {
      ritualCanvas.setPhase(phase)
      ui.updatePhaseButtons(phase)
    },

    onBind() {
      const sigil = ritualCanvas.composeSigil()
      if (!sigil) {
        haptic('misfire')
        audioManager.play('misfire')
        return
      }

      // Transition to complete and persist
      const completedSigil = lifecycleManager.transition(sigil, 'complete')
      useGrimoireStore.getState().saveSigil(completedSigil)
      haptic('sigilSettle')
      audioManager.play('sigilSettle')

      // Start charging if a demon is selected
      const demonId = useCanvasStore.getState().currentDemonId
      if (demonId) {
        try {
          const demon = getDemon(demonId)
          useChargingStore.getState().startCharging(completedSigil, demon)

          // Generate initial demand
          const demand = generateDemand(demon, completedSigil.overallIntegrity)
          useChargingStore.getState().addDemand(demon.id, demand)

          ui.showCharging(demon.name)
          return
        } catch {
          // Fallback to grimoire view if demon lookup fails
        }
      }

      ui.showGrimoire()
    },

    onFulfillDemand(demandId: string) {
      useChargingStore.getState().fulfillDemand(demandId)
    },

    onIgnoreDemand(_demandId: string) {
      // Demand ignored — could trigger escalation in a future update
    },
  })

  // ── Store-driven feedback ─────────────────────────────────────────────────
  // Fires haptics/audio whenever relevant store slices change

  let prevConnCount = 0
  let prevGlyphCount = 0
  let hadRing = false

  useCanvasStore.subscribe((state) => {
    // Node connected
    if (state.completedConnections.length > prevConnCount) {
      prevConnCount = state.completedConnections.length
      haptic('nodeConnect')
      audioManager.play('nodeConnect')
    } else {
      prevConnCount = state.completedConnections.length
    }

    // Glyph recognised
    if (state.placedGlyphs.length > prevGlyphCount) {
      prevGlyphCount = state.placedGlyphs.length
      haptic('glyphRecognized')
      audioManager.play('glyphRecognized')
    } else {
      prevGlyphCount = state.placedGlyphs.length
    }

    // Ring completed
    if (!hadRing && state.ringResult !== null) {
      hadRing = true
      haptic('ringComplete')
      audioManager.play('ringComplete')
    } else if (state.ringResult === null) {
      hadRing = false
    }
  })

  // ── Charging tick loop ────────────────────────────────────────────────────
  // Runs every second to advance charge progress and update the UI
  const _chargingTick = setInterval(() => {
    const now = Date.now()
    useChargingStore.getState().tickAll(now)

    // Update charging UI if visible
    const charges = useChargingStore.getState().activeCharges
    const demands = useChargingStore.getState().activeDemands
    const demonId = useCanvasStore.getState().currentDemonId

    // Update progress for the first active charge tied to the current demon
    if (demonId) {
      for (const [, chargeState] of charges) {
        ui.updateChargingProgress(chargeState.chargeProgress)

        // Update attention gesture hint
        const gesture = getNextGesture(chargeState, demonId)
        ui.updateAttentionGesture(gesture)

        // Transition to awakened when fully charged
        if (chargeState.chargeProgress >= 1) {
          const pages = useGrimoireStore.getState().pages
          for (const page of pages) {
            for (const sigil of page.sigils) {
              if (sigil.id === chargeState.sigilId && sigil.status === 'complete') {
                useGrimoireStore.getState().updateSigilStatus(sigil.id, 'resting')
              }
            }
          }
          useChargingStore.getState().stopCharging(chargeState.sigilId)
        }
        break
      }

      // Update demands UI
      const demonDemands = demands.get(demonId) ?? []
      ui.updateDemands(demonDemands)
    }
  }, 1000)

  // Store interval ID for cleanup (attach to window for simplicity)
  ;(window as unknown as Record<string, unknown>)['_chargingTick'] = _chargingTick

  // ── Resize handler ────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    ritualCanvas.resize(app.screen.width, app.screen.height)
  })
}

init().catch((err) => {
  console.error(err)
  // Show the error on screen so it's not silently lost
  const msg = document.createElement('p')
  msg.textContent = `Init error: ${err instanceof Error ? err.message : String(err)}`
  msg.style.cssText =
    'color:#ff6666;text-align:center;margin-top:2rem;font-family:Georgia,serif;padding:0 1rem'
  document.body.appendChild(msg)
})
