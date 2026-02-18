import type { Demon, NodeId, Point, SealEdge } from '../sigil/Types.ts';

// ─── Errors ────────────────────────────────────────────────────────────────

export class DemonNotFoundError extends Error {
  readonly id: string;
  constructor(id: string) {
    super(`Demon not found: "${id}"`);
    this.id = id;
    this.name = 'DemonNotFoundError';
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Cast a plain string to the NodeId branded type. */
function nid(id: string): NodeId {
  return id as NodeId;
}

/** Build a straight-line seal edge with normalized control points. */
function mkEdge(
  fromNode: NodeId,
  fromPos: Point,
  toNode: NodeId,
  toPos: Point,
  weight: number,
): SealEdge {
  return { fromNode, toNode, canonicalPath: [fromPos, toPos], weight };
}

// ─── Bael — 1st Spirit ─────────────────────────────────────────────────────
// King ruling 66 legions. Appears with three heads: toad, cat, and man.
// Grants invisibility and cunning wisdom.
// Geometry: two interlocked triangles (hexagonal Star of Solomon).

const BAEL: Demon = (() => {
  const n1 = { id: nid('bael-n1'), position: { x: 0.50, y: 0.05 } }; // apex
  const n2 = { id: nid('bael-n2'), position: { x: 0.88, y: 0.27 } }; // upper-right
  const n3 = { id: nid('bael-n3'), position: { x: 0.88, y: 0.73 } }; // lower-right
  const n4 = { id: nid('bael-n4'), position: { x: 0.50, y: 0.95 } }; // nadir
  const n5 = { id: nid('bael-n5'), position: { x: 0.12, y: 0.73 } }; // lower-left
  const n6 = { id: nid('bael-n6'), position: { x: 0.12, y: 0.27 } }; // upper-left
  const nodes = [n1, n2, n3, n4, n5, n6];
  // Triangle A (n1-n3-n5) + Triangle B (n2-n4-n6); weights sum to 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n3.id, n3.position, 0.17), // △A side 1
    mkEdge(n3.id, n3.position, n5.id, n5.position, 0.17), // △A side 2
    mkEdge(n5.id, n5.position, n1.id, n1.position, 0.17), // △A side 3
    mkEdge(n2.id, n2.position, n4.id, n4.position, 0.17), // △B side 1
    mkEdge(n4.id, n4.position, n6.id, n6.position, 0.16), // △B side 2
    mkEdge(n6.id, n6.position, n2.id, n2.position, 0.16), // △B side 3
  ];
  return {
    id: 'bael',
    name: 'Bael',
    rank: 'King',
    domains: ['illusion', 'knowledge'],
    legions: 66,
    sealGeometry: { nodes, edges },
    description:
      'The first spirit of the Ars Goetia and a king of Hell commanding ' +
      '66 legions of infernal spirits. He appears with three heads — a toad, ' +
      'a cat, and a man — or sometimes as a human voice. He makes those who ' +
      'invoke him invisible and teaches them wisdom.',
  };
})();

// ─── Agares — 2nd Spirit ───────────────────────────────────────────────────
// Duke ruling 31 legions. Appears as an old man riding a crocodile, hawk in hand.
// Causes runaways to return, teaches all languages, provokes earthquakes.
// Geometry: six outer nodes forming a ring plus a hub and one long chord.

const AGARES: Demon = (() => {
  const n1 = { id: nid('agares-n1'), position: { x: 0.50, y: 0.05 } }; // top
  const n2 = { id: nid('agares-n2'), position: { x: 0.85, y: 0.25 } }; // upper-right
  const n3 = { id: nid('agares-n3'), position: { x: 0.95, y: 0.60 } }; // right
  const n4 = { id: nid('agares-n4'), position: { x: 0.73, y: 0.90 } }; // lower-right
  const n5 = { id: nid('agares-n5'), position: { x: 0.27, y: 0.90 } }; // lower-left
  const n6 = { id: nid('agares-n6'), position: { x: 0.05, y: 0.60 } }; // left
  const n7 = { id: nid('agares-n7'), position: { x: 0.50, y: 0.50 } }; // hub
  const nodes = [n1, n2, n3, n4, n5, n6, n7];
  // Outer hexagonal ring + three spokes from alternating nodes + one chord; sum = 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n2.id, n2.position, 0.10),
    mkEdge(n2.id, n2.position, n3.id, n3.position, 0.10),
    mkEdge(n3.id, n3.position, n4.id, n4.position, 0.10),
    mkEdge(n4.id, n4.position, n5.id, n5.position, 0.10),
    mkEdge(n5.id, n5.position, n6.id, n6.position, 0.10),
    mkEdge(n6.id, n6.position, n1.id, n1.position, 0.10),
    mkEdge(n1.id, n1.position, n7.id, n7.position, 0.10), // spoke
    mkEdge(n3.id, n3.position, n7.id, n7.position, 0.10), // spoke
    mkEdge(n5.id, n5.position, n7.id, n7.position, 0.10), // spoke
    mkEdge(n2.id, n2.position, n5.id, n5.position, 0.10), // long chord
  ];
  return {
    id: 'agares',
    name: 'Agares',
    rank: 'Duke',
    domains: ['knowledge', 'transformation', 'discord'],
    legions: 31,
    sealGeometry: { nodes, edges },
    description:
      'The second spirit of the Ars Goetia, a duke under the power of the ' +
      'East commanding 31 legions. He appears as a comely old man riding a ' +
      'crocodile and carrying a goshawk. He causes runaways and deserters to ' +
      'return, teaches all languages of mankind, and can cause earthquakes.',
  };
})();

