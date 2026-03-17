import './style.css'
import { Application } from 'pixi.js'
import { RitualCanvas } from './canvas/RitualCanvas'
import { UIManager } from './ui'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import { useChargingStore } from '@stores/chargingStore'
import { haptic } from './services/haptics'
import { audioManager } from './services/audio'
import { getDemon, listDemons } from '@engine/demons/DemonRegistry'
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
import { detectInvertedRite, composeInvertedSigil, evaluateBrokenRite } from '@engine/sigil/InvertedRiteEngine'
import { getVesselPerspective, generateVesselWhisper } from '@engine/corruption/VesselPerspective'
import type { PermanentScar } from '@engine/corruption/PurificationEngine'
import { getBestSigil, createGrimoireMemory, recordRitual, tickGrimoire, findResonances, calculateCorruptionSpread, tickFeral, generateFeralWhisper } from '@engine/grimoire'
import { getTemporalModifiers } from '@engine/temporal/TemporalEngine'
import type { TemporalModifiers } from '@engine/temporal/TemporalEngine'
import { processDecayBatch } from '@engine/sigil/DecayEngine'
import { processDreamBatch } from '@engine/sigil/DreamEngine'
import type { Sigil } from '@engine/sigil/Types'
import { createDefaultConditions, luminanceToDarkness, audioLevelToSilence, calculateConditionModifiers } from '@engine/ritual/ConditionsEngine'
import type { RitualConditions } from '@engine/ritual/ConditionsEngine'
import { analyzeFrame, getScryingTrigger } from '@engine/scrying/ScryingEngine'
import { startMicrophone, stopMicrophone, analyzeAudioLevel, isMicrophoneActive } from './services/microphone'
import { startCamera as startCameraService, stopCamera as stopCameraService, captureFrame } from './services/camera'

const lifecycleManager = new SigilLifecycleManager()

/** Current temporal modifiers — recomputed each tick. */
let currentTemporalMods: TemporalModifiers = getTemporalModifiers(Date.now())

/** Hold window states for fully charged sigils, keyed by sigilId */
const holdWindows = new Map<string, import('@engine/charging/HoldWindow').HoldWindowState>()

/** Counter for decay/dream processing — runs every 60 ticks (60 seconds). */
let decayTickCounter = 0

/** Counter for grimoire behavior ticks — runs every 300 ticks (5 minutes). */
let grimoireTickCounter = 0

/** Permanent scars from purification — persists for session. */
let permanentScars: PermanentScar[] = []

/** Current ritual conditions — updated from sensors each tick. */
let currentConditions: RitualConditions = createDefaultConditions()

/** Video element for camera scrying (created when camera mode is active). */
let scryingVideo: HTMLVideoElement | null = null
let scryingStream: MediaStream | null = null

/** Collect bound demons from active charging sessions. */
function collectBoundDemons(): { ids: string[]; demons: import('@engine/sigil/Types').Demon[] } {
  const ids: string[] = []
  const demons: import('@engine/sigil/Types').Demon[] = []
  for (const [, cs] of useChargingStore.getState().activeCharges) {
    try {
      const d = getDemon(cs.demonId)
      ids.push(d.id)
      demons.push(d)
    } catch { /* ignore */ }
  }
  return { ids, demons }
}

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

/** Flatten all sigils from grimoire pages into a single array. */
function collectAllSigils(pages: import('@db/grimoire').GrimoirePage[]): Sigil[] {
  const out: Sigil[] = []
  for (const page of pages) {
    for (const sigil of page.sigils) out.push(sigil)
  }
  return out
}

/** Run dream processing for all eligible sigils. */
function processDreams(now: number): void {
  const store = useGrimoireStore.getState()
  const demonDomains: Record<string, import('@engine/sigil/Types').DemonDomain[]> = {}
  for (const page of store.pages) {
    try {
      demonDomains[page.demonId] = getDemon(page.demonId).domains
    } catch { /* ignore */ }
  }
  const corruptionLevel = useCorruptionStore.getState().corruption.level
  const { updatedSigils, updatedDreamStates, statesChanged } = processDreamBatch(
    collectAllSigils(store.pages), store.dreamStates, now, corruptionLevel, demonDomains,
  )
  if (statesChanged) {
    useGrimoireStore.getState().applyDreamBatch(updatedSigils, updatedDreamStates)
  }
}

