import type { Demon, SealNode, SealEdge } from '../sigil/Types.ts'
import { nid, mkEdge, circle, hub, pentagram, wheel } from './geometry.ts'

// ─── Marbas — 5th Spirit ──────────────────────────────────────────────────
// President ruling 36 legions. Reveals hidden things; cures diseases.
const MARBAS: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('marbas-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('marbas-n2'), position: { x: 0.82, y: 0.25 } },
    { id: nid('marbas-n3'), position: { x: 0.82, y: 0.68 } },
    { id: nid('marbas-n4'), position: { x: 0.50, y: 0.90 } },
    { id: nid('marbas-n5'), position: { x: 0.18, y: 0.68 } },
    { id: nid('marbas-n6'), position: { x: 0.18, y: 0.25 } },
    { id: nid('marbas-n7'), position: { x: 0.50, y: 0.48 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n3, 0.14), mkEdge(n2, n4, 0.14), mkEdge(n3, n5, 0.14),
    mkEdge(n4, n6, 0.14), mkEdge(n5, n1, 0.14), mkEdge(n6, n2, 0.14),
    mkEdge(n7, n1, 0.10), mkEdge(n7, n2, 0.03), mkEdge(n7, n4, 0.10), mkEdge(n7, n5, 0.03),
  ]
  return {
    id: 'marbas', name: 'Marbas', rank: 'President',
    domains: ['knowledge', 'transformation', 'revelation'], legions: 36,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifth spirit, a great president commanding 36 legions. He appears first as a great lion, then as a man. He reveals hidden things, causes and cures diseases, and grants great wisdom in mechanical arts.',
  }
})()

// ─── Buer — 10th Spirit ───────────────────────────────────────────────────
// President ruling 50 legions. Teaches philosophy and heals diseases.
const BUER: Demon = (() => {
  const { nodes, edges } = wheel('buer', 5)
  return {
    id: 'buer', name: 'Buer', rank: 'President',
    domains: ['knowledge', 'transformation'], legions: 50,
    sealGeometry: { nodes, edges },
    description: 'The tenth spirit, a great president governing 50 legions, who appears when the sun is in Sagittarius. He teaches philosophy, moral and natural virtues, the virtues of herbs and plants, and heals all distempers.',
  }
})()

// ─── Glasya-Labolas — 25th Spirit ─────────────────────────────────────────
// President ruling 36 legions. Teaches all arts and sciences.
const GLASYA_LABOLAS: Demon = (() => {
  const ns = circle('glasya', 6, 0.42)
  const h  = hub('glasya')
  const edges = [
    mkEdge(ns[0], ns[2], 0.14), mkEdge(ns[2], ns[4], 0.14), mkEdge(ns[4], ns[0], 0.14),
    mkEdge(ns[1], ns[3], 0.14), mkEdge(ns[3], ns[5], 0.14), mkEdge(ns[5], ns[1], 0.14),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[3], 0.10),
    mkEdge(ns[0], ns[3], 0.06),
  ]
  return {
    id: 'glasya-labolas', name: 'Glasya-Labolas', rank: 'President',
    domains: ['knowledge', 'discord'], legions: 36,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The twenty-fifth spirit, a mighty president commanding 36 legions. Appears as a dog with wings like a gryphon. He teaches all arts and sciences, and can make a man invisible. He knows things past and future and causes bloodshed.',
  }
})()

// ─── Foras — 31st Spirit ──────────────────────────────────────────────────
// President ruling 29 legions. Teaches logic and ethics; reveals herbs.
const FORAS: Demon = (() => {
  const ns = circle('foras', 5, 0.42)
  const h  = hub('foras')
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[1], 0.10), mkEdge(h, ns[2], 0.10),
    mkEdge(h, ns[3], 0.10), mkEdge(h, ns[4], 0.10),
  ]
  return {
    id: 'foras', name: 'Foras', rank: 'President',
    domains: ['knowledge', 'revelation'], legions: 29,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirty-first spirit, a mighty president commanding 29 legions. He appears as a strong man in human form. He teaches logic, ethics, and the virtues of herbs and precious stones. He can make a man long-lived and witty.',
  }
})()

