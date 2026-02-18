import { listDemons } from '@engine/demons/DemonRegistry'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import type { DrawingPhase } from '@stores/canvasStore'
import type { Demon, Sigil, SigilVisualState } from '@engine/sigil/Types'

// ─── Callbacks injected from main ────────────────────────────────────────────

export interface UICallbacks {
  onDemonSelect: (demonId: string) => void
  onPhaseChange: (phase: DrawingPhase) => void
  onBind: () => void
}

// ─── Visual-state colour map ──────────────────────────────────────────────────

const VISUAL_STATE_COLORS: Record<SigilVisualState, string> = {
  charged:  '#cc88ff',
  healthy:  '#88bbff',
  unstable: '#ffaa44',
  corrupted:'#ff4444',
  dormant:  '#556677',
}

// ─── CSS injected once ────────────────────────────────────────────────────────

const STYLE = `
  #goetia-ui {
    position: fixed; inset: 0;
    pointer-events: none;
    font-family: 'Georgia', serif;
    color: #ddd;
    display: flex; flex-direction: column;
  }
  #goetia-ui * { box-sizing: border-box; }
  .screen { display: none; width: 100%; height: 100%; flex-direction: column; }
  .screen.active { display: flex; }

  /* ── Demon Select ── */
  #screen-demon { background: rgba(8,7,15,0.93); pointer-events: all; }
  #screen-demon h1 {
    text-align: center; font-size: 1.4rem; letter-spacing: 0.15em;
    margin: 1rem 0 0.4rem; color: #bb88ee; text-transform: uppercase;
  }
  #demon-grid {
    display: grid; grid-template-columns: repeat(3,1fr);
    gap: 0.75rem; padding: 0.75rem; flex: 1; overflow-y: auto;
  }
  .demon-card {
    background: rgba(60,20,90,0.5); border: 1px solid #441166;
    border-radius: 8px; padding: 0.75rem 0.5rem; cursor: pointer;
    text-align: center; transition: background 0.2s, border-color 0.2s;
    display: flex; flex-direction: column; gap: 0.25rem;
  }
  .demon-card:hover { background: rgba(90,30,140,0.7); border-color: #7733aa; }
  .demon-card .d-name { font-size: 1rem; color: #ddc0ff; }
  .demon-card .d-rank { font-size: 0.7rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  .demon-card .d-legions { font-size: 0.65rem; color: #665577; }
  #records-btn {
    margin: 0.75rem auto; padding: 0.5rem 2rem;
    background: transparent; border: 1px solid #442255;
    color: #997799; border-radius: 4px; cursor: pointer; letter-spacing: 0.1em;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase;
    transition: border-color 0.2s, color 0.2s;
  }
  #records-btn:hover { border-color: #8844aa; color: #cc88ff; }

  /* ── Ritual Canvas overlay ── */
  #screen-ritual { pointer-events: none; justify-content: space-between; }
  #ritual-header {
    padding: 0.6rem 1rem; display: flex; align-items: center; gap: 0.5rem;
    background: linear-gradient(to bottom, rgba(8,7,15,0.8) 0%, transparent 100%);
    pointer-events: all;
  }
  #back-btn {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #back-btn:hover { border-color: #7733aa; color: #cc88ff; }
  #demon-name-label { flex: 1; text-align: center; color: #bb88ee; letter-spacing: 0.12em; font-size: 0.9rem; }
  #ritual-toolbar {
    padding: 0.75rem 1rem 1.25rem; display: flex; gap: 0.5rem; justify-content: center; align-items: center;
    background: linear-gradient(to top, rgba(8,7,15,0.85) 0%, transparent 100%);
    pointer-events: all;
  }
  .phase-btn {
    padding: 0.45rem 1.1rem; border: 1px solid #442255; background: rgba(30,10,50,0.7);
    color: #997799; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;
    transition: all 0.2s;
  }
  .phase-btn.active { border-color: #aa66ff; background: rgba(80,20,130,0.7); color: #ddb8ff; }
  .phase-btn:hover:not(.active) { border-color: #7733aa; color: #cc88ff; }
  #bind-btn {
    padding: 0.45rem 1.4rem; border: 1px solid #664400; background: rgba(50,20,0,0.7);
    color: #cc8833; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;
    transition: all 0.2s; display: none;
  }
  #bind-btn.visible { display: block; }
  #bind-btn:hover { border-color: #ffaa44; color: #ffcc88; background: rgba(80,40,0,0.7); }

  /* ── Grimoire ── */
  #screen-grimoire { background: rgba(8,7,15,0.95); pointer-events: all; }
  #grimoire-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #grimoire-header h2 { flex: 1; text-align: center; color: #bb88ee; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #grimoire-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #grimoire-back:hover { border-color: #7733aa; color: #cc88ff; }
  #grimoire-content { flex: 1; overflow-y: auto; padding: 0.75rem; }
  .grimoire-section { margin-bottom: 1.5rem; }
  .grimoire-section h3 { color: #9977bb; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.5rem; }
  .sigil-entry {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.4rem 0.6rem; border: 1px solid #221133; border-radius: 4px;
    margin-bottom: 0.4rem; background: rgba(20,10,35,0.5);
  }
  .sigil-entry .s-state { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .sigil-entry .s-meta { flex: 1; }
  .sigil-entry .s-name { font-size: 0.8rem; color: #cbb8dd; }
  .sigil-entry .s-integrity { font-size: 0.7rem; color: #776688; }
  .sigil-entry .s-status { font-size: 0.65rem; color: #665577; text-transform: uppercase; letter-spacing: 0.08em; }
  #grimoire-empty { text-align: center; color: #443355; font-size: 0.85rem; margin-top: 3rem; }
`

