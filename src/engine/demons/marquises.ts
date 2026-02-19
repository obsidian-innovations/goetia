import type { Demon, SealNode, SealEdge } from '../sigil/Types.ts'
import { nid, mkEdge, circle, hub, pentagram, wheel } from './geometry.ts'

// ─── Samigina — 4th Spirit ────────────────────────────────────────────────
// Marquis ruling 30 legions. Asymmetric star with crossing diagonals.
const SAMIGINA: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('samigina-n1'), position: { x: 0.20, y: 0.10 } },
    { id: nid('samigina-n2'), position: { x: 0.80, y: 0.10 } },
    { id: nid('samigina-n3'), position: { x: 0.95, y: 0.55 } },
    { id: nid('samigina-n4'), position: { x: 0.60, y: 0.92 } },
    { id: nid('samigina-n5'), position: { x: 0.15, y: 0.75 } },
    { id: nid('samigina-n6'), position: { x: 0.45, y: 0.40 } },
  ]
  const [n1, n2, n3, n4, n5, n6] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n3, 0.17), mkEdge(n2, n5, 0.17), mkEdge(n3, n5, 0.14),
    mkEdge(n1, n4, 0.14), mkEdge(n6, n2, 0.12), mkEdge(n6, n4, 0.12), mkEdge(n6, n5, 0.14),
  ]
  return {
    id: 'samigina', name: 'Samigina', rank: 'Marquis',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fourth spirit, a great marquis commanding 30 legions. Appears as a small horse, then human. He teaches the liberal sciences and gives account of the souls of those who have died in sin.',
  }
})()

// ─── Amon — 7th Spirit ────────────────────────────────────────────────────
// Marquis ruling 40 legions. Arrowhead with tail; procures love, reconciles foes.
const AMON: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('amon-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('amon-n2'), position: { x: 0.85, y: 0.40 } },
    { id: nid('amon-n3'), position: { x: 0.65, y: 0.55 } },
    { id: nid('amon-n4'), position: { x: 0.50, y: 0.95 } },
    { id: nid('amon-n5'), position: { x: 0.35, y: 0.55 } },
    { id: nid('amon-n6'), position: { x: 0.15, y: 0.40 } },
  ]
  const [n1, n2, n3, n4, n5, n6] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.18), mkEdge(n2, n3, 0.14), mkEdge(n3, n4, 0.18),
    mkEdge(n4, n5, 0.18), mkEdge(n5, n6, 0.14), mkEdge(n6, n1, 0.18),
  ]
  return {
    id: 'amon', name: 'Amon', rank: 'Marquis',
    domains: ['discord', 'knowledge'], legions: 40,
    sealGeometry: { nodes: ns, edges },
    description: 'The seventh spirit, a great marquis commanding 40 legions. Appears as a wolf with a serpent\'s tail. He procures love and reconciles controversies between friends and foes.',
  }
})()

// ─── Leraje — 14th Spirit ─────────────────────────────────────────────────
// Marquis ruling 30 legions. Causes battles and putrefies wounds.
const LERAJE: Demon = (() => {
  const ns = circle('leraje', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15),
    mkEdge(ns[3], ns[4], 0.15), mkEdge(ns[4], ns[0], 0.15),
    mkEdge(ns[0], ns[3], 0.13), mkEdge(ns[1], ns[4], 0.12),
  ]
  return {
    id: 'leraje', name: 'Leraje', rank: 'Marquis',
    domains: ['destruction', 'discord'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fourteenth spirit, a great marquis commanding 30 legions. Appears as a handsome archer clad in green. He causes battles and contests, and putrefies wounds made by arrows.',
  }
})()

// ─── Naberius — 24th Spirit ───────────────────────────────────────────────
// Marquis ruling 19 legions. Restores lost dignities; teaches arts and sciences.
const NABERIUS: Demon = (() => {
  const { nodes, edges } = pentagram('naberius')
  return {
    id: 'naberius', name: 'Naberius', rank: 'Marquis',
    domains: ['knowledge', 'transformation'], legions: 19,
    sealGeometry: { nodes, edges },
    description: 'The twenty-fourth spirit, a most valiant marquis commanding 19 legions. Appears as a crowing cock. He restores lost dignities and honours, and teaches the art of rhetoric and other arts and sciences.',
  }
})()