// ─── Malphas — 39th Spirit ────────────────────────────────────────────────
// President ruling 40 legions. Builds towers and overthrows enemies' buildings.
const MALPHAS: Demon = (() => {
  const ns = circle('malphas', 4, 0.40)
  const h  = hub('malphas')
  const edges = [
    mkEdge(ns[0], ns[1], 0.13), mkEdge(ns[1], ns[2], 0.13), mkEdge(ns[2], ns[3], 0.13),
    mkEdge(ns[3], ns[0], 0.13), mkEdge(ns[0], ns[2], 0.12), mkEdge(ns[1], ns[3], 0.12),
    mkEdge(h, ns[0], 0.12), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'malphas', name: 'Malphas', rank: 'President',
    domains: ['destruction', 'binding'], legions: 40,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirty-ninth spirit, a mighty president commanding 40 legions. Appears first as a crow, then as a man. He builds towers and overthrows enemies\' edifices. He knows thoughts and desires, and gives good familiars.',
  }
})()

// ─── Caim — 53rd Spirit ───────────────────────────────────────────────────
// President ruling 30 legions. Gives understanding of birds and cattle sounds.
const CAIM: Demon = (() => {
  const { nodes, edges } = pentagram('caim')
  return {
    id: 'caim', name: 'Caim', rank: 'President',
    domains: ['knowledge', 'revelation'], legions: 30,
    sealGeometry: { nodes, edges },
    description: 'The fifty-third spirit, a great president commanding 30 legions. Appears first as a thrush, then as a man carrying a sharp sword. He gives understanding of the voices of birds, cattle, dogs, and other creatures, and of waters.',
  }
})()

// ─── Ose — 57th Spirit ────────────────────────────────────────────────────
// President ruling 30 legions. Makes men mad; gives knowledge of divine and secret sciences.
const OSE: Demon = (() => {
  const ns = circle('ose', 6, 0.42)
  const edges = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(ns[0], ns[3], 0.10), mkEdge(ns[1], ns[4], 0.10),
    mkEdge(ns[2], ns[5], 0.10), mkEdge(ns[0], ns[2], 0.10),
  ]
  return {
    id: 'ose', name: 'Ose', rank: 'President',
    domains: ['illusion', 'knowledge'], legions: 30,
    sealGeometry: { nodes: ns, edges },
    description: 'The fifty-seventh spirit, a great president commanding 30 legions. Appears first as a leopard, then as a man. He makes men cunning in the liberal sciences and gives true answers of divine and secret things. He can change men into any shape.',
  }
})()

// ─── Amy — 58th Spirit ────────────────────────────────────────────────────
// President ruling 36 legions. Gives familiars; reveals treasure kept by spirits.
const AMY: Demon = (() => {
  const ns = circle('amy', 5, 0.42)
  const h  = hub('amy')
  const edges = [
    mkEdge(ns[0], ns[2], 0.15), mkEdge(ns[2], ns[4], 0.15), mkEdge(ns[4], ns[1], 0.15),
    mkEdge(ns[1], ns[3], 0.15), mkEdge(ns[3], ns[0], 0.15),
    mkEdge(h, ns[0], 0.13), mkEdge(h, ns[2], 0.12),
  ]
  return {
    id: 'amy', name: 'Amy', rank: 'President',
    domains: ['revelation', 'knowledge'], legions: 36,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The fifty-eighth spirit, a great president commanding 36 legions. Appears first as a flaming fire, then as a man. He makes man passing knowing in astrology and all liberal sciences, and gives good familiars.',
  }
})()

export const PRESIDENTS: Demon[] = [
  MARBAS, BUER, GLASYA_LABOLAS, FORAS, MALPHAS, CAIM, OSE, AMY,
]