// ─── UIManager ────────────────────────────────────────────────────────────────

export class UIManager {
  private readonly _root: HTMLDivElement
  private readonly _screens: Record<string, HTMLDivElement> = {}
  private _callbacks: UICallbacks | null = null
  private _unsubscribeStore: (() => void) | null = null

  constructor() {
    this._injectStyles()
    this._root = document.createElement('div')
    this._root.id = 'goetia-ui'
    document.body.appendChild(this._root)
    this._buildScreens()
    this._subscribeToStore()
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  setCallbacks(cb: UICallbacks): void {
    this._callbacks = cb
  }

  showDemonSelect(): void {
    this._show('demon')
  }

  showRitual(demonName: string): void {
    const label = this._root.querySelector<HTMLElement>('#demon-name-label')
    if (label) label.textContent = demonName.toUpperCase()
    this._updatePhaseButtons('SEAL')
    this._show('ritual')
  }

  showGrimoire(): void {
    this._renderGrimoire()
    this._show('grimoire')
  }

  updatePhaseButtons(phase: DrawingPhase): void {
    this._updatePhaseButtons(phase)
  }

  destroy(): void {
    this._unsubscribeStore?.()
    this._root.remove()
  }

  // ─── Screen builder ───────────────────────────────────────────────────────

  private _buildScreens(): void {
    this._screens.demon = this._buildDemonSelect()
    this._screens.ritual = this._buildRitual()
    this._screens.grimoire = this._buildGrimoire()
    for (const screen of Object.values(this._screens)) {
      this._root.appendChild(screen)
    }
  }

  private _buildDemonSelect(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-demon')

    const h1 = el('h1')
    h1.textContent = 'Choose your demon'
    screen.appendChild(h1)

    const grid = el('div', '', 'demon-grid')
    const demons = listDemons()
    for (const demon of demons) {
      grid.appendChild(this._demonCard(demon))
    }
    screen.appendChild(grid)

    const recordsBtn = el('button', '', 'records-btn')
    recordsBtn.textContent = 'Records'
    recordsBtn.addEventListener('click', () => this.showGrimoire())
    screen.appendChild(recordsBtn)

    return screen
  }

  private _demonCard(demon: Demon): HTMLDivElement {
    const card = el('div', 'demon-card')

    const name = el('div', 'd-name')
    name.textContent = demon.name

    const rank = el('div', 'd-rank')
    rank.textContent = demon.rank

    const legions = el('div', 'd-legions')
    legions.textContent = `${demon.legions} legions`

    card.appendChild(name)
    card.appendChild(rank)
    card.appendChild(legions)
    card.addEventListener('click', () => {
      this._callbacks?.onDemonSelect(demon.id)
      this.showRitual(demon.name)
    })
    return card
  }

  private _buildRitual(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-ritual')

    // Header
    const header = el('div', '', 'ritual-header')

    const backBtn = el('button', '', 'back-btn')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showDemonSelect())
    header.appendChild(backBtn)

    const nameLabel = el('div', '', 'demon-name-label')
    header.appendChild(nameLabel)

    screen.appendChild(header)

    // Spacer
    const spacer = el('div')
    spacer.style.flex = '1'
    screen.appendChild(spacer)

    // Toolbar
    const toolbar = el('div', '', 'ritual-toolbar')

    const phases: DrawingPhase[] = ['SEAL', 'GLYPH', 'RING']
    for (const phase of phases) {
      const btn = el('button', 'phase-btn', `phase-btn-${phase}`)
      btn.textContent = phase
      btn.addEventListener('click', () => {
        this._callbacks?.onPhaseChange(phase)
        this._updatePhaseButtons(phase)
      })
      toolbar.appendChild(btn)
    }

    const bindBtn = el('button', '', 'bind-btn')
    bindBtn.textContent = 'Bind'
    bindBtn.addEventListener('click', () => this._callbacks?.onBind())
    toolbar.appendChild(bindBtn)

    screen.appendChild(toolbar)
    return screen
  }