// ─── Vassago — 3rd Spirit ──────────────────────────────────────────────────
// Prince (mighty) ruling 26 legions. Good nature. Declares past/present/future;
// discovers hidden and lost things.
// Geometry: outer triangle with two inner nodes forming an inverted chevron.

const VASSAGO: Demon = (() => {
  const n1 = { id: nid('vassago-n1'), position: { x: 0.50, y: 0.05 } }; // apex
  const n2 = { id: nid('vassago-n2'), position: { x: 0.92, y: 0.82 } }; // bottom-right
  const n3 = { id: nid('vassago-n3'), position: { x: 0.08, y: 0.82 } }; // bottom-left
  const n4 = { id: nid('vassago-n4'), position: { x: 0.68, y: 0.45 } }; // inner-right
  const n5 = { id: nid('vassago-n5'), position: { x: 0.32, y: 0.45 } }; // inner-left
  const nodes = [n1, n2, n3, n4, n5];
  // Outer equilateral triangle + inner horizontal bar + two anchor connectors; sum = 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n2.id, n2.position, 0.22), // outer right
    mkEdge(n2.id, n2.position, n3.id, n3.position, 0.22), // outer base
    mkEdge(n3.id, n3.position, n1.id, n1.position, 0.22), // outer left
    mkEdge(n4.id, n4.position, n5.id, n5.position, 0.12), // inner bar
    mkEdge(n1.id, n1.position, n4.id, n4.position, 0.08), // apex → inner-right
    mkEdge(n3.id, n3.position, n5.id, n5.position, 0.08), // base-left → inner-left
    mkEdge(n2.id, n2.position, n4.id, n4.position, 0.06), // base-right → inner-right
  ];
  return {
    id: 'vassago',
    name: 'Vassago',
    rank: 'Prince',
    domains: ['revelation', 'knowledge'],
    legions: 26,
    sealGeometry: { nodes, edges },
    description:
      'The third spirit of the Ars Goetia, a mighty prince commanding 26 ' +
      'legions of a good nature. He declares things past, present, and ' +
      'future, and discovers what is lost or hidden. He was of the same ' +
      'nature as Agares and was of the Order of Virtues.',
  };
})();

// ─── Samigina — 4th Spirit ─────────────────────────────────────────────────
// Marquis ruling 30 legions. Appears as a small horse or ass, then human.
// Teaches liberal sciences; speaks of souls of the dead who died in sin.
// Geometry: asymmetric star with two long crossing diagonals and an inner hub.

