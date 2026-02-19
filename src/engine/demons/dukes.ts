import type { Demon, SealNode, SealEdge } from '../sigil/Types.ts'
import { nid, mkEdge, circle, hub, pentagram, wheel } from './geometry.ts'

// ─── Agares — 2nd Spirit ──────────────────────────────────────────────────
const AGARES: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('agares-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('agares-n2'), position: { x: 0.85, y: 0.25 } },
    { id: nid('agares-n3'), position: { x: 0.95, y: 0.60 } },
    { id: nid('agares-n4'), position: { x: 0.73, y: 0.90 } },
    { id: nid('agares-n5'), position: { x: 0.27, y: 0.90 } },
    { id: nid('agares-n6'), position: { x: 0.05, y: 0.60 } },
    { id: nid('agares-n7'), position: { x: 0.50, y: 0.50 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.10), mkEdge(n2, n3, 0.10), mkEdge(n3, n4, 0.10),
    mkEdge(n4, n5, 0.10), mkEdge(n5, n6, 0.10), mkEdge(n6, n1, 0.10),
    mkEdge(n1, n7, 0.10), mkEdge(n3, n7, 0.10), mkEdge(n5, n7, 0.10),
    mkEdge(n2, n5, 0.10),
  ]
  return {
    id: 'agares', name: 'Agares', rank: 'Duke',
    domains: ['knowledge', 'transformation', 'discord'], legions: 31,
    sealGeometry: { nodes: ns, edges },
    description: 'The second spirit, a duke commanding 31 legions. He appears as a comely old man riding a crocodile and carrying a goshawk. He causes runaways to return, teaches languages, and can cause earthquakes.',
  }
})()

// ─── Valefor — 6th Spirit ─────────────────────────────────────────────────
const VALEFOR: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('valefor-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('valefor-n2'), position: { x: 0.92, y: 0.48 } },
    { id: nid('valefor-n3'), position: { x: 0.62, y: 0.95 } },
    { id: nid('valefor-n4'), position: { x: 0.18, y: 0.78 } },
    { id: nid('valefor-n5'), position: { x: 0.08, y: 0.30 } },
  ]
  const [n1, n2, n3, n4, n5] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.18), mkEdge(n2, n3, 0.18), mkEdge(n3, n4, 0.18),
    mkEdge(n4, n5, 0.18), mkEdge(n5, n1, 0.18), mkEdge(n1, n3, 0.10),
  ]
  return {
    id: 'valefor', name: 'Valefor', rank: 'Duke',
    domains: ['binding', 'discord', 'illusion'], legions: 10,
    sealGeometry: { nodes: ns, edges },
    description: 'The sixth spirit, a duke commanding 10 legions. He appears with the head of a lion and a donkey\'s head braying. He tempts men to steal and is a good familiar until he betrays.',
  }
})()

// ─── Barbatos — 8th Spirit ────────────────────────────────────────────────
const BARBATOS: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('barbatos-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('barbatos-n2'), position: { x: 0.95, y: 0.50 } },
    { id: nid('barbatos-n3'), position: { x: 0.50, y: 0.95 } },
    { id: nid('barbatos-n4'), position: { x: 0.05, y: 0.50 } },
    { id: nid('barbatos-n5'), position: { x: 0.50, y: 0.50 } },
    { id: nid('barbatos-n6'), position: { x: 0.50, y: 0.28 } },
    { id: nid('barbatos-n7'), position: { x: 0.72, y: 0.50 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.13), mkEdge(n2, n3, 0.13), mkEdge(n3, n4, 0.13), mkEdge(n4, n1, 0.13),
    mkEdge(n5, n6, 0.12), mkEdge(n5, n7, 0.12), mkEdge(n6, n1, 0.12), mkEdge(n7, n2, 0.12),
  ]
  return {
    id: 'barbatos', name: 'Barbatos', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The eighth spirit, a great duke commanding 30 legions. He appears with four kings and three companies. He gives understanding of animal speech, reveals treasures, and reconciles friends and rulers.',
  }
})()

