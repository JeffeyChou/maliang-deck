/**
 * Maliang Deck DSL Type Definitions
 *
 * JSON scene graph types for the slide presentation DSL.
 * All element types that ppt-master's svg_to_pptx can convert to native DrawingML.
 */

// ─── Diagnostics ─────────────────────────────────────────────────────────────

export type DiagnosticSeverity = 'info' | 'warning' | 'error';
export type DiagnosticPhase = 'schema' | 'compile' | 'render-html' | 'render-svg' | 'export-pdf' | 'export-pptx';
export type DiagnosticPolicy = 'native' | 'ignore' | 'placeholder' | 'rasterize' | 'fail';
export type DiagnosticFormat = 'html' | 'svg' | 'pdf' | 'pptx';

export interface MaliangDeckDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  phase: DiagnosticPhase;
  message: string;
  path: string;
  elementId?: string;
  slideIndex?: number;
  format?: DiagnosticFormat;
  policy?: DiagnosticPolicy;
  detail?: unknown;
}

// ─── Deck ────────────────────────────────────────────────────────────────────

export interface Deck {
  meta: DeckMeta;
  slides: Slide[];
}

export interface DeckMeta {
  title: string;
  theme?: string;
  canvas: CanvasSize;
  /** Default font family for text elements that omit fontFamily. Renderers and
   *  text-measure fall back to this value before using the generic 'sans-serif'. */
  defaultFont?: string;
  fonts?: Record<string, string>;
  /** HTML-only runtime options. Static SVG/PDF/PPTX exporters ignore this field. */
  htmlRuntime?: HtmlRuntimeConfig;
}

export interface HtmlRuntimeConfig {
  transition?: HtmlRuntimeTransitionConfig;
  /** Show progress bar at the bottom. Default: true. */
  showProgressBar?: boolean;
  /** Show slide number indicator. Default: true. */
  showSlideNumber?: boolean;
}

export type HtmlRuntimeTransitionType = 'none' | 'fade' | 'slide' | 'dissolve' | 'zoom' | 'push' | 'cover';
export type HtmlRuntimeUnmatchedBehavior = 'fade' | 'instant';

export interface HtmlRuntimeTransitionConfig {
  type?: HtmlRuntimeTransitionType;
  durationMs?: number;
  easing?: string;
  autoAnimate?: boolean;
  unmatched?: HtmlRuntimeUnmatchedBehavior;
}

export interface CanvasSize {
  width: number;
  height: number;
}

// ─── Slide ───────────────────────────────────────────────────────────────────

export interface Slide {
  id: string;
  background?: string;
  layout?: string;
  elements: Element[];
  notes?: string;
  fx?: string[];
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export type LayoutMode = 'grid' | 'flex';
export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch';
export type LayoutJustify = 'start' | 'center' | 'end' | 'space-between';
export type BoxPadding = number | { top?: number; right?: number; bottom?: number; left?: number };
export type GridTrack = number;

export interface GridPlacement {
  mode?: 'flow' | 'absolute';
  column?: number;
  row?: number;
  columnSpan?: number;
  rowSpan?: number;
  x?: number;
  y?: number;
}

export interface GridLayoutConfig {
  mode: 'grid';
  columns: GridTrack[];
  rows?: GridTrack[];
  gap?: number | { row?: number; column?: number };
  padding?: BoxPadding;
  alignItems?: LayoutAlign;
  justifyItems?: LayoutAlign;
}

export interface FlexPlacement {
  mode?: 'flow' | 'absolute';
  basis?: number;
  x?: number;
  y?: number;
}

export interface FlexLayoutConfig {
  mode: 'flex';
  direction?: 'row' | 'column';
  wrap?: boolean;
  gap?: number;
  padding?: BoxPadding;
  alignItems?: LayoutAlign;
  justifyContent?: LayoutJustify;
}

export type LayoutChildPlacement = GridPlacement | FlexPlacement;
export type LayoutConfig = GridLayoutConfig | FlexLayoutConfig;
export type LayoutOverflow = 'clip' | 'visible' | 'warn';

// ─── Elements ────────────────────────────────────────────────────────────────

export type Element =
  | TextElement
  | RectElement
  | CircleElement
  | EllipseElement
  | LineElement
  | PathElement
  | PolygonElement
  | ImageElement
  | ChartElement
  | TableElement
  | CustomHtmlElement
  | GroupElement
  | LayoutElement
  | AnimatedTextElement
  | FormulaElement
  | GraphElement;

export interface BaseElement {
  type: string;
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  animation?: Animation;
  /** Continuous animation control (duration-based playback, separate from step-reveal). */
  continuousAnimation?: ContinuousAnimation;
  /** Interpreted only by a parent layout container. */
  placement?: LayoutChildPlacement;
}

// ─── Text ────────────────────────────────────────────────────────────────────

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  width: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  color?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  textRole?: 'body' | 'label' | 'heading' | 'stat';
}

