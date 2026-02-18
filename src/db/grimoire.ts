import type { Sigil, SigilStatus } from '@engine/sigil/Types'

// ─── Page model ────────────────────────────────────────────────────────────

export type GrimoirePage = {
  demonId: string
  sigils: Sigil[]
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

  // ─── Private I/O ──────────────────────────────────────────────────────────

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      this.pages = raw ? (JSON.parse(raw) as GrimoirePage[]) : []
    } catch {
      this.pages = []
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pages))
    } catch {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

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

  // ─── Writes ───────────────────────────────────────────────────────────────

  saveSigil(sigil: Sigil): void {
    this.load()
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
    this.persist()
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
    this.persist()
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────────

export const grimoireDB = new GrimoireDB()
