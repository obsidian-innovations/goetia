import { listDemons, STARTER_DEMON_ID } from '@engine/demons/DemonRegistry'
import type { CorruptionStage } from '@engine/corruption/CorruptionEngine'
import type { WhisperIntensity } from '@engine/corruption/WhisperEngine'
import { useCanvasStore } from '@stores/canvasStore'
import { useGrimoireStore } from '@stores/grimoireStore'
import { useResearchStore } from '@stores/researchStore'
import type { DrawingPhase } from '@stores/canvasStore'
import type { Demon, Sigil, SigilVisualState } from '@engine/sigil/Types'
import type { AttentionGesture } from '@engine/charging/AttentionGesture'
import type { DemonicDemand } from '@engine/demands/DemandEngine'
import type { ResearchState } from '@engine/research/ResearchEngine'
import type { ThinPlace } from '@engine/world/ThinPlaces'
import { bearingDeg, compassLabel } from '@engine/world/ThinPlaces'
import type { ClashResult } from '@engine/pvp/ClashResolver'
import type { Hex } from '@engine/pvp/HexSystem'
import type { CovenState } from '@engine/social/CovenEngine'

// ─── Callbacks injected from main ────────────────────────────────────────────

export interface UICallbacks {
  onDemonSelect: (demonId: string) => void
  onPhaseChange: (phase: DrawingPhase) => void
  onBind: () => void
  onStartCharging?: (sigilId: string) => void
  onFulfillDemand?: (demandId: string) => void
  onIgnoreDemand?: (demandId: string) => void
  onStudySigil?: (sigilId: string, demonId: string) => void
  onRequestLocation?: () => void
  onCastHex?: (targetLabel: string, sigilId: string) => void
  onCastWard?: (sigilId: string) => void
  onCreateCoven?: (name: string) => void
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

