/**
 * Maliang Deck DSL Zod Schemas
 *
 * Runtime validation schemas matching the TypeScript types.
 * Used for: AI output validation, CLI input validation, JSON Schema generation.
 */
import { z } from 'zod';
// ─── Canvas & Meta ───────────────────────────────────────────────────────────
export const CanvasSizeSchema = z.object({
    width: z.number().positive(),
    height: z.number().positive(),
});
export const HtmlRuntimeTransitionSchema = z.object({
    type: z.enum(['none', 'fade', 'slide', 'dissolve', 'zoom', 'push', 'cover']).optional(),
    durationMs: z.number().nonnegative().optional(),
    easing: z.string().min(1).optional(),
    autoAnimate: z.boolean().optional(),
    unmatched: z.enum(['fade', 'instant']).optional(),
});
export const HtmlRuntimeConfigSchema = z.object({
    transition: HtmlRuntimeTransitionSchema.optional(),
    showProgressBar: z.boolean().optional(),
    showSlideNumber: z.boolean().optional(),
});
export const DeckMetaSchema = z.object({
    title: z.string().min(1),
    theme: z.string().optional(),
    canvas: CanvasSizeSchema,
    defaultFont: z.string().min(1).optional(),
    fonts: z.record(z.string(), z.string()).optional(),
    htmlRuntime: HtmlRuntimeConfigSchema.optional(),
});
// ─── Animation (HTML-only, ignored in SVG export) ───────────────────────────
export const AnimationSchema = z.object({
    enter: z.string().optional(),
    duration: z.number().positive().optional(),
    delay: z.number().nonnegative().optional(),
    easing: z.string().optional(),
    step: z.number().int().nonnegative().optional(),
});
// ─── Layout placement/config (pixel-only deterministic Phase 1) ─────────────
const finiteNumber = z.number().finite();
const positiveNumber = finiteNumber.positive();
const nonnegativeNumber = finiteNumber.nonnegative();
const nonnegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();
export const BoxPaddingSchema = z.union([
    nonnegativeNumber,
    z.object({
        top: nonnegativeNumber.optional(),
        right: nonnegativeNumber.optional(),
        bottom: nonnegativeNumber.optional(),
        left: nonnegativeNumber.optional(),
    }),
]);
export const LayoutPlacementSchema = z.object({
    mode: z.enum(['flow', 'absolute']).optional(),
    column: nonnegativeInteger.optional(),
    row: nonnegativeInteger.optional(),
    columnSpan: positiveInteger.optional(),
    rowSpan: positiveInteger.optional(),
    basis: positiveNumber.optional(),
    x: finiteNumber.optional(),
    y: finiteNumber.optional(),
}).superRefine((placement, ctx) => {
    if (placement.mode !== 'absolute' && (placement.x != null || placement.y != null)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'placement x/y are only valid when mode is "absolute"' });
    }
});
const GapSchema = z.union([
    nonnegativeNumber,
    z.object({ row: nonnegativeNumber.optional(), column: nonnegativeNumber.optional() }),
]);
export const GridLayoutConfigSchema = z.object({
    mode: z.literal('grid'),
    columns: z.array(positiveNumber).min(1),
    rows: z.array(positiveNumber).min(1).optional(),
    gap: GapSchema.optional(),
    padding: BoxPaddingSchema.optional(),
    alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    justifyItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});
