// ── Branded type helpers ──────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ── Primitives ───────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface TouchEvent {
  x: number;
  y: number;
  /** Pressure value normalised to 0–1. */
  pressure: number;
  timestamp: number;
}

// ── Stroke analysis ──────────────────────────────────────────────────

export interface StrokeResult {
  pathPoints: Point[];
  averageVelocity: number;
  pressureProfile: number[];
  curvature: number;
  duration: number;
  startPoint: Point;
  endPoint: Point;
}

// ── Node graph ───────────────────────────────────────────────────────

export type NodeId = Brand<string, 'NodeId'>;

export interface NodeConnection {
  fromNode: NodeId;
  toNode: NodeId;
  expectedPath: Point[];
  tolerance: {
    maxDeviation: number;
    maxAngularError: number;
  };
}

export interface ConnectionResult {
  attempted: NodeConnection;
  accuracy: number;
  deviationMap: Record<number, number>;
  valid: boolean;
}

// ── Glyphs ───────────────────────────────────────────────────────────

export type GlyphId = Brand<string, 'GlyphId'>;

export type GlyphInvariant =
  | 'must_close'
  | 'must_self_intersect'
  | 'must_not_close'
  | 'single_stroke'
  | 'multi_stroke';

export interface GlyphTemplate {
  id: GlyphId;
  strokeCount: number;
  invariants: GlyphInvariant[];
  canonicalPath: Point[];
}

export interface GlyphResult {
  recognized: GlyphId | null;
  confidence: number;
  alternates: { glyphId: GlyphId; confidence: number }[];
}

// ── Ring analysis ────────────────────────────────────────────────────

export interface ArcSegment {
  startAngle: number;
  endAngle: number;
  strength: number;
}

export interface RingResult {
  circularity: number;
  closure: number;
  consistency: number;
  overallStrength: number;
  weakPoints: ArcSegment[];
}

// ── Demonology ───────────────────────────────────────────────────────

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

export interface SealGeometry {
  nodes: { id: NodeId; normalizedPosition: Point }[];
  connections: NodeConnection[];
}

export interface Demon {
  id: string;
  name: string;
  rank: DemonRank;
  domains: DemonDomain[];
  legions: number;
  sealGeometry: SealGeometry;
  loreFragments: string[];
  attributes: string[];
}

// ── Sigil composition ────────────────────────────────────────────────

export interface PlacedGlyph {
  glyphId: GlyphId;
  position: Point;
  rotation: number;
  confidence: number;
}

export interface IntentCoherenceResult {
  score: number;
  contradictions: [GlyphId, GlyphId][];
  incompleteChains: GlyphId[][];
}

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
  | 'corrupted'
  | 'charged';

export interface Sigil {
  id: string;
  demonId: string;
  sealIntegrity: number;
  glyphs: PlacedGlyph[];
  intentCoherence: IntentCoherenceResult;
  bindingRing: RingResult;
  overallIntegrity: number;
  visualState: SigilVisualState;
  createdAt: number;
  status: SigilStatus;
}
