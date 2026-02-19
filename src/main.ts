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
import { useResearchStore } from '@stores/researchStore'
import { completedRitual, studiedSigil } from '@engine/research/ResearchActivities'
import { useWorldStore } from '@stores/worldStore'
import { getCurrentPosition, watchPosition, queryPermission } from './services/geolocation'
import { calculateInterference } from '@engine/world/Encounters'
import { usePvPStore } from '@stores/pvpStore'
import { networkService } from './services/network'

const lifecycleManager = new SigilLifecycleManager()

async function init(): Promise<void> {
  // ── UI overlay first — visible even if PixiJS fails ─────────────────────
  const ui = new UIManager()

  // Load grimoire and research from localStorage
  useGrimoireStore.getState().load()
  useResearchStore.getState().load()

  // Show demon select immediately so the user sees something
  ui.showDemonSelect()
  ui.refreshDemonGrid()

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
      // Apply partial seal geometry based on research progress
      const visibleGeom = useResearchStore.getState().getVisibleGeometry(demonId)
      ritualCanvas.setVisibleGeometry(visibleGeom)
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

      // Award research XP and record world ritual activity
      const demonId = useCanvasStore.getState().currentDemonId
      if (demonId) {
        const xp = completedRitual(completedSigil.overallIntegrity)
        useResearchStore.getState().addProgress(demonId, xp)
        ui.refreshDemonGrid()

        // Record ritual in the world engine (for thin place spawning)
        const playerPos = useWorldStore.getState().playerPosition
        if (playerPos) {
          useWorldStore.getState().recordRitual(playerPos, completedSigil.overallIntegrity, demonId)
        }
      }

      // Start charging if a demon is selected
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

    onStudySigil(_sigilId: string, demonId: string) {
      // Award research XP for studying a sigil (sigil object not needed; fixed XP)
      const page = useGrimoireStore.getState().getPageForDemon(demonId)
      const sigil = page?.sigils.find(s => s.id === _sigilId)
      if (sigil) {
        useResearchStore.getState().addProgress(demonId, studiedSigil(sigil))
        ui.refreshDemonGrid()
      }
    },

    onRequestLocation() {
      // Prompt for location and begin watching
      getCurrentPosition().then(pos => {
        if (pos) {
          useWorldStore.getState().setLocationPermission('granted')
          useWorldStore.getState().updatePosition(pos)
        }
      })
    },

    onCreateCoven(name: string) {
      usePvPStore.getState().createCoven(name)
      ui.updateCoven(usePvPStore.getState().covenState)
    },
  })

  // ── Geolocation setup ─────────────────────────────────────────────────────
  // Non-blocking: check permission and start watching if already granted.
  queryPermission().then(async (permission) => {
    useWorldStore.getState().setLocationPermission(permission)
    if (permission === 'granted') {
      const pos = await getCurrentPosition()
      if (pos) {
        useWorldStore.getState().updatePosition(pos)
      }
      watchPosition((pos) => {
        useWorldStore.getState().updatePosition(pos)
        useWorldStore.getState().setLocationPermission('granted')
      })
    }
  })

  // ── World store subscription ───────────────────────────────────────────────
  useWorldStore.subscribe((worldState) => {
    const { nearbyThinPlaces, currentThinPlace, playerPosition, locationPermission } = worldState
    ui.updateWorldState(nearbyThinPlaces, currentThinPlace, playerPosition, locationPermission)

    // Update distortion for active encounters
    const { activeEncounters } = worldState
    const activeEnc = activeEncounters.find(e => !e.bound)
    if (activeEnc) {
      const fx = calculateInterference(activeEnc)
      ritualCanvas.setDistortionIntensity(fx.sealAlphaReduction)
    } else {
      ritualCanvas.setDistortionIntensity(0)
    }
  })

  // ── PvP store subscription ─────────────────────────────────────────────────
  usePvPStore.subscribe((pvpState) => {
    ui.updatePvP(pvpState.activeHexes, pvpState.activeWards)
    ui.updateCoven(pvpState.covenState)
    if (pvpState.lastClashResult) {
      ui.updateClashResult(pvpState.lastClashResult, 'Attacker', 'Defender', 0, 0)
    }
  })

  // ── Network callbacks ──────────────────────────────────────────────────────
  networkService.setCallbacks({
    onClashResult(result, _challengeId) {
      usePvPStore.getState().setLastClashResult(result)
      ui.showClash()
    },
    onIncomingHex(hex) {
      usePvPStore.getState().receiveIncomingHex(hex)
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
    const chargeMultiplier = useWorldStore.getState().getChargeMultiplier()
    useChargingStore.getState().tickAll(now, chargeMultiplier)
    // Tick world decay as well
    useWorldStore.getState().tick(now)

    // Tick PvP (expire old hexes/wards)
    usePvPStore.getState().tick(now)

    // Update charging UI if visible
    const charges = useChargingStore.getState().activeCharges
    const demands = useChargingStore.getState().activeDemands
    const demonId = useCanvasStore.getState().currentDemonId

    // Update thin place indicator on charging screen
    const { currentThinPlace } = useWorldStore.getState()
    ui.updateChargingThinPlace(currentThinPlace, chargeMultiplier)

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
