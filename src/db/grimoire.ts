import type { Sigil, SigilStatus } from '@engine/sigil/Types'
import type { ResearchState } from '@engine/research/ResearchEngine'
import type { DecayState } from '@engine/sigil/DecayEngine'
import type { FamiliarityState } from '@engine/familiarity/FamiliarityEngine'
import type { DreamState } from '@engine/sigil/DreamEngine'
import type { GrimoireMemory } from '@engine/grimoire/PalimpsestEngine'
import type { FeralSigilState } from '@engine/grimoire/FeralEngine'
import type { GlyphDrawingHistory } from '@engine/sigil/GlyphEvolution'
import type { ShadowEntry } from '@engine/grimoire/ShadowGrimoire'
import type { DemonOffer } from '@engine/demands/NegotiationEngine'

// ─── Page model ────────────────────────────────────────────────────────────

export type GrimoirePage = {
  demonId: string
  sigils: Sigil[]
}

// ─── Storage data model ────────────────────────────────────────────────────

interface GrimoireData {
  pages: GrimoirePage[]
  research: Record<string, ResearchState>
  decay?: Record<string, DecayState>
  familiarity?: Record<string, FamiliarityState>
  dream?: Record<string, DreamState>
  grimoireMemory?: GrimoireMemory
  feral?: Record<string, FeralSigilState>
  glyphHistory?: Record<string, GlyphDrawingHistory>
  shadowEntries?: ShadowEntry[]
  activeOffers?: DemonOffer[]
}

// ─── Valid status transitions ──────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SigilStatus, SigilStatus[]> = {
  draft:     ['complete'],
  complete:  ['resting'],
  resting:   ['awakened', 'complete'],
  awakened:  ['charged', 'spent', 'resting'],
  charged:   ['spent', 'awakened'],
  spent:     [],
}

// ─── Storage key ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'goetia:grimoire'

// ─── GrimoireDB ────────────────────────────────────────────────────────────

export class GrimoireDB {
  private pages: GrimoirePage[] = []
  private research: Record<string, ResearchState> = {}
  private decay: Record<string, DecayState> = {}
  private familiarity: Record<string, FamiliarityState> = {}
  private dream: Record<string, DreamState> = {}
  private grimoireMemory: GrimoireMemory | null = null
  private feral: Record<string, FeralSigilState> = {}
  private glyphHistory: Record<string, GlyphDrawingHistory> = {}
  private shadowEntries: ShadowEntry[] = []
  private activeOffers: DemonOffer[] = []