// ─── Gusion — 11th Spirit ─────────────────────────────────────────────────
const GUSION: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('gusion-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('gusion-n2'), position: { x: 0.95, y: 0.50 } },
    { id: nid('gusion-n3'), position: { x: 0.50, y: 0.95 } },
    { id: nid('gusion-n4'), position: { x: 0.05, y: 0.50 } },
    { id: nid('gusion-n5'), position: { x: 0.50, y: 0.30 } },
    { id: nid('gusion-n6'), position: { x: 0.70, y: 0.50 } },
    { id: nid('gusion-n7'), position: { x: 0.50, y: 0.50 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.15), mkEdge(n2, n3, 0.15), mkEdge(n3, n4, 0.15), mkEdge(n4, n1, 0.15),
    mkEdge(n1, n3, 0.10), mkEdge(n5, n6, 0.10), mkEdge(n7, n4, 0.10), mkEdge(n7, n2, 0.10),
  ]
  return {
    id: 'gusion', name: 'Gusion', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 40,
    sealGeometry: { nodes: ns, edges },
    description: 'The eleventh spirit, a great duke commanding 40 legions. He discerns all things past, present, and to come, and reconciles enemies. He gives honour and dignity to anyone.',
  }
})()

// ─── Eligos — 15th Spirit ─────────────────────────────────────────────────
// Duke ruling 60 legions. Discovers hidden things and causes love.
const ELIGOS: Demon = (() => {
  const ns = circle('eligos', 6, 0.42)
  const h  = hub('eligos')
  const edges = [
    mkEdge(ns[0], ns[2], 0.14), mkEdge(ns[2], ns[4], 0.14), mkEdge(ns[4], ns[0], 0.14),
    mkEdge(ns[1], ns[3], 0.14), mkEdge(ns[3], ns[5], 0.14), mkEdge(ns[5], ns[1], 0.14),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[3], 0.10),
    mkEdge(ns[0], ns[3], 0.06),
  ]
  return {
    id: 'eligos', name: 'Eligos', rank: 'Duke',
    domains: ['revelation', 'binding'], legions: 60,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The fifteenth spirit, a great duke commanding 60 legions. Appears as a handsome knight bearing a lance, ensign, and serpent. He discovers hidden things and knows war outcomes. He causes the love of lords and great persons.',
  }
})()

// ─── Zepar — 16th Spirit ──────────────────────────────────────────────────
// Duke ruling 26 legions. Causes women to love men; makes them barren.
const ZEPAR: Demon = (() => {
  const { nodes, edges } = pentagram('zepar')
  return {
    id: 'zepar', name: 'Zepar', rank: 'Duke',
    domains: ['binding', 'illusion'], legions: 26,
    sealGeometry: { nodes, edges },
    description: 'The sixteenth spirit, a great duke commanding 26 legions. Appears as a soldier in red apparel and armour. He causes women to love men and brings them together; he can make them barren.',
  }
})()

// ─── Bathin — 18th Spirit ─────────────────────────────────────────────────
// Duke ruling 30 legions. Knows virtues of herbs and precious stones.
const BATHIN: Demon = (() => {
  const ns = circle('bathin', 5, 0.42)
  const h  = hub('bathin')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[1], 0.10), mkEdge(h, ns[2], 0.10),
    mkEdge(h, ns[3], 0.10), mkEdge(h, ns[4], 0.10),
  ]
  return {
    id: 'bathin', name: 'Bathin', rank: 'Duke',
    domains: ['knowledge', 'transformation'], legions: 30,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The eighteenth spirit, a mighty duke commanding 30 legions. Appears as a strong man with a serpent\'s tail, riding a pale horse. He knows the virtues of herbs and precious stones, and can transport men swiftly from country to country.',
  }
})()