// ─── Rect ────────────────────────────────────────────────────────────────────

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

// ─── Circle ──────────────────────────────────────────────────────────────────

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// ─── Ellipse ─────────────────────────────────────────────────────────────────

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// ─── Line ────────────────────────────────────────────────────────────────────

export interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

// ─── Path ────────────────────────────────────────────────────────────────────

export interface PathElement extends BaseElement {
  type: 'path';
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// ─── Polygon ─────────────────────────────────────────────────────────────────

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  points: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// ─── Image ───────────────────────────────────────────────────────────────────

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
}

// ─── Chart ──────────────────────────────────────────────────────────────────

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export interface ChartSeries {
  name?: string;
  labels: Array<string | number>;
  values: number[];
}

export interface ChartElement extends BaseElement {
  type: 'chart';
  width: number;
  height: number;
  chartType: ChartType;
  data: ChartSeries[];
  options?: Record<string, unknown>;
  style?: ChartStyle;
}

// ─── Chart Style ──────────────────────────────────────────────────────────

/** Hex color string (#rrggbb or #rgb). CSS vars and named colors are NOT valid
 *  here — they would not survive SVG/PDF/PPTX export. Use theme CSS vars by
 *  omitting the field entirely (HTML renderer reads vars automatically). */
export type HexColor = string;

export interface ChartStyle {
  palette?: HexColor[];
  axisColor?: HexColor;
  gridColor?: HexColor;
  labelColor?: HexColor;
  backgroundColor?: HexColor;
  strokeWidth?: number;
  showLegend?: boolean;
  showDataLabels?: boolean;
  legendPosition?: 'top' | 'bottom' | 'right';
  gridLines?: boolean;
  rounded?: boolean;
  areaFill?: boolean;
}

// ─── Table ──────────────────────────────────────────────────────────────────

export type TablePrimitiveCell = string | number | boolean | null;

export interface TableObjectCell {
  text: string;
  options?: Record<string, unknown>;
}

export type TableCell = TablePrimitiveCell | TableObjectCell;

export interface TableElement extends BaseElement {
  type: 'table';
  width: number;
  height?: number;
  rows: TableCell[][];
  options?: Record<string, unknown>;
  style?: TableStyle;
}

// ─── Table Style ──────────────────────────────────────────────────────────

export interface TableStyle {
  headerBackground?: HexColor;
  headerColor?: HexColor;
  rowStripe?: boolean;
  stripeColor?: HexColor;
  borderColor?: HexColor;
  borderWidth?: number;
  cellPadding?: string;
  fontSize?: number;
  fontFamily?: string;
  rounded?: boolean;
}

// ─── Custom HTML ────────────────────────────────────────────────────────────

export interface CustomHtmlElement extends BaseElement {
  type: 'customHtml';
  width: number;
  height: number;
  html: string;
  /** Fallback image for non-HTML renderers (data URI or relative path). */
  fallbackImage?: string;
}

// ─── Group ───────────────────────────────────────────────────────────────────

export interface GroupElement extends BaseElement {
  type: 'group';
  elements: Element[];
  transform?: string;
}

// ─── Layout container ────────────────────────────────────────────────────────

export interface LayoutElement extends BaseElement {
  type: 'layout';
  width: number;
  height: number;
  layout: LayoutConfig;
  elements: Element[];
  overflow?: LayoutOverflow;
}

// ─── Animation (HTML-only, ignored in SVG export) ────────────────────────────