  /* ── World Map ── */
  #screen-world { background: rgba(8,7,15,0.95); pointer-events: all; }
  #world-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #world-header h2 { flex: 1; text-align: center; color: #bb88ee; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #world-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #world-back:hover { border-color: #7733aa; color: #cc88ff; }
  #world-content { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0.75rem; gap: 0.75rem; overflow-y: auto; }
  #world-radar { width: 280px; height: 280px; border-radius: 50%; background: rgba(10,5,20,0.8); border: 1px solid #331144; }
  #world-loc-btn {
    padding: 0.5rem 1.5rem; border: 1px solid #664488; background: rgba(50,10,80,0.7);
    color: #cc88ff; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;
    transition: all 0.2s;
  }
  #world-loc-btn:hover { border-color: #aa44dd; background: rgba(80,20,120,0.7); }
  #world-loc-status { font-size: 0.75rem; color: #554466; text-align: center; }
  #world-current-place {
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px;
    padding: 0.75rem; width: 100%; display: none;
  }
  #world-current-place.visible { display: block; }
  #world-current-place .wcp-name { font-size: 0.9rem; color: #cc88ff; margin-bottom: 0.25rem; }
  #world-current-place .wcp-veil { font-size: 0.75rem; color: #997799; }
  #world-current-place .wcp-boost {
    font-size: 0.8rem; color: #88cc44; margin-top: 0.25rem; letter-spacing: 0.06em;
  }
  #world-nearby-list { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
  .world-place-entry {
    background: rgba(20,8,35,0.6); border: 1px solid #2a0a40; border-radius: 6px;
    padding: 0.5rem 0.75rem; display: flex; align-items: center; gap: 0.75rem;
  }
  .world-place-entry .wpe-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: #aa55ff; box-shadow: 0 0 6px #aa55ff;
  }
  .world-place-entry.player-created .wpe-dot { background: #ffaa33; box-shadow: 0 0 6px #ffaa33; }
  .world-place-entry.current .wpe-dot { background: #55ffaa; box-shadow: 0 0 8px #55ffaa; }
  .world-place-entry .wpe-meta { flex: 1; }
  .world-place-entry .wpe-name { font-size: 0.8rem; color: #cbb8dd; }
  .world-place-entry .wpe-info { font-size: 0.68rem; color: #665577; }
  #world-no-location { text-align: center; color: #443355; font-size: 0.85rem; margin-top: 1rem; }
  #map-btn {
    margin: 0 0.75rem 0 0; padding: 0.5rem 1.2rem;
    background: transparent; border: 1px solid #331144;
    color: #776688; border-radius: 4px; cursor: pointer; letter-spacing: 0.1em;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase;
    transition: border-color 0.2s, color 0.2s;
  }
  #map-btn:hover { border-color: #7733aa; color: #cc88ff; }
  #pvp-btn, #coven-btn {
    margin: 0; padding: 0.5rem 1.2rem;
    background: transparent; border: 1px solid #331144;
    color: #776688; border-radius: 4px; cursor: pointer; letter-spacing: 0.1em;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase;
    transition: border-color 0.2s, color 0.2s;
  }
  #pvp-btn:hover { border-color: #aa3322; color: #ff8866; }
  #coven-btn:hover { border-color: #4466aa; color: #88bbff; }
  #charging-place-wrap {
    background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px;
    padding: 0.75rem; display: none; flex-direction: column; gap: 0.3rem;
  }
  #charging-place-wrap.visible { display: flex; }
  #charging-place-label { font-size: 0.8rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  #charging-place-name { font-size: 0.85rem; color: #cc88ff; }
  #charging-place-boost { font-size: 0.75rem; color: #88cc44; }

  /* ── PvP (Hex/Ward) ── */
  #screen-pvp { background: rgba(8,7,15,0.97); pointer-events: all; }
  #pvp-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #pvp-header h2 { flex: 1; text-align: center; color: #ff8866; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #pvp-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #pvp-back:hover { border-color: #7733aa; color: #cc88ff; }
  #pvp-content { flex: 1; display: flex; flex-direction: column; padding: 0.75rem; gap: 0.75rem; overflow-y: auto; }
  .pvp-section-title {
    font-size: 0.75rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;
  }
  .pvp-entry {
    background: rgba(30,8,15,0.7); border: 1px solid #331122; border-radius: 6px;
    padding: 0.5rem 0.75rem; display: flex; flex-direction: column; gap: 0.2rem;
  }
  .pvp-entry.ward { border-color: #113322; background: rgba(8,20,15,0.7); }
  .pvp-entry .pe-type { font-size: 0.65rem; color: #cc4422; text-transform: uppercase; letter-spacing: 0.1em; }
  .pvp-entry.ward .pe-type { color: #44cc88; }
  .pvp-entry .pe-integrity { font-size: 0.8rem; color: #ccaaaa; }
  .pvp-entry.ward .pe-integrity { color: #aaccaa; }
  .pvp-entry .pe-expires { font-size: 0.65rem; color: #553333; }
  .pvp-empty { font-size: 0.8rem; color: #443333; font-style: italic; text-align: center; padding: 0.75rem 0; }
  #pvp-btn {
    margin: 0; padding: 0.5rem 1.2rem;
    background: transparent; border: 1px solid #441122;
    color: #994433; border-radius: 4px; cursor: pointer; letter-spacing: 0.1em;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase;
    transition: border-color 0.2s, color 0.2s;
  }
  #pvp-btn:hover { border-color: #aa3322; color: #ff8866; }

  /* ── Clash ── */
  #screen-clash { background: rgba(8,7,15,0.97); pointer-events: all; }
  #clash-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #clash-header h2 { flex: 1; text-align: center; color: #ff8866; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #clash-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #clash-back:hover { border-color: #7733aa; color: #cc88ff; }
  #clash-content {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 1.5rem 1rem; gap: 1.5rem;
  }
  #clash-versus { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 0.75rem; }
  .clash-side {
    flex: 1; background: rgba(30,10,50,0.6); border: 1px solid #331144; border-radius: 8px;
    padding: 0.75rem; display: flex; flex-direction: column; gap: 0.3rem;
  }
  .clash-side.winner { border-color: #aa66ff; box-shadow: 0 0 12px rgba(170,100,255,0.3); }
  .clash-side.loser { border-color: #331122; opacity: 0.7; }
  .clash-side .cs-role { font-size: 0.65rem; color: #997799; text-transform: uppercase; letter-spacing: 0.1em; }
  .clash-side .cs-name { font-size: 1rem; color: #ddc0ff; }
  .clash-side .cs-integrity { font-size: 0.75rem; color: #997799; }
  #clash-vs-divider { font-size: 1.4rem; color: #661133; flex-shrink: 0; }
  #clash-outcome {
    text-align: center; padding: 0.75rem 1.5rem; border-radius: 8px;
    border: 1px solid #441133; background: rgba(30,5,15,0.8);
  }
  #clash-outcome .co-label { font-size: 0.65rem; color: #997799; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.4rem; }
  #clash-outcome .co-outcome {
    font-size: 1.1rem; color: #ff8866; letter-spacing: 0.15em; text-transform: uppercase;
    margin-bottom: 0.4rem;
  }
  #clash-outcome .co-details { font-size: 0.8rem; color: #997799; font-style: italic; line-height: 1.45; }
  #clash-outcome .co-score { font-size: 0.75rem; color: #665566; margin-top: 0.4rem; }

  /* ── Coven ── */
  #screen-coven { background: rgba(8,7,15,0.97); pointer-events: all; }
  #coven-header {
    padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;
    border-bottom: 1px solid #221133;
  }
  #coven-header h2 { flex: 1; text-align: center; color: #88bbff; letter-spacing: 0.15em; font-size: 1.1rem; margin: 0; }
  #coven-back {
    background: transparent; border: 1px solid #442255; color: #997799;
    border-radius: 4px; padding: 0.3rem 0.75rem; cursor: pointer;
    font-family: inherit; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  #coven-back:hover { border-color: #7733aa; color: #cc88ff; }
  #coven-content { flex: 1; display: flex; flex-direction: column; padding: 0.75rem; gap: 0.75rem; overflow-y: auto; }
  #coven-name { font-size: 1.1rem; color: #aaccff; text-align: center; letter-spacing: 0.1em; }
  #coven-no-coven { text-align: center; color: #443355; font-size: 0.85rem; margin-top: 1rem; }
  #coven-create-form { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  #coven-create-input {
    width: 100%; max-width: 280px; padding: 0.5rem 0.75rem;
    background: rgba(20,5,35,0.8); border: 1px solid #331144; border-radius: 4px;
    color: #cbb8dd; font-family: inherit; font-size: 0.85rem;
  }
  #coven-create-input::placeholder { color: #554466; }
  #coven-create-btn {
    padding: 0.5rem 1.5rem; border: 1px solid #334466; background: rgba(10,20,50,0.7);
    color: #88bbff; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em;
    transition: all 0.2s;
  }
  #coven-create-btn:hover { border-color: #6688cc; color: #aaddff; }
  .coven-member {
    background: rgba(15,10,30,0.7); border: 1px solid #221133; border-radius: 5px;
    padding: 0.4rem 0.75rem; font-size: 0.8rem; color: #9999bb;
  }
  .coven-sigil-entry {
    background: rgba(20,8,35,0.7); border: 1px solid #2a0a40; border-radius: 6px;
    padding: 0.5rem 0.75rem; font-size: 0.8rem; color: #bb99cc;
  }
  #coven-btn {
    margin: 0; padding: 0.5rem 1.2rem;
    background: transparent; border: 1px solid #223344;
    color: #556677; border-radius: 4px; cursor: pointer; letter-spacing: 0.1em;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase;
    transition: border-color 0.2s, color 0.2s;
  }
  #coven-btn:hover { border-color: #4466aa; color: #88bbff; }

  /* ── Corruption bar ── */
  #corruption-bar-wrap {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 4px; z-index: 100; pointer-events: none;
    background: rgba(0,0,0,0.3);
    display: none;
  }
  #corruption-bar-wrap.visible { display: block; }
  #corruption-bar {
    height: 100%; background: #aa0000;
    transition: width 1s ease, background-color 0.5s ease;
    width: 0%;
  }
  #corruption-bar.tainted   { background: #881100; }
  #corruption-bar.compromised { background: #cc2200; }
  #corruption-bar.vessel    { background: #ff0000; box-shadow: 0 0 6px #ff0000; }

  /* ── Whisper overlay ── */
  #whisper-overlay {
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
    max-width: 320px; width: 90%; z-index: 200; pointer-events: none;
    text-align: center; font-style: italic; letter-spacing: 0.04em;
    padding: 0.6rem 1rem; border-radius: 6px;
    background: rgba(30,0,0,0.75); border: 1px solid #550000;
    color: #cc6666; font-size: 0.85rem; line-height: 1.5;
    opacity: 0; transition: opacity 0.4s ease;
  }
  #whisper-overlay.visible { opacity: 1; }
  #whisper-overlay.medium { color: #dd4444; border-color: #880000; }
  #whisper-overlay.high   { color: #ff3333; border-color: #cc0000; background: rgba(60,0,0,0.85); }

  /* ── Vessel warning ── */
  #vessel-warning {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 300;
    background: rgba(80,0,0,0.7); display: none;
    flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
    pointer-events: all;
  }
  #vessel-warning.visible { display: flex; }
  #vessel-warning h2 { color: #ff4444; font-size: 1.6rem; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
  #vessel-warning p { color: #cc8888; font-size: 0.9rem; text-align: center; max-width: 260px; margin: 0; line-height: 1.6; }
  #vessel-warning-dismiss {
    padding: 0.5rem 1.5rem; border: 1px solid #cc2222; background: rgba(80,0,0,0.7);
    color: #ff6666; border-radius: 4px; cursor: pointer;
    font-family: inherit; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em;
  }
  #vessel-warning-dismiss:hover { border-color: #ff4444; color: #ffaaaa; }