// ─── Forneus — 30th Spirit ────────────────────────────────────────────────
// Marquis ruling 29 legions. Teaches languages; gives love and good reputation.
const FORNEUS: Demon = (() => {
  const ns = circle('forneus', 6, 0.42)
  const h  = hub('forneus')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[2], 0.10), mkEdge(h, ns[4], 0.10),
    mkEdge(ns[1], ns[4], 0.10),
  ]
  return {
    id: 'forneus', name: 'Forneus', rank: 'Marquis',
    domains: ['knowledge', 'binding'], legions: 29,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirtieth spirit, a great marquis commanding 29 legions. Appears as a great sea monster. He teaches rhetoric and languages, and gives men a good name, with the love of friends and foes.',
  }
})()

// ─── Marchosias — 35th Spirit ─────────────────────────────────────────────
// Marquis ruling 30 legions. A strong fighter; answers truthfully.
const MARCHOSIAS: Demon = (() => {
  const ns = circle('marchosias', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.17), mkEdge(ns[2], ns[4], 0.17), mkEdge(ns[4], ns[0], 0.17),
    mkEdge(ns[1], ns[4], 0.16), mkEdge(ns[3], ns[0], 0.16),
    mkEdge(ns[1], ns[3], 0.09), mkEdge(ns[5], ns[2], 0.08),
  ]
  return {
    id: 'marchosias', name: 'Marchosias', rank: 'Marquis',
    domains: ['destruction', 'discord'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The thirty-fifth spirit, a great marquis commanding 30 legions. Appears as a wolf with gryphon wings and a serpent\'s tail, spitting fire. He is a strong fighter and answers all questions, and is very faithful to the conjuror.',
  }
})()

// ─── Phenex — 37th Spirit ─────────────────────────────────────────────────
// Marquis ruling 20 legions. A great poet; teaches wonderful sciences.
const PHENEX: Demon = (() => {
  const { nodes, edges } = wheel('phenex', 5)
  return {
    id: 'phenex', name: 'Phenex', rank: 'Marquis',
    domains: ['knowledge', 'transformation'], legions: 20,
    sealGeometry: { nodes, edges },
    description: 'The thirty-seventh spirit, a great marquis commanding 20 legions. Appears as a phoenix bird with the voice of a child. He is an excellent poet and is very obedient to the conjuror. He teaches all wonderful sciences.',
  }
})()

// ─── Sabnock — 43rd Spirit ────────────────────────────────────────────────
// Marquis ruling 50 legions. Builds towers and castles; afflicts with wounds.
const SABNOCK: Demon = (() => {
  const ns = circle('sabnock', 4, 0.40)
  const h  = hub('sabnock')
  const edges = [
    mkEdge(ns[0], ns[1], 0.13), mkEdge(ns[1], ns[2], 0.13), mkEdge(ns[2], ns[3], 0.13),
    mkEdge(ns[3], ns[0], 0.13), mkEdge(ns[0], ns[2], 0.12), mkEdge(ns[1], ns[3], 0.12),
    mkEdge(h, ns[0], 0.12), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'sabnock', name: 'Sabnock', rank: 'Marquis',
    domains: ['destruction', 'binding'], legions: 50,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The forty-third spirit, a great marquis commanding 50 legions. Appears as a soldier with armour and a lance, riding a pale horse. He builds towers, castles, and cities, afflicts men with wounds, and gives good familiars.',
  }
})()

// ─── Shax — 44th Spirit ───────────────────────────────────────────────────
// Marquis ruling 30 legions. Steals horses and things; brings back things.
const SHAX: Demon = (() => {
  const ns = circle('shax', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[2], ns[4], 0.20), mkEdge(ns[4], ns[1], 0.20),
    mkEdge(ns[1], ns[3], 0.20), mkEdge(ns[3], ns[0], 0.20),
  ]
  return {
    id: 'shax', name: 'Shax', rank: 'Marquis',
    domains: ['illusion', 'discord'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The forty-fourth spirit, a great marquis commanding 30 legions. Appears like a stock dove, speaking with a hoarse voice. He steals money from kings\' houses and takes away sight, hearing, and understanding, but will restore them at request.',
  }
})()

