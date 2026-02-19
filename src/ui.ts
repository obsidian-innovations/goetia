import { listDemons, STARTER_DEMON_ID } from '@engine/demons/DemonRegistry'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import { useResearchStore } from '@stores/researchStore'
import type { DrawingPhase } from '@stores/canvasStore'
import type { Demon, Sigil, SigilVisualState } from '@engine/sigil/Types'
import type { AttentionGesture } from '@engine/charging/AttentionGesture'
import type { DemonicDemand } from '@engine/demands/DemandEngine'
import type { ResearchState } from '@engine/research/ResearchEngine'

// ─── Callbacks injected from main ────────────────────────────────────────────

export interface UICallbacks {
  onDemonSelect: (demonId: string) => void
  onPhaseChange: (phase: DrawingPhase) => void
  onBind: () => void
  onStartCharging?: (sigilId: string) => void
  onFulfillDemand?: (demandId: string) => void
  onIgnoreDemand?: (demandId: string) => void
  onStudySigil?: (sigilId: string, demonId: string) => void
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
  .demon-card.locked { opacity: 0.55; border-color: #2a0a3a; cursor: default; }
  .demon-card.locked:hover { background: rgba(30,5,50,0.5); border-color: #2a0a3a; }
  .demon-card .d-name { font-size: 1rem; color: #ddc0ff; }
  .demon-card.locked .d-name { color: #553366; }
  .demon-card .d-rank { font-size: 0.7rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  .demon-card .d-legions { font-size: 0.65rem; color: #665577; }
  .demon-card .d-research-bar-bg {
    height: 3px; background: rgba(40,10,60,0.8); border-radius: 2px; overflow: hidden; margin-top: 0.2rem;
  }
  .demon-card .d-research-bar {
    height: 100%; background: linear-gradient(to right, #5511aa, #aa55ff);
    border-radius: 2px; transition: width 0.5s ease;
  }
  .demon-card .d-hint { font-size: 0.6rem; color: #554466; margin-top: 0.1rem; font-style: italic; }
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

  /* ── Charging ── */
  #screen-charging { background: rgba(8,7,15,0.93); pointer-events: all; overflow-y: auto; }
  #charging-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #charging-header h2 { flex: 1; text-align: center; color: #bb88ee; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #charging-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #charging-back:hover { border-color: #7733aa; color: #cc88ff; }
  #charging-content { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  #charging-progress-wrap {
    display: flex; flex-direction: column; gap: 0.5rem;
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px; padding: 1rem;
  }
  #charging-progress-label { font-size: 0.8rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  #charging-progress-bar-bg {
    height: 8px; background: rgba(60,20,90,0.5); border-radius: 4px; overflow: hidden;
  }
  #charging-progress-bar {
    height: 100%; background: linear-gradient(to right, #7722bb, #cc88ff);
    border-radius: 4px; transition: width 0.5s ease; width: 0%;
  }
  #charging-progress-pct { font-size: 1.2rem; color: #cc88ff; text-align: center; font-weight: bold; }
  #charging-attention-wrap {
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  #charging-attention-label { font-size: 0.8rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  #charging-attention-text { font-size: 0.9rem; color: #ddc0ff; }
  #charging-attention-required {
    font-size: 0.75rem; color: #ff8833; text-transform: uppercase; letter-spacing: 0.08em; display: none;
  }
  #charging-attention-required.visible { display: block; }
  #charging-demands-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
  #charging-demands-label { font-size: 0.8rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  .demand-entry {
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px;
    padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;
  }
  .demand-entry .demand-text { font-size: 0.85rem; color: #cbb8dd; }
  .demand-entry .demand-actions { display: flex; gap: 0.5rem; }
  .demand-fulfill-btn {
    padding: 0.35rem 0.8rem; border: 1px solid #446622; background: rgba(20,40,10,0.7);
    color: #88cc44; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .demand-fulfill-btn:hover { border-color: #88cc44; color: #aaffaa; }
  .demand-ignore-btn {
    padding: 0.35rem 0.8rem; border: 1px solid #442222; background: rgba(40,10,10,0.7);
    color: #cc4444; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .demand-ignore-btn:hover { border-color: #cc4444; color: #ff6666; }
  #charging-charged-notice {
    background: rgba(80,20,130,0.4); border: 1px solid #aa66ff; border-radius: 8px;
    padding: 1rem; text-align: center; color: #cc88ff; font-size: 0.9rem;
    letter-spacing: 0.08em; display: none;
  }
  #charging-charged-notice.visible { display: block; }

  /* ── Sigil Study ── */
  #screen-study { background: rgba(8,7,15,0.95); pointer-events: all; overflow-y: auto; }
  #study-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #study-header h2 { flex: 1; text-align: center; color: #bb88ee; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #study-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #study-back:hover { border-color: #7733aa; color: #cc88ff; }
  #study-content { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  #study-meta {
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px; padding: 1rem;
    display: flex; flex-direction: column; gap: 0.4rem;
  }
  #study-meta .sm-date { font-size: 0.8rem; color: #997799; }
  #study-meta .sm-integrity { font-size: 1.1rem; color: #cc88ff; font-weight: bold; }
  #study-meta .sm-status { font-size: 0.75rem; color: #665577; text-transform: uppercase; letter-spacing: 0.08em; }
  #study-meta .sm-visual { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 0.4rem; }
  #study-btn {
    padding: 0.6rem 1.4rem; border: 1px solid #664488; background: rgba(50,10,80,0.7);
    color: #cc88ff; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em;
    transition: all 0.2s; align-self: center;
  }
  #study-btn:hover { border-color: #aa44dd; color: #eebbff; background: rgba(80,20,120,0.7); }
  .s-study-btn {
    padding: 0.25rem 0.6rem; border: 1px solid #442255; background: transparent;
    color: #8866aa; border-radius: 3px; cursor: pointer;
    font-family: inherit; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .s-study-btn:hover { border-color: #7733aa; color: #cc88ff; }
  #study-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  #study-cooldown { font-size: 0.75rem; color: #553366; text-align: center; }
  #study-lore {
    background: rgba(20,5,35,0.8); border: 1px solid #2a0a40; border-radius: 8px;
    padding: 0.75rem; font-size: 0.82rem; color: #9977aa; font-style: italic; line-height: 1.5;
  }
`

// ─── UIManager ────────────────────────────────────────────────────────────────

export class UIManager {
  private readonly _root: HTMLDivElement
  private readonly _screens: Record<string, HTMLDivElement> = {}
  private _callbacks: UICallbacks | null = null
  private _unsubscribeStore: (() => void) | null = null
  private _studyCooldowns: Map<string, number> = new Map()

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

  showCharging(demonName: string): void {
    const label = this._root.querySelector<HTMLElement>('#charging-demon-name')
    if (label) label.textContent = demonName.toUpperCase()
    this._show('charging')
  }

  showStudy(sigil: Sigil, demonName: string, researchState: ResearchState | null): void {
    const h2 = this._root.querySelector<HTMLElement>('#study-demon-name')
    if (h2) h2.textContent = demonName.toUpperCase()

    const content = this._root.querySelector<HTMLElement>('#study-content')
    if (!content) { this._show('study'); return }
    content.innerHTML = ''

    // ── Sigil metadata ────────────────────────────────────────────────────
    const meta = el('div', '', 'study-meta')
    const dot = el('span', 'sm-visual') as HTMLSpanElement
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:0.4rem;background:${VISUAL_STATE_COLORS[sigil.visualState]}`
    const dateEl = el('div', 'sm-date')
    dateEl.textContent = `Crafted ${new Date(sigil.createdAt).toLocaleDateString()}`
    const integrityEl = el('div', 'sm-integrity')
    integrityEl.innerHTML = `${dot.outerHTML}Integrity: ${Math.round(sigil.overallIntegrity * 100)}%`
    const statusEl = el('div', 'sm-status')
    statusEl.textContent = sigil.status
    meta.appendChild(dateEl)
    meta.appendChild(integrityEl)
    meta.appendChild(statusEl)
    content.appendChild(meta)

    // ── Study button with cooldown ────────────────────────────────────────
    const COOLDOWN_MS = 10 * 60 * 1000
    const lastStudied = this._studyCooldowns.get(sigil.id) ?? 0
    const cooldownRemaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastStudied))

    const btnWrap = el('div')
    btnWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0.5rem'

    const studyBtn = el('button', '', 'study-btn') as unknown as HTMLButtonElement
    studyBtn.textContent = 'Study This Sigil'
    studyBtn.disabled = cooldownRemaining > 0

    const cooldownEl = el('div', '', 'study-cooldown')
    if (cooldownRemaining > 0) {
      const mins = Math.ceil(cooldownRemaining / 60_000)
      cooldownEl.textContent = `Available again in ${mins} minute${mins !== 1 ? 's' : ''}.`
    }

    studyBtn.addEventListener('click', () => {
      const now = Date.now()
      if (now - (this._studyCooldowns.get(sigil.id) ?? 0) < COOLDOWN_MS) return
      this._studyCooldowns.set(sigil.id, now)
      studyBtn.disabled = true
      cooldownEl.textContent = 'Studied. Return in 10 minutes for more insights.'
      this._callbacks?.onStudySigil?.(sigil.id, sigil.demonId)
    })

    btnWrap.appendChild(studyBtn)
    btnWrap.appendChild(cooldownEl)
    content.appendChild(btnWrap)

    // ── Lore fragments ────────────────────────────────────────────────────
    if (researchState && researchState.loreFragments.length > 0) {
      const lore = el('div', '', 'study-lore')
      lore.innerHTML = researchState.loreFragments.map(f => `<p>${f}</p>`).join('')
      content.appendChild(lore)
    }

    this._show('study')
  }

  updateChargingProgress(progress: number): void {
    const bar = this._root.querySelector<HTMLElement>('#charging-progress-bar')
    const pct = this._root.querySelector<HTMLElement>('#charging-progress-pct')
    if (bar) bar.style.width = `${Math.round(progress * 100)}%`
    if (pct) pct.textContent = `${Math.round(progress * 100)}%`

    const notice = this._root.querySelector<HTMLElement>('#charging-charged-notice')
    if (notice) notice.classList.toggle('visible', progress >= 1)
  }

  updateAttentionGesture(gesture: AttentionGesture): void {
    const text = this._root.querySelector<HTMLElement>('#charging-attention-text')
    const required = this._root.querySelector<HTMLElement>('#charging-attention-required')
    if (text) text.textContent = gesture.description
    if (required) required.classList.toggle('visible', gesture.required)
  }

  updateDemands(demands: DemonicDemand[]): void {
    const wrap = this._root.querySelector<HTMLElement>('#charging-demands-wrap')
    if (!wrap) return

    // Remove old entries (keep the label)
    const label = wrap.querySelector('#charging-demands-label')
    wrap.innerHTML = ''
    if (label) wrap.appendChild(label)

    for (const demand of demands) {
      if (demand.fulfilled) continue
      const entry = el('div', 'demand-entry')

      const text = el('div', 'demand-text')
      text.textContent = demand.description
      entry.appendChild(text)

      const actions = el('div', 'demand-actions')

      const fulfillBtn = el('button', 'demand-fulfill-btn')
      fulfillBtn.textContent = 'Done'
      fulfillBtn.addEventListener('click', () => {
        this._callbacks?.onFulfillDemand?.(demand.id)
      })

      const ignoreBtn = el('button', 'demand-ignore-btn')
      ignoreBtn.textContent = 'Ignore'
      ignoreBtn.addEventListener('click', () => {
        this._callbacks?.onIgnoreDemand?.(demand.id)
      })

      actions.appendChild(fulfillBtn)
      actions.appendChild(ignoreBtn)
      entry.appendChild(actions)
      wrap.appendChild(entry)
    }
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
    this._screens.charging = this._buildCharging()
    this._screens.study = this._buildStudy()
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
    screen.appendChild(grid)

    const recordsBtn = el('button', '', 'records-btn')
    recordsBtn.textContent = 'Records'
    recordsBtn.addEventListener('click', () => this.showGrimoire())
    screen.appendChild(recordsBtn)

    return screen
  }

  /** Rebuild the demon grid cards using the latest research states. */
  refreshDemonGrid(): void {
    const grid = this._root.querySelector<HTMLElement>('#demon-grid')
    if (!grid) return
    grid.innerHTML = ''
    const demons = listDemons()
    const research = useResearchStore.getState().researching
    for (const demon of demons) {
      const rs = research[demon.id] ?? null
      const isStarter = demon.id === STARTER_DEMON_ID
      const isUnlocked = isStarter || (rs !== null && rs.progress >= 1)
      grid.appendChild(this._demonCard(demon, rs, isUnlocked))
    }
  }

  private _demonCard(
    demon: Demon,
    research: ResearchState | null,
    unlocked: boolean,
  ): HTMLDivElement {
    const card = el('div', unlocked ? 'demon-card' : 'demon-card locked')

    const name = el('div', 'd-name')
    name.textContent = unlocked ? demon.name : '???'

    const rank = el('div', 'd-rank')
    rank.textContent = demon.rank

    const legions = el('div', 'd-legions')
    legions.textContent = unlocked ? `${demon.legions} legions` : '? legions'

    card.appendChild(name)
    card.appendChild(rank)
    card.appendChild(legions)

    // Research progress bar
    const progress = research?.progress ?? 0
    if (progress > 0 || !unlocked) {
      const barBg = el('div', 'd-research-bar-bg')
      const bar = el('div', 'd-research-bar')
      bar.style.width = `${Math.round(progress * 100)}%`
      barBg.appendChild(bar)
      card.appendChild(barBg)

      if (!unlocked) {
        const hint = el('div', 'd-hint')
        hint.textContent = progress > 0
          ? `${Math.round(progress * 100)}% researched`
          : 'Perform rituals to discover'
        card.appendChild(hint)
      }
    }

    if (unlocked) {
      card.addEventListener('click', () => {
        this._callbacks?.onDemonSelect(demon.id)
        this.showRitual(demon.name)
      })
    }
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

  private _buildCharging(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-charging')

    // Header
    const header = el('div', '', 'charging-header')
    const backBtn = el('button', '', 'charging-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showGrimoire())
    const h2 = el('h2')
    h2.id = 'charging-demon-name'
    h2.textContent = ''
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'charging-content')

    // Progress section
    const progressWrap = el('div', '', 'charging-progress-wrap')
    const progressLabel = el('div', '', 'charging-progress-label')
    progressLabel.textContent = 'Charge Progress'
    const barBg = el('div', '', 'charging-progress-bar-bg')
    const bar = el('div', '', 'charging-progress-bar')
    barBg.appendChild(bar)
    const pct = el('div', '', 'charging-progress-pct')
    pct.textContent = '0%'
    progressWrap.appendChild(progressLabel)
    progressWrap.appendChild(barBg)
    progressWrap.appendChild(pct)
    content.appendChild(progressWrap)

    // Charged notice
    const chargedNotice = el('div', '', 'charging-charged-notice')
    chargedNotice.textContent = 'The sigil is charged. Maintain the hold window.'
    content.appendChild(chargedNotice)

    // Attention gesture section
    const attentionWrap = el('div', '', 'charging-attention-wrap')
    const attentionLabel = el('div', '', 'charging-attention-label')
    attentionLabel.textContent = 'Attention Gesture'
    const attentionText = el('div', '', 'charging-attention-text')
    attentionText.textContent = 'Waiting…'
    const attentionRequired = el('div', '', 'charging-attention-required')
    attentionRequired.textContent = '⚠ Attention required now'
    attentionWrap.appendChild(attentionLabel)
    attentionWrap.appendChild(attentionText)
    attentionWrap.appendChild(attentionRequired)
    content.appendChild(attentionWrap)

    // Demands section
    const demandsWrap = el('div', '', 'charging-demands-wrap')
    const demandsLabel = el('div', '', 'charging-demands-label')
    demandsLabel.id = 'charging-demands-label'
    demandsLabel.textContent = 'Demonic Demands'
    demandsWrap.appendChild(demandsLabel)
    content.appendChild(demandsWrap)

    screen.appendChild(content)
    return screen
  }

  private _buildStudy(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-study')

    const header = el('div', '', 'study-header')
    const backBtn = el('button', '', 'study-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showGrimoire())
    const h2 = el('h2')
    h2.id = 'study-demon-name'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'study-content')
    screen.appendChild(content)

    return screen
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  private _renderGrimoire(): void {
    useGrimoireStore.getState().load()
    const pages = useGrimoireStore.getState().pages
    const research = useResearchStore.getState().researching
    const demonMap = new Map(listDemons().map(d => [d.id, d]))
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
      const demon = demonMap.get(page.demonId)
      const rs = research[page.demonId] ?? null
      const section = el('div', 'grimoire-section')
      const h3 = el('h3')
      h3.textContent = demon?.name ?? page.demonId
      section.appendChild(h3)

      // Research progress bar (if not fully known)
      if (rs && rs.progress < 1) {
        const barBg = el('div', 'd-research-bar-bg')
        barBg.style.cssText = 'height:3px;background:rgba(40,10,60,0.8);border-radius:2px;overflow:hidden;margin-bottom:0.5rem'
        const bar = el('div', 'd-research-bar')
        bar.style.cssText = `height:100%;background:linear-gradient(to right,#5511aa,#aa55ff);border-radius:2px;width:${Math.round(rs.progress * 100)}%`
        barBg.appendChild(bar)
        section.appendChild(barBg)
      }

      for (const sigil of page.sigils) {
        section.appendChild(this._sigilEntry(sigil, demon?.name ?? page.demonId, rs))
      }
      content.appendChild(section)
    }
  }

  private _sigilEntry(
    sigil: Sigil,
    demonName: string,
    researchState: ResearchState | null,
  ): HTMLDivElement {
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

    const studyBtn = el('button', 's-study-btn')
    studyBtn.textContent = 'Study'
    studyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.showStudy(sigil, demonName, researchState)
    })
    entry.appendChild(studyBtn)

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