  // ─── Private I/O ──────────────────────────────────────────────────────────

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        this.pages = []
        this.research = {}
        this.decay = {}
        this.familiarity = {}
        this.dream = {}
        this.grimoireMemory = null
        this.feral = {}
        this.glyphHistory = {}
        this.shadowEntries = []
        this.activeOffers = []
        return
      }
      const parsed = JSON.parse(raw) as GrimoireData | GrimoirePage[]
      // Backwards-compatible: old format was a plain GrimoirePage[]
      if (Array.isArray(parsed)) {
        this.pages = parsed
        this.research = {}
        this.decay = {}
        this.familiarity = {}
        this.dream = {}
        this.grimoireMemory = null
        this.feral = {}
        this.glyphHistory = {}
        this.shadowEntries = []
        this.activeOffers = []
      } else {
        this.pages = parsed.pages ?? []
        this.research = parsed.research ?? {}
        this.decay = parsed.decay ?? {}
        this.familiarity = parsed.familiarity ?? {}
        this.dream = parsed.dream ?? {}
        this.grimoireMemory = parsed.grimoireMemory ?? null
        this.feral = parsed.feral ?? {}
        this.glyphHistory = parsed.glyphHistory ?? {}
        this.shadowEntries = parsed.shadowEntries ?? []
        this.activeOffers = parsed.activeOffers ?? []
      }
    } catch {
      this.pages = []
      this.research = {}
      this.decay = {}
      this.familiarity = {}
      this.dream = {}
      this.grimoireMemory = null
      this.feral = {}
      this.glyphHistory = {}
      this.shadowEntries = []
      this.activeOffers = []
    }
  }

  private persist(): void {
    try {
      const data: GrimoireData = { pages: this.pages, research: this.research, decay: this.decay, familiarity: this.familiarity, dream: this.dream, grimoireMemory: this.grimoireMemory ?? undefined, feral: Object.keys(this.feral).length > 0 ? this.feral : undefined, glyphHistory: Object.keys(this.glyphHistory).length > 0 ? this.glyphHistory : undefined, shadowEntries: this.shadowEntries.length > 0 ? this.shadowEntries : undefined, activeOffers: this.activeOffers.length > 0 ? this.activeOffers : undefined }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }

  // ─── Page reads ───────────────────────────────────────────────────────────

  getAll(): GrimoirePage[] {
    this.load()
    return this.pages
  }

  getPage(demonId: string): GrimoirePage | undefined {
    this.load()
    return this.pages.find(p => p.demonId === demonId)
  }

  getOrCreatePage(demonId: string): GrimoirePage {
    this.load()
    let page = this.pages.find(p => p.demonId === demonId)
    if (!page) {
      page = { demonId, sigils: [] }
      this.pages.push(page)
      this.persist()
    }
    return page
  }

  // ─── Page writes ──────────────────────────────────────────────────────────

  saveSigil(sigil: Sigil): void {
    this.load()
    this._upsertSigil(sigil)
    this.persist()
  }

  saveSigilsBatch(sigils: Sigil[]): void {
    this.load()
    for (const sigil of sigils) this._upsertSigil(sigil)
    this.persist()
  }

  /** Atomically persist sigils and decay states in a single load/persist cycle. */
  saveDecayBatch(sigils: Sigil[], decayStates: Record<string, DecayState>): GrimoirePage[] {
    this.load()
    for (const sigil of sigils) this._upsertSigil(sigil)
    this.decay = { ...decayStates }
    this.persist()
    return this.pages
  }

  private _upsertSigil(sigil: Sigil): void {
    let page = this.pages.find(p => p.demonId === sigil.demonId)
    if (!page) {
      page = { demonId: sigil.demonId, sigils: [] }
      this.pages.push(page)
    }
    const existingIndex = page.sigils.findIndex(s => s.id === sigil.id)
    if (existingIndex >= 0) {
      page.sigils[existingIndex] = sigil
    } else {
      page.sigils.push(sigil)
    }
  }

  updateSigilStatus(sigilId: string, newStatus: SigilStatus): void {
    this.load()
    for (const page of this.pages) {
      const sigil = page.sigils.find(s => s.id === sigilId)
      if (sigil) {
        const allowed = VALID_TRANSITIONS[sigil.status]
        if (!allowed.includes(newStatus)) {
          throw new Error(
            `Invalid status transition: ${sigil.status} → ${newStatus}`,
          )
        }
        sigil.status = newStatus
        sigil.statusChangedAt = Date.now()
        this.persist()
        return
      }
    }
    throw new Error(`Sigil not found: ${sigilId}`)
  }

  deleteSigil(sigilId: string): void {
    this.load()
    for (const page of this.pages) {
      const index = page.sigils.findIndex(s => s.id === sigilId)
      if (index >= 0) {
        page.sigils.splice(index, 1)
        this.persist()
        return
      }
    }
  }

  clearAll(): void {
    this.pages = []
    this.research = {}
    this.decay = {}
    this.familiarity = {}
    this.dream = {}
    this.grimoireMemory = null
    this.feral = {}
    this.glyphHistory = {}
    this.shadowEntries = []
    this.activeOffers = []
    this.persist()
  }

  // ─── Decay reads ─────────────────────────────────────────────────────────

  getDecayState(sigilId: string): DecayState | null {
    this.load()
    return this.decay[sigilId] ?? null
  }

  getAllDecayStates(): Record<string, DecayState> {
    this.load()
    return { ...this.decay }
  }

  // ─── Decay writes ────────────────────────────────────────────────────────

  saveDecayState(state: DecayState): void {
    this.load()
    this.decay[state.sigilId] = state
    this.persist()
  }

  saveAllDecayStates(states: Record<string, DecayState>): void {
    this.load()
    this.decay = { ...states }
    this.persist()
  }

  // ─── Familiarity reads ─────────────────────────────────────────────────────

  getFamiliarity(demonId: string): FamiliarityState | null {
    this.load()
    return this.familiarity[demonId] ?? null
  }

  getAllFamiliarity(): Record<string, FamiliarityState> {
    this.load()
    return { ...this.familiarity }
  }

  // ─── Familiarity writes ────────────────────────────────────────────────────

  saveFamiliarity(state: FamiliarityState): void {
    this.load()
    this.familiarity[state.demonId] = state
    this.persist()
  }

  // ─── Dream reads ────────────────────────────────────────────────────────

  getDreamState(sigilId: string): DreamState | null {
    this.load()
    return this.dream[sigilId] ?? null
  }

  getAllDreamStates(): Record<string, DreamState> {
    this.load()
    return { ...this.dream }
  }

  // ─── Dream writes ───────────────────────────────────────────────────────

  /** Atomically persist sigils and dream states in a single load/persist cycle. */
  saveDreamBatch(sigils: Sigil[], dreamStates: Record<string, DreamState>): GrimoirePage[] {
    this.load()
    for (const sigil of sigils) this._upsertSigil(sigil)
    this.dream = { ...dreamStates }
    this.persist()
    return this.pages
  }

  // ─── Grimoire memory ─────────────────────────────────────────────────────

  getGrimoireMemory(): GrimoireMemory | null {
    this.load()
    return this.grimoireMemory
  }

  saveGrimoireMemory(memory: GrimoireMemory): void {
    this.load()
    this.grimoireMemory = memory
    this.persist()
  }

  // ─── Feral states ──────────────────────────────────────────────────────────

  getAllFeralStates(): Record<string, FeralSigilState> {
    this.load()
    return this.feral
  }

  saveFeralStates(states: Record<string, FeralSigilState>): void {
    this.load()
    this.feral = states
    this.persist()
  }

  // ─── Glyph history ────────────────────────────────────────────────────────

  getAllGlyphHistory(): Record<string, GlyphDrawingHistory> {
    this.load()
    return this.glyphHistory
  }

  saveGlyphHistory(history: Record<string, GlyphDrawingHistory>): void {
    this.load()
    this.glyphHistory = history
    this.persist()
  }

  // ─── Shadow entries ──────────────────────────────────────────────────────

  getAllShadowEntries(): ShadowEntry[] {
    this.load()
    return this.shadowEntries
  }

  saveShadowEntries(entries: ShadowEntry[]): void {
    this.load()
    this.shadowEntries = entries
    this.persist()
  }

  // ─── Active offers ───────────────────────────────────────────────────────

  getAllActiveOffers(): DemonOffer[] {
    this.load()
    return this.activeOffers
  }

  saveActiveOffers(offers: DemonOffer[]): void {
    this.load()
    this.activeOffers = offers
    this.persist()
  }

  // ─── Research reads ───────────────────────────────────────────────────────

  getResearch(demonId: string): ResearchState | null {
    this.load()
    return this.research[demonId] ?? null
  }

  getAllResearch(): Record<string, ResearchState> {
    this.load()
    return { ...this.research }
  }

  // ─── Research writes ──────────────────────────────────────────────────────

  saveResearch(state: ResearchState): void {
    this.load()
    this.research[state.demonId] = state
    this.persist()
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

export const grimoireDB = new GrimoireDB()
