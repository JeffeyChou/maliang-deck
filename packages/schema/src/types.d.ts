/**
 * Maliang Deck DSL Type Definitions
 *
 * JSON scene graph types for the slide presentation DSL.
 * All element types that ppt-master's svg_to_pptx can convert to native DrawingML.
 */
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
export interface Deck {
    meta: DeckMeta;
    slides: Slide[];
}
export interface DeckMeta {
    title: string;
    theme?: string;
    canvas: CanvasSize;
    fonts?: Record<string, string>;
    /** HTML-only runtime options. Static SVG/PDF/PPTX exporters ignore this field. */
    htmlRuntime?: HtmlRuntimeConfig;
}
export interface HtmlRuntimeConfig {
    transition?: HtmlRuntimeTransitionConfig;
}
export type HtmlRuntimeTransitionType = 'none' | 'fade' | 'slide';
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
export interface Slide {
    id: string;
    background?: string;
    layout?: string;
    elements: Element[];
    notes?: string;
    fx?: string[];
}
export type LayoutMode = 'grid' | 'flex';
export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch';
export type LayoutJustify = 'start' | 'center' | 'end' | 'space-between';
export type BoxPadding = number | {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
};
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
    gap?: number | {
        row?: number;
        column?: number;
    };
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
export type Element = TextElement | RectElement | CircleElement | EllipseElement | LineElement | PathElement | PolygonElement | ImageElement | ChartElement | TableElement | GroupElement | LayoutElement;
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
    /** Interpreted only by a parent layout container. */
    placement?: LayoutChildPlacement;
}
export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    width: number;
    fontSize: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    color?: string;
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    lineHeight?: number;
    textRole?: 'body' | 'label' | 'heading' | 'stat';
}
export interface RectElement extends BaseElement {
    type: 'rect';
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
}
export interface CircleElement extends BaseElement {
    type: 'circle';
    radius: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
export interface EllipseElement extends BaseElement {
    type: 'ellipse';
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
export interface LineElement extends BaseElement {
    type: 'line';
    x2: number;
    y2: number;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
}
export interface PathElement extends BaseElement {
    type: 'path';
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
export interface PolygonElement extends BaseElement {
    type: 'polygon';
    points: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
export interface ImageElement extends BaseElement {
    type: 'image';
    src: string;
    width: number;
    height: number;
    fit?: 'cover' | 'contain' | 'fill' | 'none';
}
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
}
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
}
export interface GroupElement extends BaseElement {
    type: 'group';
    elements: Element[];
    transform?: string;
}
export interface LayoutElement extends BaseElement {
    type: 'layout';
    width: number;
    height: number;
    layout: LayoutConfig;
    elements: Element[];
    overflow?: LayoutOverflow;
}
export interface Animation {
    enter?: string;
    duration?: number;
    delay?: number;
    easing?: string;
    step?: number;
}
//# sourceMappingURL=types.d.ts.map