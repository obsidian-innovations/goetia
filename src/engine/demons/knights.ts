import type { Demon } from '../sigil/Types.ts'
import { circle, hub, mkEdge, pentagram } from './geometry.ts'

// ─── Furcas — 50th Spirit ─────────────────────────────────────────────────
// Knight ruling 20 legions. Teaches philosophy, astronomy, rhetoric, logic.
const FURCAS: Demon = (() => {
  const ns = circle('furcas', 5, 0.42)
  const h  = hub('furcas')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[1], 0.10), mkEdge(h, ns[2], 0.10),
    mkEdge(h, ns[3], 0.10), mkEdge(h, ns[4], 0.10),
  ]
  return {
    id: 'furcas', name: 'Furcas', rank: 'Knight',
    domains: ['knowledge', 'revelation'], legions: 20,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The fiftieth spirit, a knight commanding 20 legions. He appears as a cruel old man riding a pale horse. He teaches philosophy, astronomy, rhetoric, logic, chiromancy, and pyromancy.',
  }
})()

// ─── Stolas — 36th Spirit ─────────────────────────────────────────────────
// Knight/Prince ruling 26 legions. Teaches astronomy and the virtues of herbs.
const STOLAS: Demon = (() => {
  const { nodes, edges } = pentagram('stolas')
  return {
    id: 'stolas', name: 'Stolas', rank: 'Knight',
    domains: ['knowledge', 'revelation'], legions: 26,
    sealGeometry: { nodes, edges },
    description: 'The thirty-sixth spirit, a great prince commanding 26 legions. He appears in the form of a mighty raven, then as a man. He teaches the art of astronomy and the virtues of herbs and precious stones.',
  }
})()

// ─── Orobas — 55th Spirit ─────────────────────────────────────────────────
// Knight/Prince ruling 20 legions. Discovers past/present/future; gives dignities.
const OROBAS: Demon = (() => {
  const ns = circle('orobas', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.17), mkEdge(ns[2], ns[4], 0.17), mkEdge(ns[4], ns[0], 0.17),
    mkEdge(ns[1], ns[3], 0.17), mkEdge(ns[3], ns[5], 0.16), mkEdge(ns[5], ns[1], 0.16),
  ]
  return {
    id: 'orobas', name: 'Orobas', rank: 'Knight',
    domains: ['knowledge', 'binding'], legions: 20,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-fifth spirit, a great prince commanding 20 legions. He appears first as a horse, then as a man. He discovers the past, present, and future, gives dignities and prelacies, and is faithful to the conjuror.',
  }
})()

export const KNIGHTS: Demon[] = [FURCAS, STOLAS, OROBAS]