const SAMIGINA: Demon = (() => {
  const n1 = { id: nid('samigina-n1'), position: { x: 0.20, y: 0.10 } }; // upper-left
  const n2 = { id: nid('samigina-n2'), position: { x: 0.80, y: 0.10 } }; // upper-right
  const n3 = { id: nid('samigina-n3'), position: { x: 0.95, y: 0.55 } }; // right
  const n4 = { id: nid('samigina-n4'), position: { x: 0.60, y: 0.92 } }; // lower-right
  const n5 = { id: nid('samigina-n5'), position: { x: 0.15, y: 0.75 } }; // lower-left
  const n6 = { id: nid('samigina-n6'), position: { x: 0.45, y: 0.40 } }; // interior
  const nodes = [n1, n2, n3, n4, n5, n6];
  // Two long crossing diagonals + two secondary diagonals + three spokes from hub; sum = 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n3.id, n3.position, 0.17), // long diagonal ↘
    mkEdge(n2.id, n2.position, n5.id, n5.position, 0.17), // long diagonal ↙
    mkEdge(n3.id, n3.position, n5.id, n5.position, 0.14), // right to lower-left
    mkEdge(n1.id, n1.position, n4.id, n4.position, 0.14), // upper-left to lower-right
    mkEdge(n6.id, n6.position, n2.id, n2.position, 0.12), // hub → upper-right
    mkEdge(n6.id, n6.position, n4.id, n4.position, 0.12), // hub → lower-right
    mkEdge(n6.id, n6.position, n5.id, n5.position, 0.14), // hub → lower-left
  ];
  return {
    id: 'samigina',
    name: 'Samigina',
    rank: 'Marquis',
    domains: ['knowledge', 'revelation'],
    legions: 30,
    sealGeometry: { nodes, edges },
    description:
      'The fourth spirit of the Ars Goetia, a great marquis commanding ' +
      '30 legions. He appears first as a small horse or donkey, then takes ' +
      'human form when commanded. He teaches the liberal sciences and ' +
      'gives account of the souls of those who have died in sin.',
  };
})();

// ─── Marbas — 5th Spirit ──────────────────────────────────────────────────
// President ruling 36 legions. Appears first as a great lion.
// Reveals hidden things, causes and cures diseases, grants mechanical wisdom.
// Geometry: six nodes on a circle with alternating skip-one connections plus a center hub.

const MARBAS: Demon = (() => {
  const n1 = { id: nid('marbas-n1'), position: { x: 0.50, y: 0.05 } }; // top
  const n2 = { id: nid('marbas-n2'), position: { x: 0.82, y: 0.25 } }; // upper-right
  const n3 = { id: nid('marbas-n3'), position: { x: 0.82, y: 0.68 } }; // lower-right
  const n4 = { id: nid('marbas-n4'), position: { x: 0.50, y: 0.90 } }; // bottom
  const n5 = { id: nid('marbas-n5'), position: { x: 0.18, y: 0.68 } }; // lower-left
  const n6 = { id: nid('marbas-n6'), position: { x: 0.18, y: 0.25 } }; // upper-left
  const n7 = { id: nid('marbas-n7'), position: { x: 0.50, y: 0.48 } }; // center
  const nodes = [n1, n2, n3, n4, n5, n6, n7];
  // Six skip-one chords (hexagram) + four center spokes; sum = 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n3.id, n3.position, 0.14), // skip-one
    mkEdge(n2.id, n2.position, n4.id, n4.position, 0.14), // skip-one
    mkEdge(n3.id, n3.position, n5.id, n5.position, 0.14), // skip-one
    mkEdge(n4.id, n4.position, n6.id, n6.position, 0.14), // skip-one
    mkEdge(n5.id, n5.position, n1.id, n1.position, 0.14), // skip-one
    mkEdge(n6.id, n6.position, n2.id, n2.position, 0.14), // skip-one
    mkEdge(n7.id, n7.position, n1.id, n1.position, 0.10), // spoke
    mkEdge(n7.id, n7.position, n2.id, n2.position, 0.03), // spoke
    mkEdge(n7.id, n7.position, n4.id, n4.position, 0.10), // spoke
    mkEdge(n7.id, n7.position, n5.id, n5.position, 0.03), // spoke
  ];
  return {
    id: 'marbas',
    name: 'Marbas',
    rank: 'President',
    domains: ['knowledge', 'transformation', 'revelation'],
    legions: 36,
    sealGeometry: { nodes, edges },
    description:
      'The fifth spirit of the Ars Goetia, a great president commanding ' +
      '36 legions. He appears first as a great lion, then as a man when ' +
      'requested. He answers truly of things hidden or secret, causes and ' +
      'cures diseases, grants great wisdom and knowledge of mechanical arts, ' +
      'and can transform men into other shapes.',
  };
})();

