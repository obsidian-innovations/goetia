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
import { useCorruptionStore } from '@stores/corruptionStore'
import { getCorruptionAmount } from '@engine/corruption/CorruptionEngine'
import { calculateMisfire } from '@engine/pvp/MisfireEngine'
import { createHoldWindowState, isCollapsed } from '@engine/charging/HoldWindow'
import { createVesselState } from '@engine/corruption/VesselState'
import { attemptPurification } from '@engine/corruption/PurificationEngine'

const lifecycleManager = new SigilLifecycleManager()

/** Hold window states for fully charged sigils, keyed by sigilId */
const holdWindows = new Map<string, import('@engine/charging/HoldWindow').HoldWindowState>()

/** Look up a sigil and its demon from the grimoire by sigilId. */
function findSigilWithDemon(sigilId: string): { sigil: import('@engine/sigil/Types').Sigil; demon: import('@engine/sigil/Types').Demon } | null {
  const pages = useGrimoireStore.getState().pages
  for (const page of pages) {
    const sigil = page.sigils.find(s => s.id === sigilId)
    if (sigil) {
      try {
        return { sigil, demon: getDemon(page.demonId) }
      } catch { return null }
    }
  }
  return null
}

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
      // Reset canvas state from any previous ritual
      useCanvasStore.getState().resetCanvas()
      ritualCanvas.setDemon(demonId)
      // Apply partial seal geometry based on research progress
      const visibleGeom = useResearchStore.getState().getVisibleGeometry(demonId)
      ritualCanvas.setVisibleGeometry(visibleGeom)
    },

    onPhaseChange(phase) {
      ritualCanvas.setPhase(phase)
      ui.updatePhaseButtons(phase)
    },

    onDifficultyChange(difficulty) {
      ritualCanvas.setGlyphDifficulty(difficulty)
      useCanvasStore.getState().setGlyphDifficulty(difficulty)
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

          // Casting a sigil adds corruption proportional to the demon's rank
          const castAmount = getCorruptionAmount('sigil_cast', demon.rank)
          useCorruptionStore.getState().addCorruption({ type: 'sigil_cast', amount: castAmount, timestamp: Date.now() })

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
      // Ignoring a demand adds corruption based on the current demon's rank
      const demonId = useCanvasStore.getState().currentDemonId
      if (demonId) {
        try {
          const demon = getDemon(demonId)
          const amount = getCorruptionAmount('demand_ignored', demon.rank)
          useCorruptionStore.getState().addCorruption({ type: 'demand_ignored', amount, timestamp: Date.now() })
        } catch { /* demon not found */ }
      }
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

    onCastHex(targetLabel: string, sigilId: string) {
      const found = findSigilWithDemon(sigilId)
      if (!found) return
      const hex = usePvPStore.getState().castHex(targetLabel, found.sigil, found.demon)
      networkService.sendHex(targetLabel, hex)
      haptic('sigilSettle')
      audioManager.play('sigilSettle')
    },

    onCastWard(sigilId: string) {
      const found = findSigilWithDemon(sigilId)
      if (!found) return
      usePvPStore.getState().castWard(found.sigil, found.demon)
      haptic('sigilSettle')
      audioManager.play('sigilSettle')
    },

    onCreateCoven(name: string) {
      usePvPStore.getState().createCoven(name)
      ui.updateCoven(usePvPStore.getState().covenState)
    },

    onAttemptPurification() {
      const vessel = useCorruptionStore.getState().vessel
      if (!vessel) return

      // Use the best available sigil's integrity for the purification attempt
      const pages = useGrimoireStore.getState().pages
      let bestIntegrity = 0
      for (const page of pages) {
        for (const sigil of page.sigils) {
          if (sigil.overallIntegrity > bestIntegrity) {
            bestIntegrity = sigil.overallIntegrity
          }
        }
      }

      const result = attemptPurification(
        { purifierId: 'local', targetVesselId: vessel.playerId, sealIntegrity: bestIntegrity },
        vessel,
      )

      if (result.outcome === 'success') {
        // Reset corruption to 0.30 and clear vessel
        useCorruptionStore.getState().setVessel(null)
        // Corruption engine doesn't have a "set level" — add a negative source to approximate
        // For now, the purification narrative indicates recovery
        haptic('sigilSettle')
        audioManager.play('sigilSettle')
      } else {
        // Failed purification adds corruption to the purifier
        useCorruptionStore.getState().addCorruption({
          type: 'purification_failed',
          amount: result.purifierCorruptionGain,
          timestamp: Date.now(),
        })
        haptic('misfire')
        audioManager.play('misfire')
      }
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
  let _prevThinPlaceId: string | null = null
  useWorldStore.subscribe((worldState) => {
    const { nearbyThinPlaces, currentThinPlace, playerPosition, locationPermission } = worldState
    ui.updateWorldState(nearbyThinPlaces, currentThinPlace, playerPosition, locationPermission)

    // Roll for an encounter when entering a new thin place
    // Update _prevThinPlaceId BEFORE rollEncounter to prevent re-entrant subscribe loop
    const enteredNewPlace = currentThinPlace && currentThinPlace.id !== _prevThinPlaceId
    _prevThinPlaceId = currentThinPlace?.id ?? null
    if (enteredNewPlace) {
      useWorldStore.getState().rollEncounter(currentThinPlace)
    }

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
  let _prevClashResult: import('@engine/pvp/ClashResolver').ClashResult | null = null
  let distortionTimer: ReturnType<typeof setTimeout> | null = null
  usePvPStore.subscribe((pvpState) => {
    ui.updatePvP(pvpState.activeHexes, pvpState.activeWards)
    ui.updateCoven(pvpState.covenState)
    if (pvpState.lastClashResult) {
      ui.updateClashResult(pvpState.lastClashResult, 'Attacker', 'Defender', 0, 0)

      // Apply misfire effects when a new clash result arrives and defender won
      if (pvpState.lastClashResult !== _prevClashResult && pvpState.lastClashResult.winner === 'defender') {
        // TODO: ClashResult doesn't carry a hex reference — use the first outgoing
        // hex as a best-effort proxy. Proper fix requires adding hexId to ClashResult.
        const outgoingHex = pvpState.activeHexes.find(h => h.type === 'hex')
        if (outgoingHex) {
          const misfire = calculateMisfire(outgoingHex.sigil, pvpState.lastClashResult)
          useCorruptionStore.getState().addCorruption({
            type: 'hex_rebound',
            amount: misfire.corruptionGain,
            timestamp: Date.now(),
          })
          if (misfire.effects.includes('canvas_distortion')) {
            if (distortionTimer) clearTimeout(distortionTimer)
            ritualCanvas.setDistortionIntensity(misfire.severity * 0.5)
            distortionTimer = setTimeout(() => {
              ritualCanvas.setDistortionIntensity(0)
              distortionTimer = null
            }, 5000)
          }
          haptic('misfire')
          audioManager.play('misfire')
        }
      }
    }
    _prevClashResult = pvpState.lastClashResult
  })

  // ── Corruption store subscription ─────────────────────────────────────────
  let _wasVessel = false
  useCorruptionStore.subscribe((corruptionState) => {
    const { level, stage } = corruptionState.corruption
    ui.updateCorruption(level, stage)

    // Show whisper if one is queued
    if (corruptionState.pendingWhisper) {
      const w = corruptionState.pendingWhisper
      ui.showWhisper(w.text, w.intensity)
      useCorruptionStore.getState().clearWhisper()
    }

    // Show vessel warning once when transitioning to vessel
    const isVesselNow = level >= 1.0
    if (isVesselNow && !_wasVessel) {
      ui.showVesselWarning()

      // Create vessel state for PvP encounter system
      const playerPos = useWorldStore.getState().playerPosition
      const latLng = playerPos ? { lat: playerPos.lat, lng: playerPos.lng } : null
      // Gather bound demons from active charges
      const boundDemons: import('@engine/sigil/Types').Demon[] = []
      const charges = useChargingStore.getState().activeCharges
      for (const [, chargeState] of charges) {
        try { boundDemons.push(getDemon(chargeState.demonId)) } catch { /* ignore */ }
      }
      const vessel = createVesselState('local', latLng, boundDemons, 0.5, Date.now())
      useCorruptionStore.getState().setVessel(vessel)
    }
    _wasVessel = isVesselNow
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

    // Tick corruption (whisper generation)
    useCorruptionStore.getState().tick(now)

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

        // Transition to resting when fully charged and start hold window
        if (chargeState.chargeProgress >= 1) {
          const pages = useGrimoireStore.getState().pages
          for (const page of pages) {
            for (const sigil of page.sigils) {
              if (sigil.id === chargeState.sigilId && sigil.status === 'complete') {
                useGrimoireStore.getState().updateSigilStatus(sigil.id, 'resting')
                // Start hold window timer for this sigil
                holdWindows.set(sigil.id, createHoldWindowState(sigil, now))
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

    // ── Hold window destabilisation check ──────────────────────────────────
    for (const [sigilId, holdState] of holdWindows) {
      if (isCollapsed(holdState, now)) {
        // Sigil has fully destabilised — mark as spent
        useGrimoireStore.getState().updateSigilStatus(sigilId, 'spent')
        holdWindows.delete(sigilId)
      }
    }

    // ── Track bound demons for whisper personalisation ─────────────────────
    const boundNames: string[] = []
    for (const [, chargeState] of charges) {
      try {
        boundNames.push(getDemon(chargeState.demonId).name)
      } catch { /* ignore */ }
    }
    // Only update if the list actually changed to avoid triggering subscribers
    const prevNames = useCorruptionStore.getState().boundDemonNames
    const namesChanged = boundNames.length !== prevNames.length ||
      boundNames.some((n, i) => n !== prevNames[i])
    if (namesChanged) {
      useCorruptionStore.getState().setBoundDemonNames(boundNames)
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
