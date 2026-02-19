import { describe, it, expect } from 'vitest'
import {
  createKingEvent,
  joinKingEvent,
  updateParticipantProgress,
  disconnectParticipant,
  isKingEventComplete,
  collapseKingEvent,
  isCollapseActive,
  resolveKingEvent,
} from './KingEvent'
import type { Demon } from '../sigil/Types'

function makeDemon(): Demon {
  return {
    id: 'bael', name: 'Bael', rank: 'King', domains: ['illusion', 'knowledge'],
    legions: 66, sealGeometry: { nodes: [], edges: [] }, description: '',
  }
}

describe('createKingEvent', () => {
  it('starts in assembling phase', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(ev.phase).toBe('assembling')
  })

  it('assigns initiator to seal layer', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(ev.participants[0].layer).toBe('seal')
    expect(ev.participants[0].playerId).toBe('p1')
  })

  it('starts with 1 participant', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(ev.participants).toHaveLength(1)
  })
})

describe('joinKingEvent', () => {
  it('assigns next available layer', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    const { layer } = joinKingEvent(ev, 'p2')
    expect(layer).toBe('glyphs')
  })

  it('returns null when all layers taken', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = joinKingEvent(ev, 'p2').event
    ev = joinKingEvent(ev, 'p3').event
    const { layer } = joinKingEvent(ev, 'p4')
    expect(layer).toBeNull()
  })

  it('transitions to active when all three join', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = joinKingEvent(ev, 'p2').event
    expect(ev.phase).toBe('assembling')
    ev = joinKingEvent(ev, 'p3').event
    expect(ev.phase).toBe('active')
  })

  it('does not mutate original event', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    joinKingEvent(ev, 'p2')
    expect(ev.participants).toHaveLength(1)
  })
})

describe('updateParticipantProgress', () => {
  it('updates the correct participant', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = updateParticipantProgress(ev, 'p1', 0.5)
    expect(ev.participants[0].progress).toBeCloseTo(0.5)
  })

  it('clamps progress to 1.0', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = updateParticipantProgress(ev, 'p1', 1.5)
    expect(ev.participants[0].progress).toBe(1.0)
  })
})

describe('isKingEventComplete', () => {
  it('returns false when not all layers filled', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(isKingEventComplete(ev)).toBe(false)
  })

  it('returns false when layers filled but progress < 1', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = joinKingEvent(ev, 'p2').event
    ev = joinKingEvent(ev, 'p3').event
    expect(isKingEventComplete(ev)).toBe(false)
  })

  it('returns true when all layers at 1.0 progress', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = joinKingEvent(ev, 'p2').event
    ev = joinKingEvent(ev, 'p3').event
    ev = updateParticipantProgress(ev, 'p1', 1.0)
    ev = updateParticipantProgress(ev, 'p2', 1.0)
    ev = updateParticipantProgress(ev, 'p3', 1.0)
    expect(isKingEventComplete(ev)).toBe(true)
  })
})

describe('collapseKingEvent', () => {
  it('sets phase to collapsed', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(collapseKingEvent(ev, 0).phase).toBe('collapsed')
  })

  it('sets collapseExpiresAt 24h in the future', () => {
    const ev = collapseKingEvent(createKingEvent(makeDemon(), 'p1', 0), 0)
    expect(ev.collapseExpiresAt).toBe(24 * 60 * 60 * 1000)
  })
})

describe('isCollapseActive', () => {
  it('returns true within collapse window', () => {
    const ev = collapseKingEvent(createKingEvent(makeDemon(), 'p1', 0), 0)
    expect(isCollapseActive(ev, 1000)).toBe(true)
  })

  it('returns false after collapse window expires', () => {
    const ev = collapseKingEvent(createKingEvent(makeDemon(), 'p1', 0), 0)
    expect(isCollapseActive(ev, ev.collapseExpiresAt! + 1)).toBe(false)
  })

  it('returns false for non-collapsed event', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(isCollapseActive(ev, 1000)).toBe(false)
  })
})

describe('resolveKingEvent', () => {
  it('sets phase to resolved', () => {
    const ev = createKingEvent(makeDemon(), 'p1', 0)
    expect(resolveKingEvent(ev).phase).toBe('resolved')
  })
})

describe('disconnectParticipant', () => {
  it('marks participant as not connected', () => {
    let ev = createKingEvent(makeDemon(), 'p1', 0)
    ev = disconnectParticipant(ev, 'p1')
    expect(ev.participants[0].connected).toBe(false)
  })
})