// ─── Valefor — 6th Spirit ─────────────────────────────────────────────────
// Duke ruling 10 legions. Appears with a lion's head and a donkey's head braying.
// Tempts men to steal; is a good familiar to the magician, until caught.
// Geometry: irregular pentagon (five outer nodes) with one crossing diagonal.

const VALEFOR: Demon = (() => {
  const n1 = { id: nid('valefor-n1'), position: { x: 0.50, y: 0.05 } }; // top
  const n2 = { id: nid('valefor-n2'), position: { x: 0.92, y: 0.48 } }; // right
  const n3 = { id: nid('valefor-n3'), position: { x: 0.62, y: 0.95 } }; // lower-right
  const n4 = { id: nid('valefor-n4'), position: { x: 0.18, y: 0.78 } }; // lower-left
  const n5 = { id: nid('valefor-n5'), position: { x: 0.08, y: 0.30 } }; // left
  const nodes = [n1, n2, n3, n4, n5];
  // Irregular pentagon + one crossing diagonal; sum = 1.0
  const edges: SealEdge[] = [
    mkEdge(n1.id, n1.position, n2.id, n2.position, 0.18), // top → right
    mkEdge(n2.id, n2.position, n3.id, n3.position, 0.18), // right → lower-right
    mkEdge(n3.id, n3.position, n4.id, n4.position, 0.18), // lower-right → lower-left
    mkEdge(n4.id, n4.position, n5.id, n5.position, 0.18), // lower-left → left
    mkEdge(n5.id, n5.position, n1.id, n1.position, 0.18), // left → top
    mkEdge(n1.id, n1.position, n3.id, n3.position, 0.10), // crossing diagonal
  ];
  return {
    id: 'valefor',
    name: 'Valefor',
    rank: 'Duke',
    domains: ['binding', 'discord', 'illusion'],
    legions: 10,
    sealGeometry: { nodes, edges },
    description:
      'The sixth spirit of the Ars Goetia, a duke commanding 10 legions. ' +
      'He appears with the head of a lion and a head of a donkey that brays. ' +
      'He makes men thieves and good companions among themselves, and tempts ' +
      'men to steal. He is a good familiar, but will eventually betray those ' +
      'who trust him.',
  };
})();

// ─── Registry ──────────────────────────────────────────────────────────────

export const DEMON_REGISTRY: Record<string, Demon> = {
  bael: BAEL,
  agares: AGARES,
  vassago: VASSAGO,
  samigina: SAMIGINA,
  marbas: MARBAS,
  valefor: VALEFOR,
};

/**
 * Retrieve a demon by its lowercase string id.
 * @throws {DemonNotFoundError} if no demon with that id exists in the registry.
 */
export function getDemon(id: string): Demon {
  const demon = DEMON_REGISTRY[id];
  if (demon === undefined) {
    throw new DemonNotFoundError(id);
  }
  return demon;
}

/** Return all demons in the registry as an ordered array. */
export function listDemons(): Demon[] {
  return Object.values(DEMON_REGISTRY);
}
