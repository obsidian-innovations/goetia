import type { Demon } from '../sigil/Types.ts'
import { circle, hub, mkEdge, pentagram, wheel } from './geometry.ts'

// ─── Botis — 17th Spirit ──────────────────────────────────────────────────
// Earl ruling 60 legions. Tells past and future; reconciles friends and foes.
const BOTIS: Demon = (() => {
  const ns = circle('botis', 5, 0.42)
  const h  = hub('botis')
  const edges = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[1], 0.15),
    mkEdge(ns[1], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
    mkEdge(h, ns[0], 0.13), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'botis', name: 'Botis', rank: 'Earl',
    domains: ['knowledge', 'revelation'], legions: 60,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The seventeenth spirit, a great president and earl commanding 60 legions. Appears as a vile viper, then as a man with great teeth and two horns. He tells of things past, present, and future, and reconciles friends and foes.',
  }
})()

// ─── Marax — 21st Spirit ──────────────────────────────────────────────────
// Earl/President ruling 30 legions. Teaches astronomy and gives familiars.
const MARAX: Demon = (() => {
  const ns = circle('marax', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[3], 0.17), mkEdge(ns[1], ns[4], 0.17), mkEdge(ns[2], ns[5], 0.17),
    mkEdge(ns[0], ns[1], 0.16), mkEdge(ns[2], ns[3], 0.16),
    mkEdge(ns[4], ns[5], 0.09), mkEdge(ns[0], ns[4], 0.08),
  ]
  return {
    id: 'marax', name: 'Marax', rank: 'Earl',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The twenty-first spirit, a great earl and president commanding 30 legions. Appears as a great bull with a man\'s face. He teaches astronomy and all liberal sciences, and gives good familiars who know the virtues of herbs and stones.',
  }
})()

// ─── Ipos — 22nd Spirit ───────────────────────────────────────────────────
// Earl/Prince ruling 36 legions. Makes men witty and courageous.
const IPOS: Demon = (() => {
  const { nodes, edges } = pentagram('ipos')
  return {
    id: 'ipos', name: 'Ipos', rank: 'Earl',
    domains: ['knowledge', 'transformation'], legions: 36,
    sealGeometry: { nodes, edges },
    description: 'The twenty-second spirit, a great earl and prince commanding 36 legions. Appears as an angel with a lion\'s head, goose feet, and a hare\'s tail. He knows things past and future, and makes men witty and courageous.',
  }
})()

// ─── Furfur — 34th Spirit ─────────────────────────────────────────────────
// Earl ruling 26 legions. Causes love; speaks falsely unless compelled.
const FURFUR: Demon = (() => {
  const ns = circle('furfur', 4, 0.40)
  const h  = hub('furfur')
  const edges = [
    mkEdge(ns[0], ns[1], 0.13), mkEdge(ns[1], ns[2], 0.13), mkEdge(ns[2], ns[3], 0.13),
    mkEdge(ns[3], ns[0], 0.13), mkEdge(ns[0], ns[2], 0.12), mkEdge(ns[1], ns[3], 0.12),
    mkEdge(h, ns[0], 0.12), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'furfur', name: 'Furfur', rank: 'Earl',
    domains: ['discord', 'illusion'], legions: 26,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirty-fourth spirit, a great earl commanding 26 legions. Appears as a hart with a fiery tail, then as an angel. He speaks falsely unless constrained in a magic triangle. He causes love and raises lightning, thunder, and blasts.',
  }
})()

// ─── Halphas — 38th Spirit ────────────────────────────────────────────────
// Earl ruling 26 legions. Builds towers and sends soldiers to wars.
const HALPHAS: Demon = (() => {
  const ns = circle('halphas', 6, 0.42)
  const h  = hub('halphas')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[2], 0.10), mkEdge(h, ns[4], 0.10),
    mkEdge(ns[1], ns[4], 0.10),
  ]
  return {
    id: 'halphas', name: 'Halphas', rank: 'Earl',
    domains: ['destruction', 'binding'], legions: 26,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirty-eighth spirit, a great earl commanding 26 legions. Appears in the form of a stock dove speaking hoarsely. He builds towers furnished with ammunition and weapons, and sends men of war to places appointed.',
  }
})()

// ─── Raum — 40th Spirit ───────────────────────────────────────────────────
// Earl ruling 30 legions. Steals treasure and destroys cities.
const RAUM: Demon = (() => {
  const ns = circle('raum', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[2], ns[4], 0.20), mkEdge(ns[4], ns[1], 0.20),
    mkEdge(ns[1], ns[3], 0.20), mkEdge(ns[3], ns[0], 0.20),
  ]
  return {
    id: 'raum', name: 'Raum', rank: 'Earl',
    domains: ['destruction', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fortieth spirit, a great earl commanding 30 legions. Appears first as a crow, then as a man. He steals treasure from kings\' houses, destroys cities, and reveals past and future.',
  }
})()

// ─── Bifrons — 46th Spirit ────────────────────────────────────────────────
// Earl ruling 6 legions. Teaches astrology and the virtues of gems.
const BIFRONS: Demon = (() => {
  const ns = circle('bifrons', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.17), mkEdge(ns[2], ns[4], 0.17), mkEdge(ns[4], ns[0], 0.17),
    mkEdge(ns[1], ns[3], 0.17), mkEdge(ns[3], ns[5], 0.16), mkEdge(ns[5], ns[1], 0.16),
  ]
  return {
    id: 'bifrons', name: 'Bifrons', rank: 'Earl',
    domains: ['knowledge', 'transformation'], legions: 6,
    sealGeometry: { nodes: ns, edges },
    description: 'The forty-sixth spirit, an earl commanding 6 legions. Appears first as a monster, then as a man. He teaches astrology, geometry, and all mathematical arts. He changes the candles or lights on the graves of the dead.',
  }
})()

// ─── Ronove — 27th Spirit ─────────────────────────────────────────────────
// Marquis/Earl ruling 19 legions. Teaches languages and rhetoric.
const RONOVE: Demon = (() => {
  const { nodes, edges } = wheel('ronove', 5)
  return {
    id: 'ronove', name: 'Ronove', rank: 'Earl',
    domains: ['knowledge', 'binding'], legions: 19,
    sealGeometry: { nodes, edges },
    description: 'The twenty-seventh spirit, a great marquis and earl commanding 19 legions. Appears as a monster. He teaches rhetoric, languages, knowledge of tongues, and gives good servants and favour of friends and foes.',
  }
})()

// ─── Andromalius — 72nd Spirit ────────────────────────────────────────────
// Earl ruling 36 legions. Brings back thieves; reveals theft and treachery.
const ANDROMALIUS: Demon = (() => {
  const ns = circle('andromalius', 4, 0.40)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[1], ns[3], 0.20),
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
  ]
  return {
    id: 'andromalius', name: 'Andromalius', rank: 'Earl',
    domains: ['revelation', 'discord'], legions: 36,
    sealGeometry: { nodes: ns, edges },
    description: 'The seventy-second and last spirit of the Ars Goetia, a great earl commanding 36 legions. He appears as a man holding a great serpent. He discovers all wickedness, treachery, and brings back thieves with all goods they have stolen.',
  }
})()

export const EARLS: Demon[] = [
  BOTIS, MARAX, IPOS, FURFUR, HALPHAS, RAUM, BIFRONS, RONOVE, ANDROMALIUS,
]
