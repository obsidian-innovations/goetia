import type { Sigil, SigilStatus } from './Types'

// ─── Valid transitions ──────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SigilStatus, SigilStatus[]> = {
  draft:    ['complete'],
  complete: ['resting'],
  resting:  ['awakened', 'complete'],
  awakened: ['charged', 'spent', 'resting'],
  charged:  ['spent', 'awakened'],
  spent:    [],
}

// ─── SigilLifecycleManager ─────────────────────────────────────────────────

export class SigilLifecycleManager {
  /**
   * Returns true if transitioning from `from` to `to` is allowed.
   */
  canTransition(from: SigilStatus, to: SigilStatus): boolean {
    return VALID_TRANSITIONS[from].includes(to)
  }

  /**
   * Returns a new Sigil with updated status and `statusChangedAt` timestamp.
   * Throws if the transition is invalid.
   */
  transition(sigil: Sigil, to: SigilStatus): Sigil {
    if (!this.canTransition(sigil.status, to)) {
      throw new Error(`Invalid sigil status transition: ${sigil.status} → ${to}`)
    }
    return {
      ...sigil,
      status: to,
      statusChangedAt: Date.now(),
    }
  }

  /**
   * Returns milliseconds since the sigil's last status change.
   */
  getTimeSinceStatusChange(sigil: Sigil): number {
    const changedAt = sigil.statusChangedAt ?? sigil.createdAt
    return Date.now() - changedAt
  }
}
