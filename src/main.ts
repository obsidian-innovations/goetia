import './style.css'
import { Application } from 'pixi.js'
import { RitualCanvas } from './canvas/RitualCanvas'
import { UIManager } from './ui'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import { haptic } from './services/haptics'
import { audioManager } from './services/audio'

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
      useGrimoireStore.getState().saveSigil(sigil)
      haptic('sigilSettle')
      audioManager.play('sigilSettle')
      ui.showGrimoire()
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