// ─── Sallos — 19th Spirit ─────────────────────────────────────────────────
// Duke ruling 30 legions. Causes love between men and women.
const SALLOS: Demon = (() => {
  const ns = circle('sallos', 4, 0.40)
  const h  = hub('sallos')
  const edges = [
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15),
    mkEdge(ns[3], ns[0], 0.15), mkEdge(ns[0], ns[2], 0.13), mkEdge(ns[1], ns[3], 0.13),
    mkEdge(h, ns[0], 0.07), mkEdge(h, ns[1], 0.07),
  ]
  return {
    id: 'sallos', name: 'Sallos', rank: 'Duke',
    domains: ['binding', 'discord'], legions: 30,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The nineteenth spirit, a great duke commanding 30 legions. Appears as a gallant soldier wearing a ducal crown, riding a crocodile. He promotes love between men and women and is a peacemaker.',
  }
})()

// ─── Aim — 23rd Spirit ────────────────────────────────────────────────────
// Duke ruling 26 legions. Sets cities and castles on fire.
const AIM: Demon = (() => {
  const ns = circle('aim', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.20), mkEdge(ns[2], ns[4], 0.20), mkEdge(ns[4], ns[1], 0.20),
    mkEdge(ns[1], ns[3], 0.20), mkEdge(ns[3], ns[0], 0.20),
  ]
  return {
    id: 'aim', name: 'Aim', rank: 'Duke',
    domains: ['destruction', 'discord'], legions: 26,
    sealGeometry: { nodes: ns, edges },
    description: 'The twenty-third spirit, a great duke commanding 26 legions. Appears as a handsome man with three heads — serpent, man, and cat. He sets cities, castles, and great places on fire, and makes men witty in private matters.',
  }
})()

// ─── Bune — 26th Spirit ───────────────────────────────────────────────────
// Duke ruling 30 legions. Makes men rich and wise; speaks with gravely voice.
const BUNE: Demon = (() => {
  const ns = circle('bune', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(ns[0], ns[3], 0.10), mkEdge(ns[1], ns[4], 0.10),
    mkEdge(ns[2], ns[5], 0.10), mkEdge(ns[0], ns[2], 0.10),
  ]
  return {
    id: 'bune', name: 'Bune', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The twenty-sixth spirit, a strong duke commanding 30 legions. Appears as a dragon with three heads. He changes the place of the dead, makes men eloquent and wise, and gives riches to a man and makes him wise.',
  }
})()

// ─── Berith — 28th Spirit ─────────────────────────────────────────────────
// Duke ruling 26 legions. Answers truly; turns metals to gold.
const BERITH: Demon = (() => {
  const ns = circle('berith', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[2], 0.17), mkEdge(ns[2], ns[4], 0.17), mkEdge(ns[4], ns[0], 0.17),
    mkEdge(ns[1], ns[3], 0.17), mkEdge(ns[3], ns[5], 0.16), mkEdge(ns[5], ns[1], 0.16),
  ]
  return {
    id: 'berith', name: 'Berith', rank: 'Duke',
    domains: ['knowledge', 'transformation'], legions: 26,
    sealGeometry: { nodes: ns, edges },
    description: 'The twenty-eighth spirit, a great duke commanding 26 legions. Appears wearing a red crown, riding a red horse. He must be restrained in a brass vessel. He answers truly and can turn metals into gold.',
  }
})()

// ─── Astaroth — 29th Spirit ───────────────────────────────────────────────
// Duke ruling 40 legions. Teaches liberal sciences; reveals secrets.
const ASTAROTH: Demon = (() => {
  const ns = circle('astaroth', 8, 0.42)
  const edges = [
    mkEdge(ns[0], ns[3], 0.13), mkEdge(ns[3], ns[6], 0.13), mkEdge(ns[6], ns[1], 0.13), mkEdge(ns[1], ns[4], 0.13),
    mkEdge(ns[4], ns[7], 0.12), mkEdge(ns[7], ns[2], 0.12), mkEdge(ns[2], ns[5], 0.12), mkEdge(ns[5], ns[0], 0.12),
  ]
  return {
    id: 'astaroth', name: 'Astaroth', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 40,
    sealGeometry: { nodes: ns, edges },
    description: 'The twenty-ninth spirit, a mighty strong duke commanding 40 legions. Appears as a hurtful angel riding a dragon, holding a viper. He teaches liberal sciences and gives answers about the past, present, and future.',
  }
})()