export const FlexLayoutConfigSchema = z.object({
    mode: z.literal('flex'),
    direction: z.enum(['row', 'column']).optional(),
    wrap: z.boolean().optional(),
    gap: nonnegativeNumber.optional(),
    padding: BoxPaddingSchema.optional(),
    alignItems: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    justifyContent: z.enum(['start', 'center', 'end', 'space-between']).optional(),
});
export const LayoutConfigSchema = z.discriminatedUnion('mode', [
    GridLayoutConfigSchema,
    FlexLayoutConfigSchema,
]);
// ─── Continuous Animation ────────────────────────────────────────────────────
export const ContinuousAnimationSchema = z.object({
    duration: z.number().positive(),
    delay: z.number().nonnegative().optional(),
    loop: z.union([z.boolean(), z.number().int().positive()]).optional(),
    trigger: z.enum(['auto', 'step', 'visible']).optional(),
    step: z.number().int().nonnegative().optional(),
});
// ─── Base Element ────────────────────────────────────────────────────────────
const BaseElementSchema = z.object({
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    rotation: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
    animation: AnimationSchema.optional(),
    continuousAnimation: ContinuousAnimationSchema.optional(),
    placement: LayoutPlacementSchema.optional(),
});
// ─── Text ────────────────────────────────────────────────────────────────────
export const TextElementSchema = BaseElementSchema.extend({
    type: z.literal('text'),
    content: z.string(),
    width: z.number().positive(),
    fontSize: z.number().positive(),
    fontFamily: z.string().optional(),
    fontWeight: z.enum(['normal', 'bold']).optional(),
    fontStyle: z.enum(['normal', 'italic']).optional(),
    textDecoration: z.enum(['none', 'underline']).optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
    lineHeight: z.number().positive().optional(),
    textRole: z.enum(['body', 'label', 'heading', 'stat']).optional(),
});
// ─── Rect ────────────────────────────────────────────────────────────────────
export const RectElementSchema = BaseElementSchema.extend({
    type: z.literal('rect'),
    width: z.number().positive(),
    height: z.number().positive(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
    radius: z.number().nonnegative().optional(),
});
// ─── Circle ──────────────────────────────────────────────────────────────────
export const CircleElementSchema = BaseElementSchema.extend({
    type: z.literal('circle'),
    radius: z.number().positive(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
});
// ─── Ellipse ─────────────────────────────────────────────────────────────────
export const EllipseElementSchema = BaseElementSchema.extend({
    type: z.literal('ellipse'),
    width: z.number().positive(),
    height: z.number().positive(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
});
// ─── Line ────────────────────────────────────────────────────────────────────
export const LineElementSchema = BaseElementSchema.extend({
    type: z.literal('line'),
    x2: z.number(),
    y2: z.number(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
    strokeDasharray: z.string().optional(),
});
// ─── Path ────────────────────────────────────────────────────────────────────
export const PathElementSchema = BaseElementSchema.extend({
    type: z.literal('path'),
    d: z.string().min(1),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
});
// ─── Polygon ─────────────────────────────────────────────────────────────────
export const PolygonElementSchema = BaseElementSchema.extend({
    type: z.literal('polygon'),
    points: z.string().min(1),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().nonnegative().optional(),
});
// ─── Image ───────────────────────────────────────────────────────────────────
export const ImageElementSchema = BaseElementSchema.extend({
    type: z.literal('image'),
    src: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    fit: z.enum(['cover', 'contain', 'fill', 'none']).optional(),
});
// ─── Chart ──────────────────────────────────────────────────────────────────
const HexColorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color (#rgb or #rrggbb)');
export const ChartStyleSchema = z.object({
    palette: z.array(HexColorSchema).min(1).max(12).optional(),
    axisColor: HexColorSchema.optional(),
    gridColor: HexColorSchema.optional(),
    labelColor: HexColorSchema.optional(),
    backgroundColor: HexColorSchema.optional(),
    strokeWidth: z.number().nonnegative().optional(),
    showLegend: z.boolean().optional(),
    showDataLabels: z.boolean().optional(),
    legendPosition: z.enum(['top', 'bottom', 'right']).optional(),
    gridLines: z.boolean().optional(),
    rounded: z.boolean().optional(),
    areaFill: z.boolean().optional(),
}).strict();
export const TableStyleSchema = z.object({
    headerBackground: HexColorSchema.optional(),
    headerColor: HexColorSchema.optional(),
    rowStripe: z.boolean().optional(),
    stripeColor: HexColorSchema.optional(),
    borderColor: HexColorSchema.optional(),
    borderWidth: z.number().nonnegative().optional(),
    cellPadding: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontFamily: z.string().optional(),
    rounded: z.boolean().optional(),
}).strict();
export const ChartTypeSchema = z.enum(['bar', 'line', 'pie', 'doughnut']);
export const ChartSeriesSchema = z
    .object({
    name: z.string().optional(),
    labels: z.array(z.union([z.string(), z.number()])).min(1),
    values: z.array(z.number()).min(1),
})
    .superRefine((series, ctx) => {
    if (series.labels.length !== series.values.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['values'],
            message: 'Chart series values length must match labels length',
        });
    }
});
export const ChartElementSchema = BaseElementSchema.extend({
    type: z.literal('chart'),
    width: z.number().positive(),
    height: z.number().positive(),
    chartType: ChartTypeSchema,
    data: z.array(ChartSeriesSchema).min(1),
    options: z.record(z.unknown()).optional(),
    style: ChartStyleSchema.optional(),
});
// ─── Table ──────────────────────────────────────────────────────────────────
export const TableCellSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.object({
        text: z.string(),
        options: z.record(z.unknown()).optional(),
    }),
]);
export const TableElementSchema = BaseElementSchema.extend({
    type: z.literal('table'),
    width: z.number().positive(),
    height: z.number().positive().optional(),
    rows: z.array(z.array(TableCellSchema).min(1)).min(1),
    options: z.record(z.unknown()).optional(),
    style: TableStyleSchema.optional(),
});
// ─── Custom HTML ─────────────────────────────────────────────────────────────
export const CustomHtmlElementSchema = BaseElementSchema.extend({
    type: z.literal('customHtml'),
    width: z.number().positive(),
    height: z.number().positive(),
    html: z.string().min(1),
    fallbackImage: z.string().optional(),
});
// ─── Group (supports recursive nesting) ─────────────────────────────────────
export const GroupElementSchema = BaseElementSchema.extend({
    type: z.literal('group'),
    elements: z.lazy(() => ElementSchema).array(),
    transform: z.string().optional(),
});
// ─── Layout (recursive grid/flex container) ─────────────────────────────────
const LayoutElementBaseSchema = BaseElementSchema.extend({
    type: z.literal('layout'),
    width: positiveNumber,
    height: positiveNumber,
    layout: LayoutConfigSchema,
    elements: z.lazy(() => ElementSchema).array(),
    overflow: z.enum(['clip', 'visible', 'warn']).optional(),
});
function addGridPlacementIssues(layoutElement, ctx, path = []) {
    if (layoutElement.layout.mode !== 'grid')
        return;
    const columns = layoutElement.layout.columns;
    const rows = layoutElement.layout.rows;
    const occupied = new Set();
    layoutElement.elements.forEach((element, index) => {
        const placement = element.placement;
        if (!placement || placement.mode === 'absolute')
            return;
        const column = placement.column;
        const row = placement.row;
        const columnSpan = placement.columnSpan ?? 1;
        const rowSpan = placement.rowSpan ?? 1;
        if (column != null && column + columnSpan > columns.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [...path, 'elements', index, 'placement', 'columnSpan'],
                message: 'Grid placement exceeds configured columns',
            });
        }
        if (rows && row != null && row + rowSpan > rows.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [...path, 'elements', index, 'placement', 'rowSpan'],
                message: 'Grid placement exceeds configured rows',
            });
        }
        if (column == null || row == null)
            return;
        for (let r = row; r < row + rowSpan; r += 1) {
            for (let c = column; c < column + columnSpan; c += 1) {
                const key = `${r}:${c}`;
                if (occupied.has(key)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [...path, 'elements', index, 'placement'],
                        message: 'Grid placement overlaps another explicitly placed element',
                    });
                    return;
                }
                occupied.add(key);
            }
        }
    });
}
export const LayoutElementSchema = LayoutElementBaseSchema.superRefine((layoutElement, ctx) => {
    addGridPlacementIssues(layoutElement, ctx);
});
// ─── Animated Text ──────────────────────────────────────────────────────────
export const TextAnimEffectSchema = z.object({
    name: z.enum([
        'stagger', 'wave', 'cascade', 'scramble', 'decode',
        'typewriter', 'fade-chars', 'bounce-chars', 'rotate-chars',
        'scale-chars', 'blur-reveal', 'glitch',
    ]),
    splitMode: z.enum(['char', 'word', 'line']).optional(),
    stagger: z.number().optional(),
    direction: z.enum(['forward', 'backward', 'center', 'edges', 'random']).optional(),
    easing: z.string().optional(),
    duration: z.number().positive().optional(),
});
export const TextPathSchema = z.object({
    d: z.string().min(1),
    align: z.enum(['start', 'center', 'end']).optional(),
    offset: z.number().min(0).max(1).optional(),
    animate: z.boolean().optional(),
    animateDuration: z.number().positive().optional(),
});
export const AnimatedTextElementSchema = BaseElementSchema.extend({
    type: z.literal('animatedText'),
    content: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive().optional(),
    fontSize: z.number().positive(),
    fontFamily: z.string().optional(),
    fontWeight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']).optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    lineHeight: z.number().positive().optional(),
    textAnimation: z.union([TextAnimEffectSchema, z.array(TextAnimEffectSchema).min(1)]),
    path: TextPathSchema.optional(),
    morphTo: z.string().optional(),
    morphDuration: z.number().positive().optional(),
});
// ─── Formula ────────────────────────────────────────────────────────────────
export const FormulaHighlightSchema = z.object({
    symbol: z.string().min(1),
    color: z.string().optional(),
});
export const FormulaMorphMapSchema = z.union([
    z.record(z.string(), z.number().int().nonnegative()),
    z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])),
    z.array(z.object({
        source: z.number().int().nonnegative(),
        target: z.number().int().nonnegative(),
    })),
]);
export const FormulaStepSchema = z.object({
    latex: z.string().min(1),
    annotation: z.string().optional(),
    highlight: z.array(FormulaHighlightSchema).optional(),
    duration: z.number().positive().optional(),
    morphMap: FormulaMorphMapSchema.optional(),
});
export const FormulaElementSchema = BaseElementSchema.extend({
    type: z.literal('formula'),
    width: z.number().positive(),
    height: z.number().positive().optional(),
    latex: z.string().min(1),
    displayMode: z.boolean().optional(),
    fontSize: z.number().positive().optional(),
    color: z.string().optional(),
    steps: z.array(FormulaStepSchema).optional(),
    morphEasing: z.string().optional(),
    morphDuration: z.number().positive().optional(),
    morphMap: FormulaMorphMapSchema.optional(),
    stepTrigger: z.enum(['auto', 'click']).optional(),
});
// ─── Graph ──────────────────────────────────────────────────────────────────
export const GraphFunctionSchema = z.object({
    expr: z.string().min(1).max(500),
    color: z.string().optional(),
    strokeWidth: z.number().positive().optional(),
    domain: z.tuple([z.number(), z.number()]).optional(),
    animate: z.enum(['draw-on', 'fade', 'none']).optional(),
    animateDuration: z.number().positive().optional(),
    label: z.string().optional(),
});
export const GraphAnnotationSchema = z.object({
    type: z.enum(['point', 'tangent', 'area', 'vertical-line']),
    at: z.number().optional(),
    color: z.string().optional(),
    label: z.string().optional(),
    animate: z.boolean().optional(),
});
export const GraphAxesSchema = z.object({
    x: z.tuple([z.number(), z.number()]),
    y: z.tuple([z.number(), z.number()]),
    grid: z.boolean().optional(),
    labels: z.boolean().optional(),
    tickInterval: z.number().positive().optional(),
});
export const GraphParameterSchema = z.object({
    name: z.string().min(1),
    range: z.tuple([z.number(), z.number()]),
    animate: z.boolean().optional(),
    duration: z.number().positive().optional(),
});
export const Graph3dCameraSchema = z.object({
    distance: z.number().positive().optional(),
    phi: z.number().optional(), // polar angle (0 = top, PI = bottom)
    theta: z.number().optional(), // azimuthal angle
    fov: z.number().positive().optional(),
    orbit: z.boolean().optional(), // auto-orbit animation
    orbitSpeed: z.number().optional(),
});
export const Graph3dSurfaceSchema = z.object({
    expr: z.string().min(1).max(500), // f(x, y) expression
    colorMap: z.enum(['viridis', 'plasma', 'inferno', 'coolwarm', 'rainbow', 'monochrome']).optional(),
    wireframe: z.boolean().optional(),
    opacity: z.number().min(0).max(1).optional(),
    resolution: z.number().int().min(10).max(200).optional(),
});
export const GraphElementSchema = BaseElementSchema.extend({
    type: z.literal('graph'),
    width: z.number().positive(),
    height: z.number().positive(),
    functions: z.array(GraphFunctionSchema).min(1).max(10),
    axes: GraphAxesSchema,
    parameter: GraphParameterSchema.optional(),
    annotations: z.array(GraphAnnotationSchema).max(20).optional(),
    // 3D mode (optional — when present, renders as WebGL surface)
    mode: z.enum(['2d', '3d']).optional(),
    surface: Graph3dSurfaceSchema.optional(),
    zAxis: z.tuple([z.number(), z.number()]).optional(),
    camera: Graph3dCameraSchema.optional(),
});
// ─── Full element union ──────────────────────────────────────────────────────
export const ElementSchema = z.discriminatedUnion('type', [
    TextElementSchema,
    RectElementSchema,
    CircleElementSchema,
    EllipseElementSchema,
    LineElementSchema,
    PathElementSchema,
    PolygonElementSchema,
    ImageElementSchema,
    ChartElementSchema,
    TableElementSchema,
    CustomHtmlElementSchema,
    GroupElementSchema,
    LayoutElementBaseSchema,
    AnimatedTextElementSchema,
    FormulaElementSchema,
    GraphElementSchema,
]);
// ─── Slide ───────────────────────────────────────────────────────────────────
export const SlideSchema = z.object({
    id: z.string().min(1),
    background: z.string().optional(),
    layout: z.string().optional(),
    elements: ElementSchema.array(),
    notes: z.string().optional(),
    fx: z.array(z.string()).optional(),
});
// ─── Deck ────────────────────────────────────────────────────────────────────
function addNestedLayoutIssues(elements, ctx, path) {
    elements.forEach((element, index) => {
        const elementPath = [...path, index];
        if (element.type === 'layout') {
            addGridPlacementIssues(element, ctx, elementPath);
            addNestedLayoutIssues(element.elements, ctx, [...elementPath, 'elements']);
        }
        if (element.type === 'group') {
            addNestedLayoutIssues(element.elements, ctx, [...elementPath, 'elements']);
        }
    });
}
export const DeckSchema = z.object({
    meta: DeckMetaSchema,
    slides: SlideSchema.array().min(1),
}).superRefine((deck, ctx) => {
    deck.slides.forEach((slide, slideIndex) => {
        addNestedLayoutIssues(slide.elements, ctx, ['slides', slideIndex, 'elements']);
    });
});
export function validateDeck(input) {
    const result = DeckSchema.safeParse(input);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
        })),
    };
}
//# sourceMappingURL=schema.js.map