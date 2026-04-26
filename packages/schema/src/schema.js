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
    type: z.enum(['none', 'fade', 'slide']).optional(),
    durationMs: z.number().nonnegative().optional(),
    easing: z.string().min(1).optional(),
    autoAnimate: z.boolean().optional(),
    unmatched: z.enum(['fade', 'instant']).optional(),
});
export const HtmlRuntimeConfigSchema = z.object({
    transition: HtmlRuntimeTransitionSchema.optional(),
});
export const DeckMetaSchema = z.object({
    title: z.string().min(1),
    theme: z.string().optional(),
    canvas: CanvasSizeSchema,
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
    GroupElementSchema,
    LayoutElementBaseSchema,
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