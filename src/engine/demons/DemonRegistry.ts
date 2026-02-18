import type { Demon, NodeId, Point, NodeConnection, SealGeometry } from '@engine/sigil/Types';

// ── Helpers ──────────────────────────────────────────────────────────

function nodeId(id: string): NodeId {
  return id as NodeId;
}

function node(id: string, x: number, y: number): { id: NodeId; normalizedPosition: Point } {
  return { id: nodeId(id), normalizedPosition: { x, y } };
}

function conn(
  from: string,
  to: string,
  path: [number, number][],
  maxDeviation = 0.08,
  maxAngularError = 15,
): NodeConnection {
  return {
    fromNode: nodeId(from),
    toNode: nodeId(to),
    expectedPath: path.map(([x, y]) => ({ x, y })),
    tolerance: { maxDeviation, maxAngularError },
  };
}

function seal(
  nodes: { id: NodeId; normalizedPosition: Point }[],
  connections: NodeConnection[],
): SealGeometry {
  return { nodes, connections };
}

// ── Demon definitions ────────────────────────────────────────────────

const DEMONS: readonly Demon[] = [
  // #1 — Bael
  {
    id: 'bael',
    name: 'Bael',
    rank: 'King',
    domains: ['illusion', 'knowledge'],
    legions: 66,
    sealGeometry: seal(
      [
        node('b1', 0.5, 0.05),
        node('b2', 0.85, 0.3),
        node('b3', 0.95, 0.7),
        node('b4', 0.65, 0.95),
        node('b5', 0.35, 0.95),
        node('b6', 0.05, 0.7),
        node('b7', 0.15, 0.3),
        node('b8', 0.5, 0.5),
      ],
      [
        conn('b1', 'b3', [[0.5, 0.05], [0.7, 0.2], [0.95, 0.7]]),
        conn('b3', 'b5', [[0.95, 0.7], [0.65, 0.85], [0.35, 0.95]]),
        conn('b5', 'b7', [[0.35, 0.95], [0.15, 0.7], [0.15, 0.3]]),
        conn('b7', 'b2', [[0.15, 0.3], [0.5, 0.15], [0.85, 0.3]]),
        conn('b2', 'b4', [[0.85, 0.3], [0.8, 0.6], [0.65, 0.95]]),
        conn('b4', 'b6', [[0.65, 0.95], [0.3, 0.85], [0.05, 0.7]]),
        conn('b6', 'b1', [[0.05, 0.7], [0.15, 0.3], [0.5, 0.05]]),
        conn('b8', 'b1', [[0.5, 0.5], [0.5, 0.05]]),
        conn('b8', 'b4', [[0.5, 0.5], [0.65, 0.95]]),
      ],
    ),
    loreFragments: [
      'First king of Hell, commanding the eastern regions.',
      'Appears with the head of a cat, a toad, and a man.',
      'Grants the power of invisibility to those who invoke him.',
    ],
    attributes: ['invisibility', 'sovereignty', 'shapeshifting'],
  },

  // #2 — Agares
  {
    id: 'agares',
    name: 'Agares',
    rank: 'Duke',
    domains: ['knowledge', 'destruction', 'liberation'],
    legions: 31,
    sealGeometry: seal(
      [
        node('a1', 0.5, 0.0),
        node('a2', 0.9, 0.25),
        node('a3', 1.0, 0.65),
        node('a4', 0.7, 1.0),
        node('a5', 0.3, 1.0),
        node('a6', 0.0, 0.65),
        node('a7', 0.1, 0.25),
      ],
      [
        conn('a1', 'a2', [[0.5, 0.0], [0.7, 0.1], [0.9, 0.25]]),
        conn('a2', 'a3', [[0.9, 0.25], [0.95, 0.45], [1.0, 0.65]]),
        conn('a3', 'a4', [[1.0, 0.65], [0.85, 0.85], [0.7, 1.0]]),
        conn('a4', 'a5', [[0.7, 1.0], [0.5, 1.0], [0.3, 1.0]]),
        conn('a5', 'a6', [[0.3, 1.0], [0.15, 0.85], [0.0, 0.65]]),
        conn('a6', 'a7', [[0.0, 0.65], [0.05, 0.45], [0.1, 0.25]]),
        conn('a7', 'a1', [[0.1, 0.25], [0.3, 0.1], [0.5, 0.0]]),
        conn('a1', 'a4', [[0.5, 0.0], [0.6, 0.5], [0.7, 1.0]]),
        conn('a1', 'a5', [[0.5, 0.0], [0.4, 0.5], [0.3, 1.0]]),
      ],
    ),
    loreFragments: [
      'Rides a crocodile and carries a goshawk on his fist.',
      'Teaches all languages and causes earthquakes.',
      'Can make runaways return and cause those who stand still to flee.',
    ],
    attributes: ['languages', 'earthquakes', 'pursuit', 'flight'],
  },

  // #3 — Vassago
  {
    id: 'vassago',
    name: 'Vassago',
    rank: 'Prince',
    domains: ['revelation', 'knowledge'],
    legions: 26,
    sealGeometry: seal(
      [
        node('v1', 0.5, 0.1),
        node('v2', 0.8, 0.2),
        node('v3', 0.9, 0.6),
        node('v4', 0.5, 0.9),
        node('v5', 0.1, 0.6),
        node('v6', 0.2, 0.2),
        node('v7', 0.5, 0.45),
      ],
      [
        conn('v1', 'v3', [[0.5, 0.1], [0.7, 0.35], [0.9, 0.6]]),
        conn('v3', 'v5', [[0.9, 0.6], [0.5, 0.65], [0.1, 0.6]]),
        conn('v5', 'v1', [[0.1, 0.6], [0.3, 0.35], [0.5, 0.1]]),
        conn('v2', 'v4', [[0.8, 0.2], [0.65, 0.55], [0.5, 0.9]]),
        conn('v4', 'v6', [[0.5, 0.9], [0.35, 0.55], [0.2, 0.2]]),
        conn('v6', 'v2', [[0.2, 0.2], [0.5, 0.15], [0.8, 0.2]]),
        conn('v7', 'v1', [[0.5, 0.45], [0.5, 0.1]]),
        conn('v7', 'v4', [[0.5, 0.45], [0.5, 0.9]]),
      ],
    ),
    loreFragments: [
      'Of the same nature as Agares; a prince of a good nature.',
      'Discovers hidden and lost things, and reveals past and future events.',
      'Appears in the form of an old man riding a crocodile.',
    ],
    attributes: ['divination', 'lost-objects', 'prophecy'],
  },

  // #4 — Samigina (Gamigin)
  {
    id: 'samigina',
    name: 'Samigina',
    rank: 'Marquis',
    domains: ['knowledge', 'revelation'],
    legions: 30,
    sealGeometry: seal(
      [
        node('s1', 0.5, 0.0),
        node('s2', 0.85, 0.15),
        node('s3', 1.0, 0.5),
        node('s4', 0.85, 0.85),
        node('s5', 0.5, 1.0),
        node('s6', 0.15, 0.85),
        node('s7', 0.0, 0.5),
        node('s8', 0.15, 0.15),
        node('s9', 0.5, 0.5),
      ],
      [
        conn('s1', 's2', [[0.5, 0.0], [0.85, 0.15]]),
        conn('s2', 's3', [[0.85, 0.15], [1.0, 0.5]]),
        conn('s3', 's4', [[1.0, 0.5], [0.85, 0.85]]),
        conn('s4', 's5', [[0.85, 0.85], [0.5, 1.0]]),
        conn('s5', 's6', [[0.5, 1.0], [0.15, 0.85]]),
        conn('s6', 's7', [[0.15, 0.85], [0.0, 0.5]]),
        conn('s7', 's8', [[0.0, 0.5], [0.15, 0.15]]),
        conn('s8', 's1', [[0.15, 0.15], [0.5, 0.0]]),
        conn('s9', 's1', [[0.5, 0.5], [0.5, 0.0]]),
        conn('s9', 's5', [[0.5, 0.5], [0.5, 1.0]]),
        conn('s9', 's3', [[0.5, 0.5], [1.0, 0.5]]),
        conn('s9', 's7', [[0.5, 0.5], [0.0, 0.5]]),
      ],
    ),
    loreFragments: [
      'Appears in the form of a small horse or donkey.',
      'Teaches all liberal sciences and gives account of dead souls.',
      'Speaks with a hoarse voice and answers questions about the deceased.',
    ],
    attributes: ['necromancy', 'liberal-sciences', 'spirit-communication'],
  },

  // #5 — Marbas
  {
    id: 'marbas',
    name: 'Marbas',
    rank: 'President',
    domains: ['knowledge', 'transformation', 'destruction'],
    legions: 36,
    sealGeometry: seal(
      [
        node('m1', 0.5, 0.05),
        node('m2', 0.9, 0.35),
        node('m3', 0.8, 0.85),
        node('m4', 0.2, 0.85),
        node('m5', 0.1, 0.35),
        node('m6', 0.35, 0.4),
        node('m7', 0.65, 0.4),
      ],
      [
        conn('m1', 'm2', [[0.5, 0.05], [0.75, 0.15], [0.9, 0.35]]),
        conn('m2', 'm3', [[0.9, 0.35], [0.9, 0.6], [0.8, 0.85]]),
        conn('m3', 'm4', [[0.8, 0.85], [0.5, 0.9], [0.2, 0.85]]),
        conn('m4', 'm5', [[0.2, 0.85], [0.1, 0.6], [0.1, 0.35]]),
        conn('m5', 'm1', [[0.1, 0.35], [0.25, 0.15], [0.5, 0.05]]),
        conn('m1', 'm3', [[0.5, 0.05], [0.7, 0.45], [0.8, 0.85]]),
        conn('m1', 'm4', [[0.5, 0.05], [0.3, 0.45], [0.2, 0.85]]),
        conn('m6', 'm7', [[0.35, 0.4], [0.5, 0.35], [0.65, 0.4]]),
        conn('m6', 'm3', [[0.35, 0.4], [0.55, 0.65], [0.8, 0.85]]),
        conn('m7', 'm4', [[0.65, 0.4], [0.45, 0.65], [0.2, 0.85]]),
      ],
    ),
    loreFragments: [
      'Appears first as a great lion, then assumes human shape.',
      'Answers truly of things hidden or secret.',
      'Causes and cures diseases, teaches mechanical arts and crafts.',
    ],
    attributes: ['healing', 'disease', 'mechanical-arts', 'shapeshifting'],
  },

  // #6 — Valefor
  {
    id: 'valefor',
    name: 'Valefor',
    rank: 'Duke',
    domains: ['discord', 'illusion', 'binding'],
    legions: 10,
    sealGeometry: seal(
      [
        node('vf1', 0.5, 0.0),
        node('vf2', 0.95, 0.35),
        node('vf3', 0.8, 0.9),
        node('vf4', 0.2, 0.9),
        node('vf5', 0.05, 0.35),
        node('vf6', 0.5, 0.55),
      ],
      [
        conn('vf1', 'vf2', [[0.5, 0.0], [0.75, 0.15], [0.95, 0.35]]),
        conn('vf2', 'vf3', [[0.95, 0.35], [0.9, 0.65], [0.8, 0.9]]),
        conn('vf3', 'vf4', [[0.8, 0.9], [0.5, 0.95], [0.2, 0.9]]),
        conn('vf4', 'vf5', [[0.2, 0.9], [0.1, 0.65], [0.05, 0.35]]),
        conn('vf5', 'vf1', [[0.05, 0.35], [0.25, 0.15], [0.5, 0.0]]),
        conn('vf1', 'vf3', [[0.5, 0.0], [0.7, 0.45], [0.8, 0.9]]),
        conn('vf1', 'vf4', [[0.5, 0.0], [0.3, 0.45], [0.2, 0.9]]),
        conn('vf6', 'vf2', [[0.5, 0.55], [0.75, 0.45], [0.95, 0.35]]),
        conn('vf6', 'vf5', [[0.5, 0.55], [0.25, 0.45], [0.05, 0.35]]),
      ],
    ),
    loreFragments: [
      'Appears as a lion with the head of a donkey.',
      'Tempts people to steal and leads thieves to the gallows.',
      'A familiar that is good until caught, then turns on the summoner.',
    ],
    attributes: ['thievery', 'temptation', 'familiars'],
  },
] as const;

// ── Registry map ─────────────────────────────────────────────────────

const registry: Record<string, Demon> = {};
for (const d of DEMONS) {
  registry[d.id] = d;
}

// ── Public API ───────────────────────────────────────────────────────

export function getDemon(id: string): Demon | undefined {
  return registry[id];
}

export function listDemons(): readonly Demon[] {
  return DEMONS;
}