// ─── Orias — 59th Spirit ──────────────────────────────────────────────────
// Marquis ruling 30 legions. Transforms men; gives dignities and confirmation.
const ORIAS: Demon = (() => {
  const ns = circle('orias', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[3], 0.17), mkEdge(ns[1], ns[4], 0.17), mkEdge(ns[2], ns[5], 0.17),
    mkEdge(ns[0], ns[1], 0.16), mkEdge(ns[2], ns[3], 0.16),
    mkEdge(ns[4], ns[5], 0.09), mkEdge(ns[0], ns[4], 0.08),
  ]
  return {
    id: 'orias', name: 'Orias', rank: 'Marquis',
    domains: ['transformation', 'knowledge'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-ninth spirit, a great marquis commanding 30 legions. Appears as a lion with a serpent\'s tail, holding two hissing serpents. He knows the virtues of stars, teaches astrology, and transforms men and gives dignities.',
  }
})()

// ─── Andras — 63rd Spirit ─────────────────────────────────────────────────
// Marquis ruling 30 legions. Very dangerous; provokes discord and kills masters.
const ANDRAS: Demon = (() => {
  const ns = circle('andras', 5, 0.42)
  const h  = hub('andras')
  const edges = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[1], 0.15),
    mkEdge(ns[1], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
    mkEdge(h, ns[0], 0.13), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'andras', name: 'Andras', rank: 'Marquis',
    domains: ['discord', 'destruction'], legions: 30,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The sixty-third spirit, a great marquis commanding 30 legions. Appears as an angel with the head of a black night raven, riding a black wolf and carrying a sword. He sows discord and kills masters, servants, and companions.',
  }
})()

// ─── Andrealphus — 65th Spirit ────────────────────────────────────────────
// Marquis ruling 30 legions. Teaches geometry; transforms men into birds.
const ANDREALPHUS: Demon = (() => {
  const ns = circle('andrealphus', 4, 0.40)
  const h  = hub('andrealphus')
  const edges = [
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15),
    mkEdge(ns[3], ns[0], 0.15), mkEdge(ns[0], ns[2], 0.13), mkEdge(ns[1], ns[3], 0.13),
    mkEdge(h, ns[0], 0.07), mkEdge(h, ns[1], 0.07),
  ]
  return {
    id: 'andrealphus', name: 'Andrealphus', rank: 'Marquis',
    domains: ['transformation', 'knowledge'], legions: 30,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The sixty-fifth spirit, a mighty marquis commanding 30 legions. Appears first as a peacock with great noise, then as a man. He teaches geometry and all things pertaining to measurements, and can transform men into birds.',
  }
})()

// ─── Cimeies — 66th Spirit ────────────────────────────────────────────────
// Marquis ruling 20 legions. Teaches grammar, logic, and rhetoric.
const CIMEIES: Demon = (() => {
  const ns = circle('cimeies', 6, 0.42)
  const h  = hub('cimeies')
  const edges = [
    mkEdge(ns[0], ns[2], 0.14), mkEdge(ns[2], ns[4], 0.14), mkEdge(ns[4], ns[0], 0.14),
    mkEdge(ns[1], ns[3], 0.14), mkEdge(ns[3], ns[5], 0.14), mkEdge(ns[5], ns[1], 0.14),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[3], 0.10),
    mkEdge(ns[0], ns[3], 0.06),
  ]
  return {
    id: 'cimeies', name: 'Cimeies', rank: 'Marquis',
    domains: ['knowledge', 'revelation'], legions: 20,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The sixty-sixth spirit, a mighty marquis commanding 20 legions. Appears as a valiant warrior riding a black horse. He teaches grammar, logic, and rhetoric perfectly, and discovers things lost or hidden in sandy places.',
  }
})()

// ─── Decarabia — 69th Spirit ──────────────────────────────────────────────
// Marquis ruling 30 legions. Knows virtues of birds and stones.
const DECARABIA: Demon = (() => {
  const { nodes, edges } = pentagram('decarabia')
  return {
    id: 'decarabia', name: 'Decarabia', rank: 'Marquis',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes, edges },
    description: 'The sixty-ninth spirit, a great marquis commanding 30 legions. Appears as a star in a pentacle, then as a man. He discovers the virtues of birds and precious stones, and makes a familiar appear like any bird to fly and sing.',
  }
})()

export const MARQUISES: Demon[] = [
  SAMIGINA, AMON, LERAJE, NABERIUS, FORNEUS, MARCHOSIAS, PHENEX,
  SABNOCK, SHAX, ORIAS, ANDRAS, ANDREALPHUS, CIMEIES, DECARABIA,
]
