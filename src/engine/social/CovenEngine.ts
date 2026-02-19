import type { Sigil } from '@engine/sigil/Types'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Coven {
  id: string
  name: string
  members: string[]         // player IDs
  sharedGrimoire: Sigil[]   // sigils contributed to the coven
  createdAt: number
}

/** Records of betrayals for social accountability (no automatic enforcement). */
export interface BetrayalRecord {
  betrayerId: string
  sigilId: string
  targetPlayerId: string
  exposedAt: number
}

export interface CovenState {
  coven: Coven
  betrayals: BetrayalRecord[]
}

// ─── Factory ────────────────────────────────────────────────────────────────

/** Create a new coven. The founder is automatically added as the first member. */
export function createCoven(name: string, founderId: string, now: number): CovenState {
  return {
    coven: {
      id: `coven-${founderId}-${now}`,
      name,
      members: [founderId],
      sharedGrimoire: [],
      createdAt: now,
    },
    betrayals: [],
  }
}

// ─── Membership ─────────────────────────────────────────────────────────────

/** Add a player to the coven. No-ops if they are already a member. */
export function inviteMember(state: CovenState, playerId: string): CovenState {
  if (state.coven.members.includes(playerId)) return state
  return {
    ...state,
    coven: {
      ...state.coven,
      members: [...state.coven.members, playerId],
    },
  }
}

/** Remove a player from the coven. No-ops if they are not a member. */
export function removeMember(state: CovenState, playerId: string): CovenState {
  return {
    ...state,
    coven: {
      ...state.coven,
      members: state.coven.members.filter(id => id !== playerId),
    },
  }
}

// ─── Grimoire ────────────────────────────────────────────────────────────────

/** Contribute a sigil to the coven's shared grimoire. */
export function contributeSigil(state: CovenState, sigil: Sigil): CovenState {
  return {
    ...state,
    coven: {
      ...state.coven,
      sharedGrimoire: [...state.coven.sharedGrimoire, sigil],
    },
  }
}

// ─── Betrayal ────────────────────────────────────────────────────────────────

/**
 * Expose a sigil from the coven's shared grimoire to a target player.
 * Purely social — no automatic enforcement. The game records the betrayal.
 */
export function exposeSigil(
  state: CovenState,
  betrayerId: string,
  sigilId: string,
  targetPlayerId: string,
  now: number,
): CovenState {
  const record: BetrayalRecord = { betrayerId, sigilId, targetPlayerId, exposedAt: now }
  return { ...state, betrayals: [...state.betrayals, record] }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Check whether a player is a member of the coven. */
export function isMember(state: CovenState, playerId: string): boolean {
  return state.coven.members.includes(playerId)
}

/** Return all betrayal records involving a specific player as the betrayer. */
export function getBetrayalsByPlayer(state: CovenState, playerId: string): BetrayalRecord[] {
  return state.betrayals.filter(b => b.betrayerId === playerId)
}
