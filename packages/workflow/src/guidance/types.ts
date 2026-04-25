/**
 * Guidance system types for Maliang Deck agent guidance.
 *
 * These types define the structured core of the agent guidance system.
 * They are consumed by the style registry, work-order enricher, and
 * quality validators. Narrative role docs live in docs/agent-guidance/.
 */

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

export type PaletteTokens = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  /** Semantic colors for data visualization (success, warning, danger, info). */
  semantic?: Record<string, string>;
  /** Chart data series palette (hex colors). */
  chartPalette?: string[];
};

export type TypographyTokens = {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  /** Scale ratio applied between heading levels (e.g. 1.25 = Major Third). */
  scaleRatio: number;
};

export type SpacingTokens = {
  /** Pixels between elements on the same slide. */
  element: number;
  /** Pixels between major sections or slide regions. */
  section: number;
  /** Slide edge margins: top, right, bottom, left. */
  margin: { top: number; right: number; bottom: number; left: number };
};

export type ElevationTokens = {
  /** Drop shadow or z-depth level for card/overlay elements. */
  card?: string;
  overlay?: string;
};

export type DesignTokens = {
  palette: PaletteTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  elevation?: ElevationTokens;
  /** Default chart styling for this design system. */
  chartDefaults?: {
    showLegend?: boolean;
    legendPosition?: 'top' | 'bottom' | 'right';
    gridLines?: boolean;
    rounded?: boolean;
  };
  /** Default table styling for this design system. */
  tableDefaults?: {
    rowStripe?: boolean;
    rounded?: boolean;
    headerContrast?: 'strong' | 'subtle' | 'none';
  };
};

// ---------------------------------------------------------------------------
// Layout patterns
// ---------------------------------------------------------------------------

export type ElementPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Named recipe describing element roles and their positions on a slide. */
export type LayoutPattern = {
  id: string;
  name: string;
  /** One-line description of when to use this pattern. */
  purpose: string;
  /** Slide types this pattern applies to. */
  slideTypes: SlideType[];
  /** Map of element role name to its bounding box on the slide canvas. */
  elementPositions: Record<string, ElementPosition>;
  density: 'low' | 'medium' | 'high';
};

// ---------------------------------------------------------------------------
// Slide types
// ---------------------------------------------------------------------------

export type SlideType = 'title' | 'section' | 'evidence' | 'chart' | 'summary' | 'closing';

// ---------------------------------------------------------------------------
// Stage guidance
// ---------------------------------------------------------------------------

export type OutlineGuidance = {
  /** Framing questions for audience analysis. */
  audienceAnalysis: string[];
  /** Story arc templates appropriate for this style. */
  storyArc: string[];
  /** How to prioritize information across slides vs notes vs appendix. */
  infoHierarchy: string[];
};

export type DeckPlanGuidance = {
  /** Layout pattern recommendations keyed by slide purpose/type. */
  layoutRecommendations: Record<string, string>;
  /** Default visualization type for common content categories. */
  vizDefaults: Record<string, string>;
  /** Chart/table theming guidance for this style. */
  chartTableGuidance?: string[];
};

export type SlideDslGuidance = {
  /** Rules governing element type choices. */
  elementRules: string[];
  /** Color usage rules referencing style palette. */
  colorRules: string[];
  /** Positioning and spacing rules. */
  positioningRules: string[];
  /**
   * Locked design tokens passed from deckDesign to prevent per-slide drift
   * during parallel generation.
   */
  lockedTokens?: LockedTokens;
  /** Full project style contract for this slide generation task. */
  styleContract?: DeckDesign;
  /** Resolved layout pattern selected for this slide. */
  layoutPattern?: LayoutPattern;
  /** Assets this slide is allowed to reference. */
  approvedAssets?: ApprovedAsset[];
};

export type StageGuidance = {
  outline: OutlineGuidance;
  deckPlan: DeckPlanGuidance;
  slideDsl: SlideDslGuidance;
};

// ---------------------------------------------------------------------------
// Quality rules
// ---------------------------------------------------------------------------

export type LintResult = {
  ruleId: string;
  severity: 'error' | 'warning';
  message: string;
  slideId: string;
  elementId?: string;
};

export type QualityRule = {
  id: string;
  name: string;
  severity: 'error' | 'warning';
  /** Style IDs this rule applies to. Empty array = applies to all styles. */
  applicableStyles: string[];
  /** Human-readable description of what this rule checks. */
  description: string;
};

// ---------------------------------------------------------------------------
// Role doc references
// ---------------------------------------------------------------------------

export type RoleDocRef = {
  /** Relative path from repo root to the role doc. */
  path: string;
  /** Role this doc serves: 'strategist' | 'executor' | 'shared'. */
  role: string;
};

// ---------------------------------------------------------------------------
// Renderer capabilities
// ---------------------------------------------------------------------------

/** Feature support level across renderers. */
export type RendererSupportLevel = 'full' | 'partial' | 'none';

/**
 * Maps feature names to their support level per renderer target.
 * Used for informational metadata in v1; not consumed by validators yet.
 */
export type RendererCapabilityMatrix = Record<string, RendererSupportLevel>;

// ---------------------------------------------------------------------------
// Style definition
// ---------------------------------------------------------------------------

export type StyleDefinition = {
  id: string;
  version: string;
  name: string;
  description: string;
  /**
   * CSS theme name compatible with this style's visual identity.
   * Used by assembleDeck() as a fallback when deckDesign doesn't specify theme.
   */
  recommendedTheme: string;
  tokens: DesignTokens;
  layoutPatterns: LayoutPattern[];
  stageGuidance: StageGuidance;
  qualityRules: QualityRule[];
  /** Informational: feature support across render targets. */
  rendererCapabilities: RendererCapabilityMatrix;
  /** Informational: role docs associated with this style. */
  roleDocRefs: RoleDocRef[];
};

// ---------------------------------------------------------------------------
// Work-order guidance
// ---------------------------------------------------------------------------

export type WorkOrderGuidance = {
  styleId: string;
  stage: 'outline' | 'deck-plan' | 'slide-dsl';
  structured: StageGuidance;
  roleDocs: Array<{
    path: string;
    sections: string[];
    digest: string;
  }>;
  checklist: string[];
};

// ---------------------------------------------------------------------------
// Deck design (structured deck-plan IR)
// ---------------------------------------------------------------------------

export type LockedTokens = {
  titleBandHeight: number;
  margins: { top: number; right: number; bottom: number; left: number };
  spacing: { element: number; section: number };
};

export type ApprovedAsset = {
  id: string;
  kind: string;
  sourcePath: string;
  caption?: string;
};

export type DeckDesign = {
  styleId: string;
  theme: string;
  canvas: { width: number; height: number };
  palette: PaletteTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  typographyScaleId: string;
  paletteId: string;
  lockedTokens: LockedTokens;
};

// ---------------------------------------------------------------------------
// Slide design (per-slide structured field in deck plan)
// ---------------------------------------------------------------------------

export type SlideDesign = {
  slideType: SlideType;
  /** References a LayoutPattern.id in the active style definition. */
  layoutPatternId: string;
  visualizationIntent?: { type: string; rationale: string };
  density: 'low' | 'medium' | 'high';
};

// ---------------------------------------------------------------------------
// Consistency check results
// ---------------------------------------------------------------------------

export type ConsistencyCheckResult = {
  /** The design dimension being checked (e.g. 'title-band-y', 'margin-left'). */
  dimension: string;
  expected: number | string;
  actual: number | string;
  pass: boolean;
  slideId?: string;
};
