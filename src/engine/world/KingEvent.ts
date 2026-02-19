import type { Demon } from '../sigil/Types.ts'

// ─── Types ─────────────────────────────────────────────────────────────────

export type KingEventPhase = 'assembling' | 'active' | 'resolved' | 'collapsed'
export type KingLayer = 'seal' | 'glyphs' | 'ring'

export interface KingEventParticipant {
  playerId: string
  layer: KingLayer
  progress: number   // 0–1 for their assigned layer
  connected: boolean
}

export interface KingEvent {
  id: string
  demon: Demon
  phase: KingEventPhase
  participants: KingEventParticipant[]
  startedAt: number
  initiatorId: string
  /** Set when the event collapses. Null otherwise. */
  collapseExpiresAt: number | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

const KING_WORLD_EVENT_DURATION_MS = 24 * 60 * 60 * 1000  // 24 h

const ALL_LAYERS: KingLayer[] = ['seal', 'glyphs', 'ring']

// ─── Functions ─────────────────────────────────────────────────────────────

/** Create a King event. The initiator is automatically assigned the seal layer. */
export function createKingEvent(
  demon: Demon,
  initiatorId: string,
  now: number,
): KingEvent {
  return {
    id:                `king-${demon.id}-${now}`,
    demon,
    phase:             'assembling',
    participants:      [{ playerId: initiatorId, layer: 'seal', progress: 0, connected: true }],
    startedAt:         now,
    initiatorId,
    collapseExpiresAt: null,
  }
}

/**
 * Join a King event, taking the next available layer.
 * Returns the assigned layer (or null if all layers are taken).
 * Phase transitions to 'active' when all three layers are filled.
 */
export function joinKingEvent(
  event: KingEvent,
  playerId: string,
): { event: KingEvent; layer: KingLayer | null } {
  const taken = new Set(event.participants.map(p => p.layer))
  const available = ALL_LAYERS.filter(l => !taken.has(l))
  if (available.length === 0) return { event, layer: null }

  const layer = available[0]
  const newParticipants: KingEventParticipant[] = [
    ...event.participants,
    { playerId, layer, progress: 0, connected: true },
  ]
  const allFilled = newParticipants.length === 3
  const updated: KingEvent = {
    ...event,
    participants: newParticipants,
    phase: allFilled ? 'active' : 'assembling',
  }
  return { event: updated, layer }
}

/** Update a participant's layer progress (0–1). */
export function updateParticipantProgress(
  event: KingEvent,
  playerId: string,
  progress: number,
): KingEvent {
  return {
    ...event,
    participants: event.participants.map(p =>
      p.playerId === playerId ? { ...p, progress: Math.min(1, Math.max(0, progress)) } : p,
    ),
  }
}

/** Mark a participant as disconnected. */
export function disconnectParticipant(
  event: KingEvent,
  playerId: string,
): KingEvent {
  return {
    ...event,
    participants: event.participants.map(p =>
      p.playerId === playerId ? { ...p, connected: false } : p,
    ),
  }
}

/** Returns true when all three layers are at 100% progress. */
export function isKingEventComplete(event: KingEvent): boolean {
  return ALL_LAYERS.every(layer => {
    const p = event.participants.find(p => p.layer === layer)
    return p !== undefined && p.progress >= 1.0
  })
}

/**
 * Collapse the event (any participant disconnected or a layer failed).
 * The demon becomes a 24 h world threat affecting all nearby players.
 */
export function collapseKingEvent(event: KingEvent, now: number): KingEvent {
  return {
    ...event,
    phase:             'collapsed',
    collapseExpiresAt: now + KING_WORLD_EVENT_DURATION_MS,
  }
}

/** Returns true if a collapsed event is still active as a world threat. */
export function isCollapseActive(event: KingEvent, now: number): boolean {
  return (
    event.phase === 'collapsed' &&
    event.collapseExpiresAt !== null &&
    now < event.collapseExpiresAt
  )
}

/** Mark the event as resolved (successfully completed). */
export function resolveKingEvent(event: KingEvent): KingEvent {
  return { ...event, phase: 'resolved' }
}
