// ─── Primitive geometry ────────────────────────────────────────────────────

export type Point = {
  x: number;
  y: number;
};

// ─── Input ─────────────────────────────────────────────────────────────────

export type PointerInputEvent = {
  x: number;
  y: number;
  /** 0–1; defaults to 0.5 when the hardware does not report pressure */
  pressure: number;
  timestamp: number;
  pointerId: number;
};

// ─── Stroke analysis ───────────────────────────────────────────────────────

export type StrokeResult = {
  pathPoints: Point[];
  simplifiedPoints: Point[];
  averageVelocity: number;
  pressureProfile: number[];
  curvature: number[];
  duration: number;
  startPoint: Point;
  endPoint: Point;
  totalLength: number;
};

// ─── Branded ID types ──────────────────────────────────────────────────────

declare const _nodeIdBrand: unique symbol;
/** Branded string that identifies a seal node. */
export type NodeId = string & { readonly [_nodeIdBrand]: typeof _nodeIdBrand };

declare const _glyphIdBrand: unique symbol;
/** Branded string that identifies a recognised glyph. */
export type GlyphId = string & { readonly [_glyphIdBrand]: typeof _glyphIdBrand };

// ─── Seal-node connection ──────────────────────────────────────────────────

export type ConnectionResult = {
  fromNode: NodeId;
  toNode: NodeId;
  /** 0–1 match against the canonical edge path */
  accuracy: number;
  /** Mean squared deviation from the canonical path in normalised units */
  deviation: number;
  valid: boolean;
};

// ─── Glyph difficulty ─────────────────────────────────────────────────────

export type GlyphDifficulty = 'easy' | 'normal' | 'hard'

export type GlyphDifficultyConfig = {
  /** Minimum Procrustes score to accept a recognition (0–1) */
  confidenceThreshold: number
  /** Multiplier on RMSD when converting to score; higher = stricter */
  rmsdMultiplier: number
}

export const GLYPH_DIFFICULTY_CONFIGS: Record<GlyphDifficulty, GlyphDifficultyConfig> = {
  easy:   { confidenceThreshold: 0.40, rmsdMultiplier: 1.5 },
  normal: { confidenceThreshold: 0.55, rmsdMultiplier: 2.0 },
  hard:   { confidenceThreshold: 0.70, rmsdMultiplier: 2.5 },
}

// ─── Intent glyphs ─────────────────────────────────────────────────────────

export type GlyphInvariant =
  | 'must_close'
  | 'must_self_intersect'
  | 'must_not_close'
  | 'single_stroke'
  | 'clockwise'
  | 'counterclockwise';

export type GlyphResult = {
  recognized: GlyphId | null;
  /** 0–1 confidence for the top candidate */
  confidence: number;
  alternates: Array<{ glyph: GlyphId; confidence: number }>;
};

// ─── Binding ring ──────────────────────────────────────────────────────────

export type RingWeakPoint = {
  startAngle: number;
  endAngle: number;
  /** 0–1; lower means weaker */
  strength: number;
};

export type RingResult = {
  /** 0–1; how circular the path is */
  circularity: number;
  /** 0–1; how well the ring closes */
  closure: number;
  /** 0–1; uniformity of stroke width / pressure */
  consistency: number;
  /** 0–1; composite seal strength */
  overallStrength: number;
  weakPoints: RingWeakPoint[];
  center: Point;
  /** In normalised units (0–1 space) */
  radius: number;
};

// ─── Demon taxonomy ────────────────────────────────────────────────────────

export type DemonRank =
  | 'King'
  | 'Duke'
  | 'Prince'
  | 'Marquis'
  | 'Earl'
  | 'Knight'
  | 'President'
  | 'Baron';

export type DemonDomain =
  | 'knowledge'
  | 'destruction'
  | 'illusion'
  | 'binding'
  | 'transformation'
  | 'discord'
  | 'protection'
  | 'revelation'
  | 'liberation';

// ─── Seal geometry ─────────────────────────────────────────────────────────

export type SealNode = {
  id: NodeId;
  /** Normalised position, both axes in [0, 1] */
  position: Point;
};

export type SealEdge = {
  fromNode: NodeId;
  toNode: NodeId;
  /** Normalised control points describing the canonical path of this edge */
  canonicalPath: Point[];
  /** 0–1; importance weighting for integrity scoring; all edges for a demon sum to ~1.0 */
  weight: number;
};

export type SealGeometry = {
  nodes: SealNode[];
  edges: SealEdge[];
};

// ─── Placed glyphs ─────────────────────────────────────────────────────────

export type PlacedGlyph = {
  glyphId: GlyphId;
  position: Point;
  confidence: number;
  timestamp: number;
};

export type IntentCoherenceResult = {
  /** 0–1 overall coherence score */
  score: number;
  contradictions: Array<[GlyphId, GlyphId]>;
  incompleteChains: GlyphId[][];
  isolatedGlyphs: GlyphId[];
};

// ─── Sigil lifecycle ───────────────────────────────────────────────────────

export type SigilStatus =
  | 'draft'
  | 'complete'
  | 'resting'
  | 'awakened'
  | 'charged'
  | 'spent';

export type SigilVisualState =
  | 'dormant'
  | 'unstable'
  | 'healthy'
  | 'charged'
  | 'corrupted';

// ─── Aggregate types ───────────────────────────────────────────────────────

export type Sigil = {
  id: string;
  demonId: string;
  /** 0–1 composite score of how faithfully the seal was traced */
  sealIntegrity: number;
  completedConnections: ConnectionResult[];
  glyphs: PlacedGlyph[];
  intentCoherence: IntentCoherenceResult;
  bindingRing: RingResult | null;
  /** 0–1 final ritual quality */
  overallIntegrity: number;
  visualState: SigilVisualState;
  status: SigilStatus;
  createdAt: number;
  /** Timestamp of the last status change; defaults to createdAt for existing sigils */
  statusChangedAt: number;
};

export type Demon = {
  id: string;
  name: string;
  rank: DemonRank;
  domains: DemonDomain[];
  /** Number of legions commanded */
  legions: number;
  sealGeometry: SealGeometry;
  description: string;
};
