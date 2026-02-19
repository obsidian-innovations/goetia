import type { Demon, SealNode, SealEdge } from '../sigil/Types.ts'
import { nid, mkEdge, circle, hub } from './geometry.ts'

// ─── Vassago — 3rd Spirit ──────────────────────────────────────────────────
// Prince ruling 26 legions. Outer triangle + inner chevron.
const VASSAGO: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('vassago-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('vassago-n2'), position: { x: 0.92, y: 0.82 } },
    { id: nid('vassago-n3'), position: { x: 0.08, y: 0.82 } },
    { id: nid('vassago-n4'), position: { x: 0.68, y: 0.45 } },
    { id: nid('vassago-n5'), position: { x: 0.32, y: 0.45 } },
  ]
  const [n1, n2, n3, n4, n5] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.22), mkEdge(n2, n3, 0.22), mkEdge(n3, n1, 0.22),
    mkEdge(n4, n5, 0.12), mkEdge(n1, n4, 0.08), mkEdge(n3, n5, 0.08), mkEdge(n2, n4, 0.06),
  ]
  return {
    id: 'vassago', name: 'Vassago', rank: 'Prince',
    domains: ['revelation', 'knowledge'], legions: 26,
    sealGeometry: { nodes: ns, edges },
    description: 'The third spirit, a mighty prince commanding 26 legions of a good nature. He declares things past, present, and future, and discovers what is lost or hidden.',
  }
})()

// ─── Sitri — 12th Spirit ──────────────────────────────────────────────────
// Prince ruling 60 legions. Causes love and enflames desires.
const SITRI: Demon = (() => {
  const ns: SealNode[] = [
    { id: nid('sitri-n1'), position: { x: 0.50, y: 0.05 } },
    { id: nid('sitri-n2'), position: { x: 0.85, y: 0.55 } },
    { id: nid('sitri-n3'), position: { x: 0.15, y: 0.55 } },
    { id: nid('sitri-n4'), position: { x: 0.65, y: 0.28 } },
    { id: nid('sitri-n5'), position: { x: 0.35, y: 0.28 } },
    { id: nid('sitri-n6'), position: { x: 0.50, y: 0.75 } },
    { id: nid('sitri-n7'), position: { x: 0.80, y: 0.88 } },
  ]
  const [n1, n2, n3, n4, n5, n6, n7] = ns
  const edges: SealEdge[] = [
    mkEdge(n1, n2, 0.14), mkEdge(n2, n3, 0.14), mkEdge(n3, n1, 0.14),
    mkEdge(n4, n5, 0.12), mkEdge(n5, n6, 0.12), mkEdge(n6, n4, 0.12),
    mkEdge(n6, n7, 0.10), mkEdge(n7, n2, 0.12),
  ]
  return {
    id: 'sitri', name: 'Sitri', rank: 'Prince',
    domains: ['illusion', 'discord'], legions: 60,
    sealGeometry: { nodes: ns, edges },
    description: 'The twelfth spirit, a great prince commanding 60 legions. He appears with a leopard\'s head and gryphon wings. He enflames men with love and causes women to show themselves naked; reveals all secrets.',
  }
})()

// ─── Gaap — 33rd Spirit ───────────────────────────────────────────────────
// Prince/President ruling 66 legions. Causes love and hate; teaches philosophy.
const GAAP: Demon = (() => {
  const ns = circle('gaap', 6, 0.42)
  const h  = hub('gaap')
  const edges: SealEdge[] = [
    mkEdge(ns[0], ns[1], 0.10), mkEdge(ns[1], ns[2], 0.10), mkEdge(ns[2], ns[3], 0.10),
    mkEdge(ns[3], ns[4], 0.10), mkEdge(ns[4], ns[5], 0.10), mkEdge(ns[5], ns[0], 0.10),
    mkEdge(h, ns[0], 0.10), mkEdge(h, ns[2], 0.10), mkEdge(h, ns[4], 0.10),
    mkEdge(ns[1], ns[4], 0.10),
  ]
  return {
    id: 'gaap', name: 'Gaap', rank: 'Prince',
    domains: ['transformation', 'knowledge'], legions: 66,
    sealGeometry: { nodes: [...ns, h], edges },
    description: 'The thirty-third spirit, a great president and prince commanding 66 legions. He appears in the form of a man, going before four great and mighty kings. He can cause love or hate, teaches philosophy and liberal sciences, and can make men ignorant or knowing.',
  }
})()

export const PRINCES: Demon[] = [VASSAGO, SITRI, GAAP]