// ─── Focalor — 41st Spirit ────────────────────────────────────────────────
// Duke ruling 30 legions. Has power over winds and sea; drowns men.
const FOCALOR: Demon = (() => {
  const ns = circle('focalor', 5, 0.42)
  const h  = hub('focalor')
  const edges = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[1], 0.15),
    mkEdge(ns[1], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
    mkEdge(h, ns[0], 0.13), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'focalor', name: 'Focalor', rank: 'Duke',
    domains: ['destruction', 'discord'], legions: 30,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The forty-first spirit, a mighty duke commanding 30 legions. Appears as a man with gryphon wings. He has power over winds and seas and drowns men. He also overthrows ships of war. He has hope to return to the seventh throne after a thousand years.',
  }
})()

// ─── Vepar — 42nd Spirit ──────────────────────────────────────────────────
// Duke ruling 29 legions. Commands waters; causes ships to perish.
const VEPAR: Demon = (() => {
  const { nodes, edges } = wheel('vepar', 5)
  return {
    id: 'vepar', name: 'Vepar', rank: 'Duke',
    domains: ['destruction', 'illusion'], legions: 29,
    sealGeometry: { nodes, edges },
    description: 'The forty-second spirit, a mighty duke commanding 29 legions. Appears as a mermaid. She is familiar with waters and commands them. She can make the sea rough and full of ships. She guides men to die in three days by putrefied wounds.',
  }
})()

// ─── Vual — 47th Spirit ───────────────────────────────────────────────────
// Duke ruling 37 legions. Procures love and tells of past, present, future.
const VUAL: Demon = (() => {
  const ns = circle('vual', 6, 0.42)
  const h  = hub('vual')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[2], 0.10), mkEdge(h, ns[4], 0.10),
    mkEdge(ns[1], ns[4], 0.10),
  ]
  return {
    id: 'vual', name: 'Vual', rank: 'Duke',
    domains: ['binding', 'revelation'], legions: 37,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The forty-seventh spirit, a mighty great duke commanding 37 legions. Appears first as a mighty dromedary, then as a man. He procures the love of women and tells things past, present, and future. He causes friendship between friends and foes.',
  }
})()

// ─── Crocell — 49th Spirit ────────────────────────────────────────────────
// Duke ruling 48 legions. Speaks of hidden and divine things; warms waters.
const CROCELL: Demon = (() => {
  const ns = circle('crocell', 4, 0.40)
  const h  = hub('crocell')
  const edges = [
    mkEdge(ns[0], ns[1], 0.13), mkEdge(ns[1], ns[2], 0.13), mkEdge(ns[2], ns[3], 0.13),
    mkEdge(ns[3], ns[0], 0.13), mkEdge(ns[0], ns[2], 0.12), mkEdge(ns[1], ns[3], 0.12),
    mkEdge(h, ns[0], 0.12), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'crocell', name: 'Crocell', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 48,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The forty-ninth spirit, a great duke commanding 48 legions. Appears as an angel. He speaks of hidden and divine things, warms waters, and discovers baths. He was of the Order of Potestates before he fell.',
  }
})()

// ─── Alloces — 52nd Spirit ────────────────────────────────────────────────
// Duke ruling 36 legions. Teaches astronomy; gives good familiars.
const ALLOCES: Demon = (() => {
  const ns = circle('alloces', 5, 0.42)
  const edges = [
    mkEdge(ns[0], ns[1], 0.15), mkEdge(ns[1], ns[2], 0.15), mkEdge(ns[2], ns[3], 0.15),
    mkEdge(ns[3], ns[4], 0.15), mkEdge(ns[4], ns[0], 0.15),
    mkEdge(ns[0], ns[3], 0.13), mkEdge(ns[1], ns[4], 0.12),
  ]
  return {
    id: 'alloces', name: 'Alloces', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 36,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-second spirit, a mighty duke commanding 36 legions. Appears as a soldier on a great horse, with a lion\'s face, red, and speaking with hoarseness. He teaches astronomy and liberal arts, and gives good familiars.',
  }
})()

