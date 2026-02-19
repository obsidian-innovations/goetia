import type { Demon } from '../sigil/Types.ts'
import { KINGS }      from './kings.ts'
import { DUKES }      from './dukes.ts'
import { PRINCES }    from './princes.ts'
import { MARQUISES }  from './marquises.ts'
import { EARLS }      from './earls.ts'
import { PRESIDENTS } from './presidents.ts'
import { KNIGHTS }    from './knights.ts'
import { BARONS }     from './barons.ts'

// ─── Errors ────────────────────────────────────────────────────────────────

export class DemonNotFoundError extends Error {
  readonly id: string
  constructor(id: string) {
    super(`Demon not found: "${id}"`)
    this.id = id
    this.name = 'DemonNotFoundError'
  }
}

// ─── Registry ──────────────────────────────────────────────────────────────

const ALL_DEMONS: Demon[] = [
  ...KINGS,
  ...DUKES,
  ...PRINCES,
  ...MARQUISES,
  ...EARLS,
  ...PRESIDENTS,
  ...KNIGHTS,
  ...BARONS,
]

/** The id of the starting demon visible to all players by default. */
export const STARTER_DEMON_ID = 'bael'

export const DEMON_REGISTRY: Record<string, Demon> = Object.fromEntries(
  ALL_DEMONS.map(d => [d.id, d]),
)

/**
 * Retrieve a demon by its lowercase string id.
 * @throws {DemonNotFoundError} if no demon with that id exists in the registry.
 */
export function getDemon(id: string): Demon {
  const demon = DEMON_REGISTRY[id]
  if (demon === undefined) {
    throw new DemonNotFoundError(id)
  }
  return demon
}

/** Return all demons in the registry as an ordered array. */
export function listDemons(): Demon[] {
  return Object.values(DEMON_REGISTRY)
}