/** Run grimoire behavior tick (whispers, page reorder, bleedthrough, suggestions). */
function processGrimoire(now: number, ui: UIManager): void {
  const store = useGrimoireStore.getState()
  const memory = store.grimoireMemory
  if (!memory) return

  const result = tickGrimoire(memory, store.pages, store.familiarityStates, now)
  if (result.memory !== memory) {
    store.saveMemory(result.memory)
  }

  // Route grimoire whisper through corruption whisper UI
  if (result.behavior?.type === 'whisper') {
    ui.showWhisper(result.behavior.data.text as string, 'medium')
  }
}

async function init(): Promise<void> {
  // ── UI overlay first — visible even if PixiJS fails ─────────────────────
  const ui = new UIManager()

  // Load grimoire and research from localStorage
  useGrimoireStore.getState().load()
  useResearchStore.getState().load()

  // Process any accumulated dreams since last session
  processDreams(Date.now())

  // Show demon select immediately so the user sees something
  ui.showDemonSelect()
  ui.refreshDemonGrid()

  // ── PixiJS application ────────────────────────────────────────────────────
  const app = new Application()

  await app.init({
    background: 0x08070f,
    backgroundAlpha: 0,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
    hello: !import.meta.env.PROD,
  })

  const container = document.getElementById('app')
  if (container) {
    container.appendChild(app.canvas)
    ui.setAppContainer(container)
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
      let sigil = ritualCanvas.composeSigil()
      if (!sigil) {
        haptic('misfire')
        audioManager.play('misfire')
        return
      }

      // Check for inverted rite (RING before SEAL)
      const { phaseHistory } = useCanvasStore.getState()
      let invertedCorruptionMultiplier = 1.0
      if (detectInvertedRite(phaseHistory)) {
        const invertedResult = composeInvertedSigil(sigil)
        sigil = invertedResult.sigil
        invertedCorruptionMultiplier = invertedResult.corruptionMultiplier
      }

      // Check for broken rite (weak seal + ring = sacrificial purification)
      const brokenRite = evaluateBrokenRite(
        sigil.sealIntegrity,
        sigil.bindingRing?.overallStrength ?? 0,
      )
      if (brokenRite) {
        // Apply corruption reduction from the sacrificial rite
        useCorruptionStore.getState().addCorruption({
          type: 'sigil_cast',
          amount: -brokenRite.corruptionReduction,
          timestamp: Date.now(),
        })
      }

      // Transition to complete and persist
      const completedSigil = lifecycleManager.transition(sigil, 'complete')
      useGrimoireStore.getState().saveSigil(completedSigil)
      haptic('sigilSettle')
      audioManager.play('sigilSettle')

      // Award research XP and record world ritual activity
      const demonId = useCanvasStore.getState().currentDemonId

      // Record ritual in grimoire memory (palimpsest)
      {
        const gStore = useGrimoireStore.getState()
        const mem = gStore.grimoireMemory ?? createGrimoireMemory(Date.now())
        let domains: import('@engine/sigil/Types').DemonDomain[] = []
        if (demonId) { try { domains = getDemon(demonId).domains } catch { /* unknown demon */ } }
        const corruptionLevel = useCorruptionStore.getState().corruption.level
        gStore.saveMemory(recordRitual(mem, domains, corruptionLevel))
      }
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

          // Record familiarity interaction
          useGrimoireStore.getState().recordFamiliarity(demonId, 'ritual_complete')

          // Generate initial demand (with familiarity personalization)
          const famTier = useGrimoireStore.getState().familiarityStates[demonId]?.tier
          const demand = generateDemand(demon, completedSigil.overallIntegrity, famTier)
          useChargingStore.getState().addDemand(demon.id, demand)

          // Casting a sigil adds corruption proportional to the demon's rank (scaled by temporal modifiers)
          const castAmount = getCorruptionAmount('sigil_cast', demon.rank) * currentTemporalMods.corruptionMultiplier * invertedCorruptionMultiplier
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
      // Find which demon this demand belongs to and record familiarity
      const demonId = useCanvasStore.getState().currentDemonId
      if (demonId) useGrimoireStore.getState().recordFamiliarity(demonId, 'demand_fulfilled')
    },

    onIgnoreDemand(_demandId: string) {
      // Ignoring a demand adds corruption based on the current demon's rank
      const demonId = useCanvasStore.getState().currentDemonId
      if (demonId) {
        useGrimoireStore.getState().recordFamiliarity(demonId, 'demand_ignored')
        try {
          const demon = getDemon(demonId)
          const amount = getCorruptionAmount('demand_ignored', demon.rank) * currentTemporalMods.corruptionMultiplier
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
        useGrimoireStore.getState().recordFamiliarity(demonId, 'study')
        ui.refreshDemonGrid()
      }
    },

    onRequestLocation() {
      // Prompt for location and begin watching
      getCurrentPosition().then(pos => {
        if (pos) {
          useWorldStore.getState().setLocationPermission('granted')
          useWorldStore.getState().updatePosition(pos)
          watchPosition((p) => {
            useWorldStore.getState().updatePosition(p)
            useWorldStore.getState().setLocationPermission('granted')
          })
        }
      })
    },

    onCastHex(targetLabel: string, sigilId: string) {
      const found = findSigilWithDemon(sigilId)
      if (!found) return
      const hex = usePvPStore.getState().castHex(targetLabel, found.sigil, found.demon)
      networkService.sendHex(targetLabel, hex)
      useGrimoireStore.getState().recordFamiliarity(found.demon.id, 'hex_cast')
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

    onEnterCameraMode() {
      ritualCanvas.enterCameraMode()
      // Start camera stream for scrying analysis
      startCameraService('environment').then(stream => {
        if (!stream) return
        scryingStream = stream
        scryingVideo = document.createElement('video')
        scryingVideo.srcObject = stream
        scryingVideo.play().catch(() => {})
      })
    },

    onExitCameraMode() {
      ritualCanvas.exitCameraMode()
      if (scryingStream) {
        stopCameraService(scryingStream)
        scryingStream = null
        scryingVideo = null
      }
    },

    onToggleMicrophone() {
      if (isMicrophoneActive()) {
        stopMicrophone()
      } else {
        startMicrophone()
      }
    },

    onAttemptPurification() {
      const vessel = useCorruptionStore.getState().vessel
      if (!vessel) return

      // Use the best available sigil's integrity for the purification attempt
      const pages = useGrimoireStore.getState().pages
      const best = getBestSigil(pages)
      const bestIntegrity = best?.overallIntegrity ?? 0

      const result = attemptPurification(
        { purifierId: 'local', targetVesselId: vessel.playerId, sealIntegrity: bestIntegrity },
        vessel,
      )

      if (result.outcome === 'success') {
        // Reset corruption to 0.30 and clear vessel
        useCorruptionStore.getState().setVessel(null)
        // Persist permanent scars for vessel perspective (post-purification flicker etc.)
        permanentScars = result.permanentScars
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
        const clashHexId = pvpState.lastClashResult!.hexId
        const outgoingHex = clashHexId
          ? pvpState.activeHexes.find(h => h.id === clashHexId)
            ?? pvpState.activeHexes.find(h => h.type === 'hex')
          : pvpState.activeHexes.find(h => h.type === 'hex')
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
    ritualCanvas.setCorruptionLevel(level)

    // Show whisper if one is queued
    if (corruptionState.pendingWhisper) {
      const w = corruptionState.pendingWhisper
      ui.showWhisper(w.text, w.intensity)
      useCorruptionStore.getState().clearWhisper()
    }

    // Compute vessel perspective (UI label replacements at high corruption)
    if (level >= 0.70 || permanentScars.length > 0) {
      const { ids: boundDemonIds, demons: boundDemons } = collectBoundDemons()
      const perspective = getVesselPerspective(level, boundDemonIds, boundDemons, permanentScars)
      ui.setVesselPerspective(perspective)

      // Vessel whisper at high corruption
      if (perspective.isActive && Math.random() < 0.15) {
        const dominantName = perspective.dominantDemonId
          ? boundDemons.find(d => d.id === perspective.dominantDemonId)?.name
          : undefined
        ui.showWhisper(generateVesselWhisper(dominantName), 'high')
      }
    }

    // Show vessel warning once when transitioning to vessel
    const isVesselNow = level >= 1.0
    if (isVesselNow && !_wasVessel) {
      ui.showVesselWarning()

      // Create vessel state for PvP encounter system
      const playerPos = useWorldStore.getState().playerPosition
      const latLng = playerPos ? { lat: playerPos.lat, lng: playerPos.lng } : null
      const vessel = createVesselState('local', latLng, collectBoundDemons().demons, 0.5, Date.now())
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

    // Compute temporal modifiers (moon phase, witching hour, etc.)
    currentTemporalMods = getTemporalModifiers(now)
    ui.updateTemporalState(currentTemporalMods)

    const worldChargeMultiplier = useWorldStore.getState().getChargeMultiplier()
    const chargeMultiplier = worldChargeMultiplier * currentTemporalMods.chargeMultiplier
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

        // Drive the charging canvas overlay
        ritualCanvas.setChargingVisible(true)
        ritualCanvas.setChargeProgress(chargeState.chargeProgress)
        ritualCanvas.setChargingDecay(now - chargeState.lastAttentionAt > 60_000)

        // Update attention gesture hint
        const gesture = getNextGesture(chargeState, demonId)
        ui.updateAttentionGesture(gesture)

        // Transition to resting when fully charged and start hold window
        if (chargeState.chargeProgress >= 1) {
          useGrimoireStore.getState().recordFamiliarity(chargeState.demonId, 'charge_complete')
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
          ritualCanvas.setChargingVisible(false)
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

    // ── Ritual conditions (every tick) ─────────────────────────────────────
    {
      const worldState = useWorldStore.getState()

      // Update audio from microphone
      const audio = analyzeAudioLevel()
      if (audio) {
        currentConditions.silence = audioLevelToSilence(audio.level)
        currentConditions.rhythmic = audio.isRhythmic
      }

      // Update multipliers
      currentConditions.thinPlaceMultiplier = worldState.getChargeMultiplier()
      currentConditions.temporalMultiplier = currentTemporalMods.chargeMultiplier

      // Camera scrying (only when camera mode is active)
      if (scryingVideo && scryingVideo.readyState >= 2) {
        const frame = captureFrame(scryingVideo)
        if (frame) {
          const analysis = analyzeFrame(frame.width, frame.height, frame.data)
          currentConditions.darkness = luminanceToDarkness(analysis.avgLuminance)

          // Check for scrying triggers
          const corruptionLevel = useCorruptionStore.getState().corruption.level
          const scrying = getScryingTrigger(analysis, corruptionLevel)
          if (scrying.triggerType && scrying.loreText) {
            const intensity = scrying.triggerType === 'veil_reveal' ? 'high' as const : 'medium' as const
            ui.showWhisper(scrying.loreText, intensity)
          }
        }
      }

      // Apply condition modifiers to ritual canvas
      const mods = calculateConditionModifiers(currentConditions)
      ritualCanvas.setConditionModifiers(mods)
    }

    // ── Sigil decay (every 60 seconds) ────────────────────────────────────
    decayTickCounter++
    if (decayTickCounter >= 60) {
      decayTickCounter = 0
      const grimoireState = useGrimoireStore.getState()
      const allSigils = collectAllSigils(grimoireState.pages)
      const decayStates = grimoireState.decayStates
      const { updatedSigils, updatedDecayStates } = processDecayBatch(
        allSigils, decayStates, now, currentTemporalMods,
      )
      if (updatedSigils.length > 0) {
        useGrimoireStore.getState().applyDecayBatch(updatedSigils, updatedDecayStates)
      } else if (Object.keys(updatedDecayStates).length !== Object.keys(decayStates).length) {
        // New decay states created (no sigils decayed yet, but states need persisting)
        useGrimoireStore.getState().applyDecayBatch([], updatedDecayStates)
      }

      // Process sigil dreams on the same 60-second cadence
      processDreams(now)

      // ── Sympathetic harmonics: compute resonances and apply effects ──────
      {
        const gState = useGrimoireStore.getState()
        if (gState.pages.length > 0) {
          const allDemons = listDemons()
          const resonances = findResonances(gState.pages, allDemons)

          if (resonances.length > 0) {
            const corruptionSpread = calculateCorruptionSpread(resonances, gState.pages)
            if (corruptionSpread > 0) {
              useCorruptionStore.getState().addCorruption({
                type: 'sigil_cast',
                amount: corruptionSpread * 0.01, // Scale down for 60s tick
                timestamp: now,
              })
            }
          }
        }
      }

      // ── Feral sigil processing ──────────────────────────────────────────
      {
        const gState = useGrimoireStore.getState()
        const feralResult = tickFeral(allSigils, gState.feralStates, now)
        if (feralResult.statesChanged) {
          gState.saveFeralStates(feralResult.updatedStates)
        }
        if (feralResult.wildEvent) {
          ui.showWhisper(feralResult.wildEvent.description, 'high')
        }
        if (feralResult.feralCount > 0 && Math.random() < 0.1) {
          ui.showWhisper(generateFeralWhisper(), 'medium')
        }
      }
    }

    // ── Grimoire behavior tick (every 300 seconds / 5 minutes) ────────────
    grimoireTickCounter++
    if (grimoireTickCounter >= 300) {
      grimoireTickCounter = 0
      processGrimoire(now, ui)
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