// ─── Gremory — 56th Spirit ────────────────────────────────────────────────
// Duke ruling 26 legions. Tells of past/future; procures love of women.
const GREMORY: Demon = (() => {
  const ns = circle('gremory', 6, 0.42)
  const h  = hub('gremory')
  const edges = [
    mkEdge(ns[0], ns[2], 0.14), mkEdge(ns[2], ns[4], 0.14), mkEdge(ns[4], ns[0], 0.14),
    mkEdge(ns[1], ns[3], 0.14), mkEdge(ns[3], ns[5], 0.14), mkEdge(ns[5], ns[1], 0.14),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[3], 0.10),
    mkEdge(ns[0], ns[3], 0.06),
  ]
  return {
    id: 'gremory', name: 'Gremory', rank: 'Duke',
    domains: ['revelation', 'binding'], legions: 26,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The fifty-sixth spirit, a strong duke commanding 26 legions. Appears as a beautiful woman with the crown of a duchess, riding a camel. She tells of things past, present, and future, and of hidden treasure, and procures the love of women.',
  }
})()

// ─── Vapula — 60th Spirit ─────────────────────────────────────────────────
// Duke ruling 36 legions. Teaches philosophy, mechanics, and sciences.
const VAPULA: Demon = (() => {
  const ns = circle('vapula', 5, 0.42)
  const h  = hub('vapula')
  const edges = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[1], 0.15),
    mkEdge(ns[1], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
    mkEdge(h, ns[0], 0.13), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'vapula', name: 'Vapula', rank: 'Duke',
    domains: ['knowledge', 'transformation'], legions: 36,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The sixtieth spirit, a mighty duke commanding 36 legions. Appears as a lion with gryphon wings. He makes men knowing in all handicrafts and professions, also in philosophy, and other sciences.',
  }
})()

// ─── Dantalion — 71st Spirit ──────────────────────────────────────────────
// Duke ruling 36 legions. Teaches all arts; knows the thoughts of all people.
const DANTALION: Demon = (() => {
  const ns = circle('dantalion', 8, 0.42)
  const h  = hub('dantalion')
  const edges = [
    mkEdge(ns[0], ns[2], 0.12), mkEdge(ns[2], ns[4], 0.12), mkEdge(ns[4], ns[6], 0.12),
    mkEdge(ns[6], ns[0], 0.12), mkEdge(ns[1], ns[3], 0.11), mkEdge(ns[3], ns[5], 0.11),
    mkEdge(ns[5], ns[7], 0.11), mkEdge(ns[7], ns[1], 0.11),
    mkEdge(h, ns[0], 0.09),
  ]
  return {
    id: 'dantalion', name: 'Dantalion', rank: 'Duke',
    domains: ['illusion', 'knowledge'], legions: 36,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The seventy-first spirit, a mighty duke commanding 36 legions. Appears as a man with many faces — all men and women\'s faces. He teaches all arts and sciences and can change the countenances and thoughts of men. He can show the similitude of any person.',
  }
})()

// ─── Murmur — 54th Spirit ─────────────────────────────────────────────────
// Duke/Earl ruling 30 legions. Teaches philosophy; constrains souls of the dead.
const MURMUR: Demon = (() => {
  const ns = circle('murmur', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[3], 0.17), mkEdge(ns[1], ns[4], 0.17), mkEdge(ns[2], ns[5], 0.17),
    mkEdge(ns[0], ns[1], 0.16), mkEdge(ns[2], ns[3], 0.16),
    mkEdge(ns[4], ns[5], 0.09), mkEdge(ns[0], ns[4], 0.08),
  ]
  return {
    id: 'murmur', name: 'Murmur', rank: 'Duke',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-fourth spirit, a great duke and earl commanding 30 legions. Appears as a warrior riding a gryphon, wearing a ducal crown. He teaches philosophy and constrains souls of the dead to come before the conjuror to answer questions.',
  }
})()

export const DUKES: Demon[] = [
  AGARES, VALEFOR, BARBATOS, GUSION, ELIGOS, ZEPAR, BATHIN, SALLOS, AIM,
  BUNE, BERITH, ASTAROTH, FOCALOR, VEPAR, VUAL, CROCELL, ALLOCES,
  GREMORY, VAPULA, DANTALION, MURMUR,
]
