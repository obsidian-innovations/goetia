import type { Demon } from '../sigil/Types.ts'
import { circle, hub, mkEdge, pentagram, wheel } from './geometry.ts'

// ─── Haagenti — 48th Spirit ───────────────────────────────────────────────
// Marquis/President ruling 33 legions. Makes men wise; transmutes metals.
const HAAGENTI: Demon = (() => {
  const { nodes, edges } = wheel('haagenti', 5)
  return {
    id: 'haagenti', name: 'Haagenti', rank: 'Baron',
    domains: ['transformation', 'knowledge'], legions: 33,
    sealGeometry: { nodes, edges },
    description: 'The forty-eighth spirit, a great president commanding 33 legions. Appears as a great bull with gryphon wings. Makes men wise, transmutes all metals into gold, and turns wine into water.',
  }
})()

// ─── Haures — 64th Spirit ─────────────────────────────────────────────────
// Duke ruling 36 legions. Destroys enemies and burns them; knows past/future.
const HAURES: Demon = (() => {
  const ns = circle('haures', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[2], ns[4], 0.20), mkEdge(ns[4], ns[1], 0.20),
    mkEdge(ns[1], ns[3], 0.20), mkEdge(ns[3], ns[0], 0.20),
  ]
  return {
    id: 'haures', name: 'Haures', rank: 'Baron',
    domains: ['destruction', 'revelation'], legions: 36,
    sealGeometry: { nodes: ns, edges },
    description: 'The sixty-fourth spirit, a great duke commanding 36 legions. Appears as a leopard that speaks proudly. Destroys and burns enemies, and if commanded, will not be deceived. He knows past, present, and future.',
  }
})()

// ─── Seere — 70th Spirit ──────────────────────────────────────────────────
// Prince ruling 26 legions. Moves things, finds thieves, is indifferent to good or evil.
const SEERE: Demon = (() => {
  const ns = circle('seere', 4, 0.40)
  const h  = hub('seere')
  const edges = [
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15),
    mkEdge(ns[3], ns[0], 0.15), mkEdge(ns[0], ns[2], 0.13), mkEdge(ns[1], ns[3], 0.13),
    mkEdge(h, ns[0], 0.07), mkEdge(h, ns[2], 0.07),
  ]
  return {
    id: 'seere', name: 'Seere', rank: 'Baron',
    domains: ['revelation', 'transformation'], legions: 26,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The seventieth spirit, a mighty prince commanding 26 legions. Appears as a beautiful man on a winged horse. He can go to any part of the world instantly, fetches or carries anything, moves things, and reveals thieves.',
  }
})()

// ─── Valac — 62nd Spirit ──────────────────────────────────────────────────
// President ruling 30 legions. Finds treasures and reveals serpents.
const VALAC: Demon = (() => {
  const { nodes, edges } = pentagram('valac')
  return {
    id: 'valac', name: 'Valac', rank: 'Baron',
    domains: ['revelation', 'knowledge'], legions: 30,
    sealGeometry: { nodes, edges },
    description: 'The sixty-second spirit, a mighty great president commanding 30 legions. Appears as a poor little boy with angel wings, riding a two-headed dragon. Gives true answers about hidden treasures and reveals where serpents can be seen.',
  }
})()

// ─── Amdusias — 67th Spirit ───────────────────────────────────────────────
// Duke ruling 29 legions. Causes trees to bend; provides music.
const AMDUSIAS: Demon = (() => {
  const ns = circle('amdusias', 6, 0.42)
  const h  = hub('amdusias')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(h, ns[1], 0.10), mkEdge(h, ns[3], 0.10), mkEdge(h, ns[5], 0.10),
    mkEdge(ns[0], ns[3], 0.10),
  ]
  return {
    id: 'amdusias', name: 'Amdusias', rank: 'Baron',
    domains: ['transformation', 'discord'], legions: 29,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The sixty-seventh spirit, a great duke commanding 29 legions. Appears first as a unicorn, then as a man. He makes trees bend at will and gives excellent familiars. He can cause the sound of musical instruments to be heard.',
  }
})()

export const BARONS: Demon[] = [HAAGENTI, HAURES, SEERE, VALAC, AMDUSIAS]