`

// ─── UIManager ────────────────────────────────────────────────────────────────

export class UIManager {
  private readonly _root: HTMLDivElement
  private readonly _screens: Record<string, HTMLDivElement> = {}
  private _callbacks: UICallbacks | null = null
  private _unsubscribeStore: (() => void) | null = null
  private _studyCooldowns: Map<string, number> = new Map()
  // World map radar
  private _radarCanvas: HTMLCanvasElement | null = null
  private _radarAnimFrame = 0
  private _worldNearbyPlaces: ThinPlace[] = []
  private _worldCurrentPlace: ThinPlace | null = null
  private _worldPlayerPos: { lat: number; lng: number } | null = null
  // Corruption overlays
  private _corruptionBarWrap: HTMLDivElement | null = null
  private _corruptionBar: HTMLDivElement | null = null
  private _whisperOverlay: HTMLDivElement | null = null
  private _whisperTimeout: ReturnType<typeof setTimeout> | null = null
  private _vesselWarning: HTMLDivElement | null = null

  constructor() {
    this._injectStyles()
    this._root = document.createElement('div')
    this._root.id = 'goetia-ui'
    document.body.appendChild(this._root)
    this._buildScreens()
    this._buildCorruptionOverlays()
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

  showWorld(): void {
    this._show('world')
    this._startRadar()
  }

  /**
   * Update the world map screen with the latest world state.
   * `nearbyPlaces` are sorted nearest-first.
   */
  updateWorldState(
    nearbyPlaces: ThinPlace[],
    currentPlace: ThinPlace | null,
    playerPos: { lat: number; lng: number } | null,
    locationPermission: PermissionState,
  ): void {
    this._worldNearbyPlaces = nearbyPlaces
    this._worldCurrentPlace = currentPlace
    this._worldPlayerPos = playerPos

    // Update location status text
    const statusEl = this._root.querySelector<HTMLElement>('#world-loc-status')
    const locBtn = this._root.querySelector<HTMLElement>('#world-loc-btn')
    if (statusEl) {
      if (locationPermission === 'denied') {
        statusEl.textContent = 'Location access denied. Enable in browser settings.'
      } else if (playerPos) {
        statusEl.textContent = `${nearbyPlaces.length} thin place${nearbyPlaces.length !== 1 ? 's' : ''} nearby`
      } else {
        statusEl.textContent = 'Locating…'
      }
    }
    if (locBtn) {
      locBtn.style.display = locationPermission === 'denied' ? 'none' : 'block'
    }

    // Update current place card
    const cpWrap = this._root.querySelector<HTMLElement>('#world-current-place')
    if (cpWrap) {
      cpWrap.classList.toggle('visible', currentPlace !== null)
      if (currentPlace) {
        const nameEl = cpWrap.querySelector<HTMLElement>('.wcp-name')
        const veilEl = cpWrap.querySelector<HTMLElement>('.wcp-veil')
        const boostEl = cpWrap.querySelector<HTMLElement>('.wcp-boost')
        if (nameEl) nameEl.textContent = _thinPlaceLabel(currentPlace)
        if (veilEl) veilEl.textContent = `Veil strength: ${Math.round(currentPlace.veilStrength * 100)}%`
        if (boostEl) {
          const mult = (1.5 + (1 - currentPlace.veilStrength) * 1.5).toFixed(1)
          boostEl.textContent = `Charge rate: ×${mult}`
        }
      }
    }

    // Rebuild nearby list
    const listEl = this._root.querySelector<HTMLElement>('#world-nearby-list')
    if (listEl) {
      listEl.innerHTML = ''
      for (const tp of nearbyPlaces) {
        listEl.appendChild(this._worldPlaceEntry(tp, currentPlace, playerPos))
      }
    }

    // Show/hide "no location" message
    const noLocEl = this._root.querySelector<HTMLElement>('#world-no-location')
    if (noLocEl) noLocEl.style.display = playerPos ? 'none' : 'block'
  }

  /** Update the thin place indicator on the charging screen. */
  updateChargingThinPlace(currentPlace: ThinPlace | null, chargeMultiplier: number): void {
    const wrap = this._root.querySelector<HTMLElement>('#charging-place-wrap')
    const namEl = this._root.querySelector<HTMLElement>('#charging-place-name')
    const boostEl = this._root.querySelector<HTMLElement>('#charging-place-boost')
    if (wrap) wrap.classList.toggle('visible', currentPlace !== null)
    if (currentPlace) {
      if (namEl) namEl.textContent = _thinPlaceLabel(currentPlace)
      if (boostEl) boostEl.textContent = `Charge rate: ×${chargeMultiplier.toFixed(1)}`
    }
  }

  // ─── PvP screens ────────────────────────────────────────────────────────

  showClash(): void {
    this._show('clash')
  }

  /** Populate the clash screen with the result of a finished clash. */
  updateClashResult(
    result: ClashResult,
    attackerName: string,
    defenderName: string,
    attackerIntegrity: number,
    defenderIntegrity: number,
  ): void {
    const attackerEl = this._root.querySelector<HTMLElement>('#clash-attacker-name')
    const defenderEl = this._root.querySelector<HTMLElement>('#clash-defender-name')
    const atkIntEl   = this._root.querySelector<HTMLElement>('#clash-attacker-integrity')
    const defIntEl   = this._root.querySelector<HTMLElement>('#clash-defender-integrity')
    const outcomeEl  = this._root.querySelector<HTMLElement>('#clash-outcome-text')
    const detailsEl  = this._root.querySelector<HTMLElement>('#clash-outcome-details')
    const scoreEl    = this._root.querySelector<HTMLElement>('#clash-outcome-score')
    const atkSide    = this._root.querySelector<HTMLElement>('#clash-attacker-side')
    const defSide    = this._root.querySelector<HTMLElement>('#clash-defender-side')

    if (attackerEl) attackerEl.textContent = attackerName
    if (defenderEl) defenderEl.textContent = defenderName
    if (atkIntEl)   atkIntEl.textContent = `Integrity ${Math.round(attackerIntegrity * 100)}%`
    if (defIntEl)   defIntEl.textContent = `Integrity ${Math.round(defenderIntegrity * 100)}%`
    if (outcomeEl)  outcomeEl.textContent = result.outcome.replace(/_/g, ' ').toUpperCase()
    if (detailsEl)  detailsEl.textContent = result.details
    if (scoreEl)    scoreEl.textContent = `Score: ${result.score >= 0 ? '+' : ''}${result.score.toFixed(2)}`

    if (atkSide) {
      atkSide.classList.toggle('winner', result.winner === 'attacker')
      atkSide.classList.toggle('loser', result.winner === 'defender')
    }
    if (defSide) {
      defSide.classList.toggle('winner', result.winner === 'defender')
      defSide.classList.toggle('loser', result.winner === 'attacker')
    }
  }

  showPvP(): void {
    this._show('pvp')
  }

  /** Refresh the hex/ward management screen with current lists. */
  updatePvP(hexes: Hex[], wards: Hex[]): void {
    const hexList  = this._root.querySelector<HTMLElement>('#pvp-hex-list')
    const wardList = this._root.querySelector<HTMLElement>('#pvp-ward-list')

    if (hexList) {
      hexList.innerHTML = ''
      if (hexes.length === 0) {
        const empty = el('div', 'pvp-empty')
        empty.textContent = 'No active hexes'
        hexList.appendChild(empty)
      } else {
        for (const hex of hexes) {
          hexList.appendChild(this._buildPvPEntry(hex))
        }
      }
    }

    if (wardList) {
      wardList.innerHTML = ''
      if (wards.length === 0) {
        const empty = el('div', 'pvp-empty')
        empty.textContent = 'No active wards'
        wardList.appendChild(empty)
      } else {
        for (const ward of wards) {
          wardList.appendChild(this._buildPvPEntry(ward))
        }
      }
    }
  }

  showCoven(): void {
    this._show('coven')
  }

  /** Refresh the coven screen. Pass null when not in a coven. */
  updateCoven(covenState: CovenState | null): void {
    const nameEl    = this._root.querySelector<HTMLElement>('#coven-name')
    const noCovenEl = this._root.querySelector<HTMLElement>('#coven-no-coven')
    const createEl  = this._root.querySelector<HTMLElement>('#coven-create-form')
    const membersEl = this._root.querySelector<HTMLElement>('#coven-members-list')
    const grimoireEl = this._root.querySelector<HTMLElement>('#coven-grimoire-list')

    if (!covenState) {
      if (nameEl)    nameEl.textContent = ''
      if (noCovenEl) noCovenEl.style.display = 'block'
      if (createEl)  createEl.style.display = 'flex'
      if (membersEl) membersEl.innerHTML = ''
      if (grimoireEl) grimoireEl.innerHTML = ''
      return
    }

    if (noCovenEl) noCovenEl.style.display = 'none'
    if (createEl)  createEl.style.display = 'none'
    if (nameEl)    nameEl.textContent = covenState.coven.name

    if (membersEl) {
      membersEl.innerHTML = ''
      for (const id of covenState.coven.members) {
        const m = el('div', 'coven-member')
        m.textContent = id
        membersEl.appendChild(m)
      }
    }

    if (grimoireEl) {
      grimoireEl.innerHTML = ''
      for (const sigil of covenState.coven.sharedGrimoire) {
        const s = el('div', 'coven-sigil-entry')
        s.textContent = `${sigil.demonId} — ${Math.round(sigil.overallIntegrity * 100)}% integrity`
        grimoireEl.appendChild(s)
      }
    }
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

  /** Update the persistent corruption bar. */
  updateCorruption(level: number, stage: CorruptionStage): void {
    if (!this._corruptionBarWrap || !this._corruptionBar) return
    const visible = level > 0
    this._corruptionBarWrap.classList.toggle('visible', visible)
    this._corruptionBar.style.width = `${Math.round(level * 100)}%`
    this._corruptionBar.className = stage !== 'clean' ? stage : ''
  }

  /** Flash a whisper message and auto-fade after 4 s. */
  showWhisper(text: string, intensity: WhisperIntensity = 'low'): void {
    const overlay = this._whisperOverlay
    if (!overlay) return
    if (this._whisperTimeout !== null) {
      clearTimeout(this._whisperTimeout)
      this._whisperTimeout = null
    }
    overlay.textContent = text
    overlay.className = `visible ${intensity}`
    this._whisperTimeout = setTimeout(() => {
      overlay.classList.remove('visible')
      this._whisperTimeout = null
    }, 4_000)
  }

  /** Show the full-screen vessel warning. */
  showVesselWarning(): void {
    this._vesselWarning?.classList.add('visible')
  }

  destroy(): void {
    this._stopRadar()
    this._unsubscribeStore?.()
    if (this._whisperTimeout !== null) clearTimeout(this._whisperTimeout)
    this._root.remove()
  }

  // ─── Screen builder ───────────────────────────────────────────────────────

  private _buildScreens(): void {
    this._screens.demon = this._buildDemonSelect()
    this._screens.ritual = this._buildRitual()
    this._screens.grimoire = this._buildGrimoire()
    this._screens.charging = this._buildCharging()
    this._screens.study = this._buildStudy()
    this._screens.world = this._buildWorld()
    this._screens.clash = this._buildClash()
    this._screens.pvp = this._buildPvP()
    this._screens.coven = this._buildCoven()
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

    const btnRow = el('div')
    btnRow.style.cssText = 'display:flex;justify-content:center;gap:0.5rem;margin:0.75rem 0'

    const recordsBtn = el('button', '', 'records-btn')
    recordsBtn.style.margin = '0'
    recordsBtn.textContent = 'Records'
    recordsBtn.addEventListener('click', () => this.showGrimoire())
    btnRow.appendChild(recordsBtn)

    const mapBtn = el('button', '', 'map-btn')
    mapBtn.textContent = 'Map'
    mapBtn.addEventListener('click', () => this.showWorld())
    btnRow.appendChild(mapBtn)

    const pvpBtn = el('button', '', 'pvp-btn')
    pvpBtn.textContent = 'PvP'
    pvpBtn.addEventListener('click', () => this.showPvP())
    btnRow.appendChild(pvpBtn)

    const covenBtn = el('button', '', 'coven-btn')
    covenBtn.textContent = 'Coven'
    covenBtn.addEventListener('click', () => this.showCoven())
    btnRow.appendChild(covenBtn)

    screen.appendChild(btnRow)

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

    // Thin place indicator
    const placeWrap = el('div', '', 'charging-place-wrap')
    const placeLabel = el('div', '', 'charging-place-label')
    placeLabel.textContent = 'Thin Place'
    const placeName = el('div', '', 'charging-place-name')
    const placeBoost = el('div', '', 'charging-place-boost')
    placeWrap.appendChild(placeLabel)
    placeWrap.appendChild(placeName)
    placeWrap.appendChild(placeBoost)
    content.appendChild(placeWrap)

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

  private _buildWorld(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-world')

    const header = el('div', '', 'world-header')
    const backBtn = el('button', '', 'world-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => {
      this._stopRadar()
      this.showDemonSelect()
    })
    const h2 = el('h2')
    h2.textContent = 'Thin Places'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'world-content')

    // Radar canvas
    const radar = document.createElement('canvas')
    radar.id = 'world-radar'
    radar.width = 280
    radar.height = 280
    this._radarCanvas = radar
    content.appendChild(radar)

    // Location button
    const locBtn = el('button', '', 'world-loc-btn')
    locBtn.textContent = 'Enable Location'
    locBtn.addEventListener('click', () => this._callbacks?.onRequestLocation?.())
    content.appendChild(locBtn)

    // Location status
    const status = el('div', '', 'world-loc-status')
    status.textContent = 'Location not enabled'
    content.appendChild(status)

    // Current place card
    const currentPlace = el('div', '', 'world-current-place')
    currentPlace.innerHTML = `
      <div class="wcp-name"></div>
      <div class="wcp-veil"></div>
      <div class="wcp-boost"></div>
    `
    content.appendChild(currentPlace)

    // Nearby list
    const nearbyList = el('div', '', 'world-nearby-list')
    content.appendChild(nearbyList)

    // No location message
    const noLoc = el('p', '', 'world-no-location')
    noLoc.textContent = 'Enable location to discover Thin Places near you.'
    content.appendChild(noLoc)

    screen.appendChild(content)
    return screen
  }

  private _worldPlaceEntry(
    tp: ThinPlace,
    currentPlace: ThinPlace | null,
    playerPos: { lat: number; lng: number } | null,
  ): HTMLDivElement {
    const isCurrent = currentPlace?.id === tp.id
    const cls = `world-place-entry${tp.type === 'player_created' ? ' player-created' : ''}${isCurrent ? ' current' : ''}`
    const entry = el('div', cls)

    const dot = el('div', 'wpe-dot')
    const meta = el('div', 'wpe-meta')

    const nameEl = el('div', 'wpe-name')
    nameEl.textContent = _thinPlaceLabel(tp)

    const infoEl = el('div', 'wpe-info')
    if (playerPos) {
      const dist = _formatDistance(playerPos, tp.center)
      const bearing = bearingDeg(playerPos, tp.center)
      const dir = compassLabel(bearing)
      infoEl.textContent = `${dist} ${dir} · Veil ${Math.round(tp.veilStrength * 100)}%`
    } else {
      infoEl.textContent = `Radius ${tp.radiusMeters}m · Veil ${Math.round(tp.veilStrength * 100)}%`
    }

    meta.appendChild(nameEl)
    meta.appendChild(infoEl)
    entry.appendChild(dot)
    entry.appendChild(meta)
    return entry
  }

  // ─── PvP screen builders ────────────────────────────────────────────────

  private _buildClash(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-clash')

    const header = el('div', '', 'clash-header')
    const backBtn = el('button', '', 'clash-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showPvP())
    const h2 = el('h2')
    h2.textContent = 'Clash'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'clash-content')

    // Versus display
    const versus = el('div', '', 'clash-versus')

    const atkSide = el('div', 'clash-side', 'clash-attacker-side')
    const atkRole = el('div', 'cs-role')
    atkRole.textContent = 'Attacker'
    const atkName = el('div', 'cs-name', 'clash-attacker-name')
    const atkInt  = el('div', 'cs-integrity', 'clash-attacker-integrity')
    atkSide.appendChild(atkRole)
    atkSide.appendChild(atkName)
    atkSide.appendChild(atkInt)

    const divider = el('div', '', 'clash-vs-divider')
    divider.textContent = '⚔'

    const defSide = el('div', 'clash-side', 'clash-defender-side')
    const defRole = el('div', 'cs-role')
    defRole.textContent = 'Defender'
    const defName = el('div', 'cs-name', 'clash-defender-name')
    const defInt  = el('div', 'cs-integrity', 'clash-defender-integrity')
    defSide.appendChild(defRole)
    defSide.appendChild(defName)
    defSide.appendChild(defInt)

    versus.appendChild(atkSide)
    versus.appendChild(divider)
    versus.appendChild(defSide)
    content.appendChild(versus)

    // Outcome card
    const outcomeCard = el('div', '', 'clash-outcome')
    const coLabel   = el('div', 'co-label')
    coLabel.textContent = 'Outcome'
    const coOutcome = el('div', 'co-outcome', 'clash-outcome-text')
    const coDetails = el('div', 'co-details', 'clash-outcome-details')
    const coScore   = el('div', 'co-score', 'clash-outcome-score')
    outcomeCard.appendChild(coLabel)
    outcomeCard.appendChild(coOutcome)
    outcomeCard.appendChild(coDetails)
    outcomeCard.appendChild(coScore)
    content.appendChild(outcomeCard)

    screen.appendChild(content)
    return screen
  }

  private _buildPvP(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-pvp')

    const header = el('div', '', 'pvp-header')
    const backBtn = el('button', '', 'pvp-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showDemonSelect())
    const h2 = el('h2')
    h2.textContent = 'Hexes & Wards'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'pvp-content')

    // Active hexes
    const hexTitle = el('div', 'pvp-section-title')
    hexTitle.textContent = 'Active Hexes'
    content.appendChild(hexTitle)
    const hexList = el('div', '', 'pvp-hex-list')
    content.appendChild(hexList)

    // Active wards
    const wardTitle = el('div', 'pvp-section-title')
    wardTitle.style.marginTop = '0.75rem'
    wardTitle.textContent = 'Active Wards'
    content.appendChild(wardTitle)
    const wardList = el('div', '', 'pvp-ward-list')
    content.appendChild(wardList)

    // Last clash result link
    const clashBtn = el('button', '', 'pvp-last-clash-btn')
    clashBtn.style.cssText = 'margin-top:0.75rem;padding:0.4rem 1rem;border:1px solid #441133;background:transparent;color:#994433;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;align-self:center;'
    clashBtn.textContent = 'View Last Clash'
    clashBtn.addEventListener('click', () => this.showClash())
    content.appendChild(clashBtn)

    screen.appendChild(content)
    return screen
  }

  private _buildPvPEntry(hex: Hex): HTMLDivElement {
    const entry = el('div', `pvp-entry${hex.type === 'ward' ? ' ward' : ''}`)

    const typeEl = el('div', 'pe-type')
    typeEl.textContent = hex.type.toUpperCase()

    const intEl = el('div', 'pe-integrity')
    intEl.textContent = `Integrity ${Math.round(hex.sigil.overallIntegrity * 100)}% — ${hex.demon.name}`

    const expEl = el('div', 'pe-expires')
    const remainingMs = hex.expiresAt - Date.now()
    const remainingH = Math.max(0, Math.round(remainingMs / (60 * 60 * 1000)))
    expEl.textContent = `Expires in ~${remainingH}h`

    entry.appendChild(typeEl)
    entry.appendChild(intEl)
    entry.appendChild(expEl)
    return entry
  }

  private _buildCoven(): HTMLDivElement {
    const screen = el('div', 'screen', 'screen-coven')

    const header = el('div', '', 'coven-header')
    const backBtn = el('button', '', 'coven-back')
    backBtn.textContent = '← Back'
    backBtn.addEventListener('click', () => this.showDemonSelect())
    const h2 = el('h2')
    h2.textContent = 'Coven'
    header.appendChild(backBtn)
    header.appendChild(h2)
    screen.appendChild(header)

    const content = el('div', '', 'coven-content')

    // Coven name display
    const nameEl = el('div', '', 'coven-name')
    content.appendChild(nameEl)

    // "No coven" message + create form
    const noCovenEl = el('div', '', 'coven-no-coven')
    noCovenEl.textContent = 'You are not in a coven.'
    content.appendChild(noCovenEl)

    const createForm = el('div', '', 'coven-create-form')
    const input = el('input', '', 'coven-create-input') as unknown as HTMLInputElement
    input.type = 'text'
    input.placeholder = 'Coven name…'
    const createBtn = el('button', '', 'coven-create-btn')
    createBtn.textContent = 'Found Coven'
    createBtn.addEventListener('click', () => {
      const name = input.value.trim()
      if (name) this._callbacks?.onCreateCoven?.(name)
    })
    createForm.appendChild(input)
    createForm.appendChild(createBtn)
    content.appendChild(createForm)

    // Members section
    const membersTitle = el('div', 'pvp-section-title')
    membersTitle.textContent = 'Members'
    content.appendChild(membersTitle)
    const membersList = el('div', '', 'coven-members-list')
    content.appendChild(membersList)

    // Shared grimoire section
    const grimoireTitle = el('div', 'pvp-section-title')
    grimoireTitle.style.marginTop = '0.75rem'
    grimoireTitle.textContent = 'Shared Grimoire'
    content.appendChild(grimoireTitle)
    const grimoireList = el('div', '', 'coven-grimoire-list')
    content.appendChild(grimoireList)

    screen.appendChild(content)
    return screen
  }

  private _buildCorruptionOverlays(): void {
    // Corruption bar (fixed at bottom of viewport)
    const barWrap = document.createElement('div')
    barWrap.id = 'corruption-bar-wrap'
    const bar = document.createElement('div')
    bar.id = 'corruption-bar'
    barWrap.appendChild(bar)
    document.body.appendChild(barWrap)
    this._corruptionBarWrap = barWrap
    this._corruptionBar = bar

    // Whisper overlay
    const whisper = document.createElement('div')
    whisper.id = 'whisper-overlay'
    document.body.appendChild(whisper)
    this._whisperOverlay = whisper

    // Vessel warning
    const vessel = document.createElement('div')
    vessel.id = 'vessel-warning'
    vessel.innerHTML = `
      <h2>You Have Become a Vessel</h2>
      <p>The corruption is complete. You are now a conduit for demonic forces. Other practitioners may sense your presence.</p>
      <button id="vessel-warning-dismiss">I Understand</button>
    `
    vessel.querySelector('#vessel-warning-dismiss')?.addEventListener('click', () => {
      vessel.classList.remove('visible')
    })
    document.body.appendChild(vessel)
    this._vesselWarning = vessel
  }

  private _startRadar(): void {
    this._stopRadar()
    const loop = () => {
      this._drawRadar()
      this._radarAnimFrame = requestAnimationFrame(loop)
    }
    this._radarAnimFrame = requestAnimationFrame(loop)
  }

  private _stopRadar(): void {
    if (this._radarAnimFrame) {
      cancelAnimationFrame(this._radarAnimFrame)
      this._radarAnimFrame = 0
    }
  }

  private _drawRadar(): void {
    const canvas = this._radarCanvas
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(cx, cy) - 10
    const t = performance.now() / 1000

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = 'rgba(8, 5, 18, 0.95)'
    ctx.beginPath()
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
    ctx.fill()

    // Concentric rings
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (ring / 4) * r
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(80, 30, 120, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Cross-hairs
    ctx.strokeStyle = 'rgba(80, 30, 120, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy)
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r)
    ctx.stroke()

    // Sweeping radar arm
    const sweepAngle = (t * 0.8) % (Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, sweepAngle - Math.PI / 3, sweepAngle)
    ctx.fillStyle = 'rgba(140, 60, 220, 0.08)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r)
    ctx.strokeStyle = 'rgba(170, 80, 255, 0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Player dot at center
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // Nearby thin place dots
    if (this._worldPlayerPos) {
      const RADAR_RANGE_M = 5_000
      for (const tp of this._worldNearbyPlaces) {
        const bearing = bearingDeg(this._worldPlayerPos, tp.center) * (Math.PI / 180)
        // haversine approximation for radar position
        const dlat = (tp.center.lat - this._worldPlayerPos.lat) * 111_000
        const dlng = (tp.center.lng - this._worldPlayerPos.lng) * 111_000 * Math.cos(this._worldPlayerPos.lat * Math.PI / 180)
        const dist = Math.sqrt(dlat * dlat + dlng * dlng)
        const frac = Math.min(1, dist / RADAR_RANGE_M)

        const px = cx + Math.sin(bearing) * frac * r
        const py = cy - Math.cos(bearing) * frac * r

        const isCurrent = this._worldCurrentPlace?.id === tp.id
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + tp.id.length)
        const dotR = isCurrent ? 7 : 4 + (1 - tp.veilStrength) * 3

        ctx.beginPath()
        ctx.arc(px, py, dotR * pulse, 0, Math.PI * 2)
        ctx.fillStyle = isCurrent
          ? `rgba(85, 255, 170, ${0.7 * pulse})`
          : tp.type === 'player_created'
            ? `rgba(255, 170, 51, ${0.7 * pulse})`
            : `rgba(170, 85, 255, ${0.7 * pulse})`
        ctx.fill()
      }
    } else {
      // No location — draw placeholder text
      ctx.fillStyle = 'rgba(80, 50, 100, 0.5)'
      ctx.font = '12px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Awaiting location…', cx, cy + 20)
    }
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
    if (name !== 'world') this._stopRadar()
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

// ─── World map helpers ────────────────────────────────────────────────────────

function _thinPlaceLabel(tp: ThinPlace): string {
  const typeTag = tp.type === 'player_created' ? ' ✦' : tp.type === 'dynamic' ? ' ◉' : ''
  return (tp.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) + typeTag
}

function _formatDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string {
  const dlat = (to.lat - from.lat) * 111_000
  const dlng = (to.lng - from.lng) * 111_000 * Math.cos(from.lat * Math.PI / 180)
  const m = Math.round(Math.sqrt(dlat * dlat + dlng * dlng))
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
}