  private _buildGrimoire(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-grimoire')

    const header = el('div', '', 'grimoire-header')
    const backBtn = el('button', '', 'grimoire-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showDemonSelect())
    const h2 = el('h2')
    h2.textContent = 'Grimoire'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'grimoire-content')
    screen.appendChild(content)

    return screen
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  private _renderGrimoire(): void {
    useGrimoireStore.getState().load()
    const pages = useGrimoireStore.getState().pages
    const content = this._root.querySelector<HTMLElement>('#grimoire-content')
    if (!content) return
    content.innerHTML = ''

    if (pages.length === 0) {
      const empty = el('p', '', 'grimoire-empty')
      empty.textContent = 'No sigils recorded yet.'
      content.appendChild(empty)
      return
    }

    for (const page of pages) {
      if (page.sigils.length === 0) continue
      const section = el('div', 'grimoire-section')
      const h3 = el('h3')
      h3.textContent = page.demonId
      section.appendChild(h3)
      for (const sigil of page.sigils) {
        section.appendChild(this._sigilEntry(sigil))
      }
      content.appendChild(section)
    }
  }

  private _sigilEntry(sigil: Sigil): HTMLDivElement {
    const entry = el('div', 'sigil-entry')

    const dot = el('div', 's-state')
    dot.style.backgroundColor = VISUAL_STATE_COLORS[sigil.visualState]

    const meta = el('div', 's-meta')
    const name = el('div', 's-name')
    name.textContent = new Date(sigil.createdAt).toLocaleDateString()
    const integrity = el('div', 's-integrity')
    integrity.textContent = `Integrity ${Math.round(sigil.overallIntegrity * 100)}%`
    const status = el('div', 's-status')
    status.textContent = sigil.status

    meta.appendChild(name)
    meta.appendChild(integrity)
    meta.appendChild(status)
    entry.appendChild(dot)
    entry.appendChild(meta)
    return entry
  }

  private _updatePhaseButtons(active: DrawingPhase): void {
    for (const phase of ['SEAL', 'GLYPH', 'RING'] as DrawingPhase[]) {
      const btn = this._root.querySelector<HTMLElement>(`#phase-btn-${phase}`)
      if (btn) btn.classList.toggle('active', phase === active)
    }
  }

  // ─── Store subscription ───────────────────────────────────────────────────

  private _subscribeToStore(): void {
    const check = () => {
      const s = useCanvasStore.getState()
      const canBind =
        s.sealIntegrity > 0 && s.placedGlyphs.length > 0 && s.ringResult !== null
      const bindBtn = this._root.querySelector<HTMLElement>('#bind-btn')
      if (bindBtn) bindBtn.classList.toggle('visible', canBind)
    }

    this._unsubscribeStore = useCanvasStore.subscribe(check)
    check() // initial check
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _show(name: keyof typeof this._screens): void {
    for (const [key, screen] of Object.entries(this._screens)) {
      screen.classList.toggle('active', key === name)
    }
  }

  private _injectStyles(): void {
    if (document.getElementById('goetia-style')) return
    const style = document.createElement('style')
    style.id = 'goetia-style'
    style.textContent = STYLE
    document.head.appendChild(style)
  }
}

// ─── DOM helper ──────────────────────────────────────────────────────────────

function el(tag: string, className = '', id = ''): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement
  if (className) e.className = className
  if (id) e.id = id
  return e
}
