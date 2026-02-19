import type { Demon, SealNode, SealEdge } from '../sigil/Types.ts'
import { nid, mkEdge, circle, hub, pentagram } from './geometry.ts'

// ─── Bael — 1st Spirit ─────────────────────────────────────────────────────
// King ruling 66 legions. Hexagram: two interlocked triangles.
const BAEL: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('bael-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('bael-n2'), position: { x: 0.88, y: 0.27 } },
    { id: nid('bael-n3'), position: { x: 0.88, y: 0.73 } },
    { id: nid('bael-n4'), position: { x: 0.50, y: 0.95 } },
    { id: nid('bael-n5'), position: { x: 0.12, y: 0.73 } },
    { id: nid('bael-n6'), position: { x: 0.12, y: 0.27 } },
  ]
  const [n1, n2, n3, n4, n5, n6] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n3, 0.17), mkEdge(n3, n5, 0.17), mkEdge(n5, n1, 0.17),
    mkEdge(n2, n4, 0.17), mkEdge(n4, n6, 0.16), mkEdge(n6, n2, 0.16),
  ]
  return {
    id: 'bael', name: 'Bael', rank: 'King',
    domains: ['illusion', 'knowledge'], legions: 66,
    sealGeometry: { nodes: ns, edges },
    description: 'The first spirit of the Ars Goetia, a king commanding 66 legions. Appears with three heads — toad, cat, and man. Makes those who invoke him invisible and teaches wisdom.',
  }
})()

// ─── Paimon — 9th Spirit ──────────────────────────────────────────────────
// King ruling 200 legions. Crown geometry: arcs and spurs.
const PAIMON: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('paimon-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('paimon-n2'), position: { x: 0.25, y: 0.15 } },
    { id: nid('paimon-n3'), position: { x: 0.75, y: 0.15 } },
    { id: nid('paimon-n4'), position: { x: 0.10, y: 0.55 } },
    { id: nid('paimon-n5'), position: { x: 0.90, y: 0.55 } },
    { id: nid('paimon-n6'), position: { x: 0.30, y: 0.85 } },
    { id: nid('paimon-n7'), position: { x: 0.70, y: 0.85 } },
    { id: nid('paimon-n8'), position: { x: 0.50, y: 0.50 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7, n8] = ns
  const edges: SealEdge[] = [
    mkEdge(n4, n2, 0.10), mkEdge(n2, n1, 0.10), mkEdge(n1, n3, 0.10), mkEdge(n3, n5, 0.10),
    mkEdge(n4, n6, 0.10), mkEdge(n6, n7, 0.10), mkEdge(n7, n5, 0.10),
    mkEdge(n8, n1, 0.10), mkEdge(n8, n6, 0.10), mkEdge(n8, n7, 0.10),
  ]
  return {
    id: 'paimon', name: 'Paimon', rank: 'King',
    domains: ['knowledge', 'binding'], legions: 200,
    sealGeometry: { nodes: ns, edges },
    description: 'The ninth spirit, a great king most obedient to Lucifer, commanding 200 legions. He appears with a crown, riding a dromedary. He teaches all arts and sciences and declares all secrets.',
  }
})()

// ─── Beleth — 13th Spirit ──────────────────────────────────────────────────
// King ruling 85 legions. Causes love. Pentagram geometry.
const BELETH: Demon = (() => {
  const { nodes, edges } = pentagram('beleth')
  return {
    id: 'beleth', name: 'Beleth', rank: 'King',
    domains: ['discord', 'binding'], legions: 85,
    sealGeometry: { nodes, edges },
    description: 'The thirteenth spirit, a mighty king riding a pale horse, with trumpets sounding. Commands 85 legions. Causes love between man and woman.',
  }
})()

// ─── Purson — 20th Spirit ─────────────────────────────────────────────────
// King ruling 22 legions. Knows hidden things. 6-node spiral geometry.
const PURSON: Demon = (() => {
  const ns = circle('purson', 6)
  const h  = hub('purson')
  const edges: SealEdge[] = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[0], 0.15),
    mkEdge(ns[1], ns[3], 0.14), mkEdge(ns[3], ns[5], 0.14),
    mkEdge(h, ns[0], 0.14), mkEdge(h, ns[3], 0.13),
  ]
  return {
    id: 'purson', name: 'Purson', rank: 'King',
    domains: ['knowledge', 'revelation'], legions: 22,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The twentieth spirit, a great king with a lion\'s face, riding a bear and carrying a viper. Commands 22 legions. He knows all hidden things, past, present, and future.',
  }
})()

// ─── Asmodai — 32nd Spirit ────────────────────────────────────────────────
// King ruling 72 legions. Heptagram skip-3 geometry.
const ASMODAI: Demon = (() => {
  const ns = circle('asmodai', 7)
  const edges: SealEdge[] = [
    mkEdge(ns[0], ns[3], 0.15), mkEdge(ns[3], ns[6], 0.15), mkEdge(ns[6], ns[2], 0.15),
    mkEdge(ns[2], ns[5], 0.14), mkEdge(ns[5], ns[1], 0.14),
    mkEdge(ns[1], ns[4], 0.14), mkEdge(ns[4], ns[0], 0.13),
  ]
  return {
    id: 'asmodai', name: 'Asmodai', rank: 'King',
    domains: ['destruction', 'discord', 'binding'], legions: 72,
    sealGeometry: { nodes: ns, edges },
    description: 'The thirty-second spirit, a mighty king and one of the most powerful. Commands 72 legions. He gives the Ring of Virtues and teaches arithmetic, astronomy, geomancy, and crafts.',
  }
})()