export interface Animation {
  enter?: string;
  // exit?: string; // Deferred — trigger behavior undefined (future phase)
  duration?: number;
  delay?: number;
  easing?: string;
  step?: number;
}

// ─── Continuous Animation ───────────────────────────────────────────────────

export interface ContinuousAnimation {
  duration: number;
  delay?: number;
  loop?: boolean | number;
  trigger?: 'auto' | 'step' | 'visible';
  step?: number;
}

// ─── Animated Text ──────────────────────────────────────────────────────────

export type TextAnimEffectName =
  | 'stagger' | 'wave' | 'cascade' | 'scramble' | 'decode'
  | 'typewriter' | 'fade-chars' | 'bounce-chars' | 'rotate-chars'
  | 'scale-chars' | 'blur-reveal' | 'glitch';

export type TextAnimSplitMode = 'char' | 'word' | 'line';
export type TextAnimDirection = 'forward' | 'backward' | 'center' | 'edges' | 'random';

export interface TextAnimEffect {
  name: TextAnimEffectName;
  splitMode?: TextAnimSplitMode;
  stagger?: number;
  direction?: TextAnimDirection;
  easing?: string;
  duration?: number;
}

export interface TextPath {
  d: string;
  align?: 'start' | 'center' | 'end';
  offset?: number;
  animate?: boolean;
  animateDuration?: number;
}

export interface AnimatedTextElement extends BaseElement {
  type: 'animatedText';
  content: string;
  width: number;
  height?: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  textAnimation: TextAnimEffect | TextAnimEffect[];
  path?: TextPath;
  morphTo?: string;
  morphDuration?: number;
}

// ─── Formula ────────────────────────────────────────────────────────────────

export interface FormulaHighlight {
  symbol: string;
  color?: string;
}

export interface FormulaStep {
  latex: string;
  annotation?: string;
  highlight?: FormulaHighlight[];
  duration?: number;
  morphMap?: Record<string, number> | Array<[number, number]> | Array<{ source: number; target: number }>;
}

export interface FormulaElement extends BaseElement {
  type: 'formula';
  width: number;
  height?: number;
  latex: string;
  displayMode?: boolean;
  fontSize?: number;
  color?: string;
  steps?: FormulaStep[];
  morphEasing?: string;
  morphDuration?: number;
  morphMap?: Record<string, number> | Array<[number, number]> | Array<{ source: number; target: number }>;
  stepTrigger?: 'auto' | 'click';
}

// ─── Graph ──────────────────────────────────────────────────────────────────

export type GraphAnimateType = 'draw-on' | 'fade' | 'none';
export type GraphAnnotationType = 'point' | 'tangent' | 'area' | 'vertical-line';

export interface GraphFunction {
  expr: string;
  color?: string;
  strokeWidth?: number;
  domain?: [number, number];
  animate?: GraphAnimateType;
  animateDuration?: number;
  label?: string;
}

export interface GraphParameter {
  name: string;
  range: [number, number];
  animate?: boolean;
  duration?: number;
}

export interface GraphAnnotation {
  type: GraphAnnotationType;
  at?: number;
  color?: string;
  label?: string;
  animate?: boolean;
}

export interface GraphAxes {
  x: [number, number];
  y: [number, number];
  grid?: boolean;
  labels?: boolean;
  tickInterval?: number;
}

export interface Graph3dCamera {
  distance?: number;
  phi?: number;
  theta?: number;
  fov?: number;
  orbit?: boolean;
  orbitSpeed?: number;
}

export type Graph3dColorMap = 'viridis' | 'plasma' | 'inferno' | 'coolwarm' | 'rainbow' | 'monochrome';

export interface Graph3dSurface {
  expr: string;
  colorMap?: Graph3dColorMap;
  wireframe?: boolean;
  opacity?: number;
  resolution?: number;
}

export interface GraphElement extends BaseElement {
  type: 'graph';
  width: number;
  height: number;
  functions: GraphFunction[];
  axes: GraphAxes;
  parameter?: GraphParameter;
  annotations?: GraphAnnotation[];
  mode?: '2d' | '3d';
  surface?: Graph3dSurface;
  zAxis?: [number, number];
  camera?: Graph3dCamera;
}