// ─── Vine — 45th Spirit ───────────────────────────────────────────────────
// King/Earl ruling 36 legions. Builds towers and fills moats.
const VINE: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('vine-n1'), position: { x: 0.15, y: 0.15 } },
    { id: nid('vine-n2'), position: { x: 0.85, y: 0.15 } },
    { id: nid('vine-n3'), position: { x: 0.85, y: 0.85 } },
    { id: nid('vine-n4'), position: { x: 0.15, y: 0.85 } },
    { id: nid('vine-n5'), position: { x: 0.50, y: 0.50 } },
  ]
  const [n1, n2, n3, n4, n5] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.13), mkEdge(n2, n3, 0.13), mkEdge(n3, n4, 0.13), mkEdge(n4, n1, 0.13),
    mkEdge(n1, n3, 0.12), mkEdge(n2, n4, 0.12), mkEdge(n5, n1, 0.12), mkEdge(n5, n3, 0.12),
  ]
  return {
    id: 'vine', name: 'Vine', rank: 'King',
    domains: ['destruction', 'revelation'], legions: 36,
    sealGeometry: { nodes: ns, edges },
    description: 'The forty-fifth spirit, a great king and earl commanding 36 legions. He appears as a lion riding a black horse and bearing a viper. He builds towers, tears down walls, and reveals witches and hidden things.',
  }
})()

// ─── Balam — 51st Spirit ──────────────────────────────────────────────────
// King ruling 40 legions. Gives perfect answers on past, present, future.
const BALAM: Demon = (() => {
  const ns = circle('balam', 6, 0.40)
  const edges: SealEdge[] = [
    mkEdge(ns[0], ns[2], 0.17), mkEdge(ns[2], ns[4], 0.17), mkEdge(ns[4], ns[0], 0.17),
    mkEdge(ns[1], ns[4], 0.16), mkEdge(ns[3], ns[0], 0.16),
    mkEdge(ns[1], ns[3], 0.09), mkEdge(ns[5], ns[2], 0.08),
  ]
  return {
    id: 'balam', name: 'Balam', rank: 'King',
    domains: ['illusion', 'knowledge'], legions: 40,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-first spirit, a terrible, great, and powerful king. Commands 40 legions. He has three heads — bull, man, and ram — with a serpent tail and blazing eyes. He gives perfect answers on past, present, and future, and makes men invisible.',
  }
})()

// ─── Zagan — 61st Spirit ──────────────────────────────────────────────────
// King/President ruling 33 legions. Makes men witty; turns metals to coin.
const ZAGAN: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('zagan-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('zagan-n2'), position: { x: 0.88, y: 0.73 } },
    { id: nid('zagan-n3'), position: { x: 0.12, y: 0.73 } },
    { id: nid('zagan-n4'), position: { x: 0.50, y: 0.95 } },
    { id: nid('zagan-n5'), position: { x: 0.88, y: 0.27 } },
    { id: nid('zagan-n6'), position: { x: 0.12, y: 0.27 } },
  ]
  const [n1, n2, n3, n4, n5, n6] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n4, 0.17), mkEdge(n2, n6, 0.17), mkEdge(n3, n5, 0.17),
    mkEdge(n1, n2, 0.16), mkEdge(n2, n3, 0.16),
    mkEdge(n4, n5, 0.09), mkEdge(n6, n4, 0.08),
  ]
  return {
    id: 'zagan', name: 'Zagan', rank: 'King',
    domains: ['transformation', 'knowledge'], legions: 33,
    sealGeometry: { nodes: ns, edges },
    description: 'The sixty-first spirit, a great king and president commanding 33 legions. He appears first like a bull with gryphon wings, then human. He makes men witty and turns metals to coin and water to wine.',
  }
})()

// ─── Belial — 68th Spirit ─────────────────────────────────────────────────
// King ruling 80 legions. Created after Lucifer. Distributes senatorships.
const BELIAL: Demon = (() => {
  const ns = circle('belial', 8, 0.42)
  const edges: SealEdge[] = [
    mkEdge(ns[0], ns[3], 0.13), mkEdge(ns[3], ns[6], 0.13), mkEdge(ns[6], ns[1], 0.13), mkEdge(ns[1], ns[4], 0.13),
    mkEdge(ns[4], ns[7], 0.12), mkEdge(ns[7], ns[2], 0.12), mkEdge(ns[2], ns[5], 0.12), mkEdge(ns[5], ns[0], 0.12),
  ]
  return {
    id: 'belial', name: 'Belial', rank: 'King',
    domains: ['discord', 'liberation'], legions: 80,
    sealGeometry: { nodes: ns, edges },
    description: 'The sixty-eighth spirit, a mighty king created next after Lucifer, commanding 80 legions. He appears as two beautiful angels in a chariot of fire. He distributes presentations and senatorships, and causes favour of friends and foes.',
  }
})()

export const KINGS: Demon[] = [
  BAEL, PAIMON, BELETH, PURSON, ASMODAI, VINE, BALAM, ZAGAN, BELIAL,
]
