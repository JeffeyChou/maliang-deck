/**
 * Maliang Deck DSL Zod Schemas
 *
 * Runtime validation schemas matching the TypeScript types.
 * Used for: AI output validation, CLI input validation, JSON Schema generation.
 */
import { z } from 'zod';
export declare const CanvasSizeSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
export declare const HtmlRuntimeTransitionSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide"]>>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    easing: z.ZodOptional<z.ZodString>;
    autoAnimate: z.ZodOptional<z.ZodBoolean>;
    unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "none" | "fade" | "slide" | undefined;
    durationMs?: number | undefined;
    easing?: string | undefined;
    autoAnimate?: boolean | undefined;
    unmatched?: "fade" | "instant" | undefined;
}, {
    type?: "none" | "fade" | "slide" | undefined;
    durationMs?: number | undefined;
    easing?: string | undefined;
    autoAnimate?: boolean | undefined;
    unmatched?: "fade" | "instant" | undefined;
}>;
export declare const HtmlRuntimeConfigSchema: z.ZodObject<{
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide"]>>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        autoAnimate: z.ZodOptional<z.ZodBoolean>;
        unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "none" | "fade" | "slide" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    }, {
        type?: "none" | "fade" | "slide" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    transition?: {
        type?: "none" | "fade" | "slide" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    } | undefined;
}, {
    transition?: {
        type?: "none" | "fade" | "slide" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    } | undefined;
}>;
export declare const DeckMetaSchema: z.ZodObject<{
    title: z.ZodString;
    theme: z.ZodOptional<z.ZodString>;
    canvas: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>;
    fonts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    htmlRuntime: z.ZodOptional<z.ZodObject<{
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide"]>>;
            durationMs: z.ZodOptional<z.ZodNumber>;
            easing: z.ZodOptional<z.ZodString>;
            autoAnimate: z.ZodOptional<z.ZodBoolean>;
            unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
        }, "strip", z.ZodTypeAny, {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        }, {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        transition?: {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
    }, {
        transition?: {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    canvas: {
        width: number;
        height: number;
    };
    theme?: string | undefined;
    fonts?: Record<string, string> | undefined;
    htmlRuntime?: {
        transition?: {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
    } | undefined;
}, {
    title: string;
    canvas: {
        width: number;
        height: number;
    };
    theme?: string | undefined;
    fonts?: Record<string, string> | undefined;
    htmlRuntime?: {
        transition?: {
            type?: "none" | "fade" | "slide" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
    } | undefined;
}>;
export declare const AnimationSchema: z.ZodObject<{
    enter: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    delay: z.ZodOptional<z.ZodNumber>;
    easing: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    easing?: string | undefined;
    duration?: number | undefined;
    enter?: string | undefined;
    delay?: number | undefined;
    step?: number | undefined;
}, {
    easing?: string | undefined;
    duration?: number | undefined;
    enter?: string | undefined;
    delay?: number | undefined;
    step?: number | undefined;
}>;
export declare const BoxPaddingSchema: z.ZodUnion<[z.ZodNumber, z.ZodObject<{
    top: z.ZodOptional<z.ZodNumber>;
    right: z.ZodOptional<z.ZodNumber>;
    bottom: z.ZodOptional<z.ZodNumber>;
    left: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    left?: number | undefined;
    right?: number | undefined;
    top?: number | undefined;
    bottom?: number | undefined;
}, {
    left?: number | undefined;
    right?: number | undefined;
    top?: number | undefined;
    bottom?: number | undefined;
}>]>;
export declare const LayoutPlacementSchema: z.ZodEffects<z.ZodObject<{
    mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
    column: z.ZodOptional<z.ZodNumber>;
    row: z.ZodOptional<z.ZodNumber>;
    columnSpan: z.ZodOptional<z.ZodNumber>;
    rowSpan: z.ZodOptional<z.ZodNumber>;
    basis: z.ZodOptional<z.ZodNumber>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mode?: "flow" | "absolute" | undefined;
    column?: number | undefined;
    row?: number | undefined;
    basis?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
}, {
    mode?: "flow" | "absolute" | undefined;
    column?: number | undefined;
    row?: number | undefined;
    basis?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
}>, {
    mode?: "flow" | "absolute" | undefined;
    column?: number | undefined;
    row?: number | undefined;
    basis?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
}, {
    mode?: "flow" | "absolute" | undefined;
    column?: number | undefined;
    row?: number | undefined;
    basis?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
}>;
export declare const GridLayoutConfigSchema: z.ZodObject<{
    mode: z.ZodLiteral<"grid">;
    columns: z.ZodArray<z.ZodNumber, "many">;
    rows: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    gap: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        row: z.ZodOptional<z.ZodNumber>;
        column: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        column?: number | undefined;
        row?: number | undefined;
    }, {
        column?: number | undefined;
        row?: number | undefined;
    }>]>>;
    padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        top: z.ZodOptional<z.ZodNumber>;
        right: z.ZodOptional<z.ZodNumber>;
        bottom: z.ZodOptional<z.ZodNumber>;
        left: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }>]>>;
    alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
    justifyItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "grid";
    columns: number[];
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | {
        column?: number | undefined;
        row?: number | undefined;
    } | undefined;
    rows?: number[] | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
}, {
    mode: "grid";
    columns: number[];
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | {
        column?: number | undefined;
        row?: number | undefined;
    } | undefined;
    rows?: number[] | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
}>;
export declare const FlexLayoutConfigSchema: z.ZodObject<{
    mode: z.ZodLiteral<"flex">;
    direction: z.ZodOptional<z.ZodEnum<["row", "column"]>>;
    wrap: z.ZodOptional<z.ZodBoolean>;
    gap: z.ZodOptional<z.ZodNumber>;
    padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        top: z.ZodOptional<z.ZodNumber>;
        right: z.ZodOptional<z.ZodNumber>;
        bottom: z.ZodOptional<z.ZodNumber>;
        left: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }>]>>;
    alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
    justifyContent: z.ZodOptional<z.ZodEnum<["start", "center", "end", "space-between"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "flex";
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    direction?: "column" | "row" | undefined;
    wrap?: boolean | undefined;
    justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
}, {
    mode: "flex";
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    direction?: "column" | "row" | undefined;
    wrap?: boolean | undefined;
    justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
}>;
export declare const LayoutConfigSchema: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
    mode: z.ZodLiteral<"grid">;
    columns: z.ZodArray<z.ZodNumber, "many">;
    rows: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    gap: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        row: z.ZodOptional<z.ZodNumber>;
        column: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        column?: number | undefined;
        row?: number | undefined;
    }, {
        column?: number | undefined;
        row?: number | undefined;
    }>]>>;
    padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        top: z.ZodOptional<z.ZodNumber>;
        right: z.ZodOptional<z.ZodNumber>;
        bottom: z.ZodOptional<z.ZodNumber>;
        left: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }>]>>;
    alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
    justifyItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "grid";
    columns: number[];
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | {
        column?: number | undefined;
        row?: number | undefined;
    } | undefined;
    rows?: number[] | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
}, {
    mode: "grid";
    columns: number[];
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | {
        column?: number | undefined;
        row?: number | undefined;
    } | undefined;
    rows?: number[] | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
}>, z.ZodObject<{
    mode: z.ZodLiteral<"flex">;
    direction: z.ZodOptional<z.ZodEnum<["row", "column"]>>;
    wrap: z.ZodOptional<z.ZodBoolean>;
    gap: z.ZodOptional<z.ZodNumber>;
    padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        top: z.ZodOptional<z.ZodNumber>;
        right: z.ZodOptional<z.ZodNumber>;
        bottom: z.ZodOptional<z.ZodNumber>;
        left: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }, {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    }>]>>;
    alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
    justifyContent: z.ZodOptional<z.ZodEnum<["start", "center", "end", "space-between"]>>;
}, "strip", z.ZodTypeAny, {
    mode: "flex";
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    direction?: "column" | "row" | undefined;
    wrap?: boolean | undefined;
    justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
}, {
    mode: "flex";
    padding?: number | {
        left?: number | undefined;
        right?: number | undefined;
        top?: number | undefined;
        bottom?: number | undefined;
    } | undefined;
    gap?: number | undefined;
    alignItems?: "start" | "center" | "end" | "stretch" | undefined;
    direction?: "column" | "row" | undefined;
    wrap?: boolean | undefined;
    justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
}>]>;
export declare const TextElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    content: z.ZodString;
    width: z.ZodNumber;
    fontSize: z.ZodNumber;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontWeight: z.ZodOptional<z.ZodEnum<["normal", "bold"]>>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    color: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    verticalAlign: z.ZodOptional<z.ZodEnum<["top", "middle", "bottom"]>>;
    lineHeight: z.ZodOptional<z.ZodNumber>;
    textRole: z.ZodOptional<z.ZodEnum<["body", "label", "heading", "stat"]>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    fontSize: number;
    width: number;
    type: "text";
    x: number;
    y: number;
    id: string;
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    verticalAlign?: "top" | "middle" | "bottom" | undefined;
    lineHeight?: number | undefined;
    textRole?: "body" | "label" | "heading" | "stat" | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}, {
    content: string;
    fontSize: number;
    width: number;
    type: "text";
    x: number;
    y: number;
    id: string;
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    verticalAlign?: "top" | "middle" | "bottom" | undefined;
    lineHeight?: number | undefined;
    textRole?: "body" | "label" | "heading" | "stat" | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
export declare const RectElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"rect">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    radius: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    type: "rect";
    x: number;
    y: number;
    id: string;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    radius?: number | undefined;
}, {
    width: number;
    height: number;
    type: "rect";
    x: number;
    y: number;
    id: string;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    radius?: number | undefined;
}>;
export declare const CircleElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    radius: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "circle";
    x: number;
    y: number;
    id: string;
    radius: number;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}, {
    type: "circle";
    x: number;
    y: number;
    id: string;
    radius: number;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}>;
export declare const EllipseElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"ellipse">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    type: "ellipse";
    x: number;
    y: number;
    id: string;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}, {
    width: number;
    height: number;
    type: "ellipse";
    x: number;
    y: number;
    id: string;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}>;
export declare const LineElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"line">;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    strokeDasharray: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "line";
    x: number;
    y: number;
    id: string;
    x2: number;
    y2: number;
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    strokeDasharray?: string | undefined;
}, {
    type: "line";
    x: number;
    y: number;
    id: string;
    x2: number;
    y2: number;
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    strokeDasharray?: string | undefined;
}>;
export declare const PathElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"path">;
    d: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "path";
    x: number;
    y: number;
    id: string;
    d: string;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}, {
    type: "path";
    x: number;
    y: number;
    id: string;
    d: string;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}>;
export declare const PolygonElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"polygon">;
    points: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "polygon";
    x: number;
    y: number;
    id: string;
    points: string;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}, {
    type: "polygon";
    x: number;
    y: number;
    id: string;
    points: string;
    width?: number | undefined;
    height?: number | undefined;
    fill?: string | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
}>;
export declare const ImageElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"image">;
    src: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fit: z.ZodOptional<z.ZodEnum<["cover", "contain", "fill", "none"]>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    type: "image";
    x: number;
    y: number;
    id: string;
    src: string;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    fit?: "fill" | "cover" | "contain" | "none" | undefined;
}, {
    width: number;
    height: number;
    type: "image";
    x: number;
    y: number;
    id: string;
    src: string;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    fit?: "fill" | "cover" | "contain" | "none" | undefined;
}>;
export declare const ChartTypeSchema: z.ZodEnum<["bar", "line", "pie", "doughnut"]>;
export declare const ChartSeriesSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    labels: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">;
    values: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    values: number[];
    labels: (string | number)[];
    name?: string | undefined;
}, {
    values: number[];
    labels: (string | number)[];
    name?: string | undefined;
}>, {
    values: number[];
    labels: (string | number)[];
    name?: string | undefined;
}, {
    values: number[];
    labels: (string | number)[];
    name?: string | undefined;
}>;
export declare const ChartElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"chart">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    chartType: z.ZodEnum<["bar", "line", "pie", "doughnut"]>;
    data: z.ZodArray<z.ZodEffects<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        labels: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber]>, "many">;
        values: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }, {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }>, {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }, {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }>, "many">;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    type: "chart";
    x: number;
    y: number;
    id: string;
    chartType: "line" | "bar" | "pie" | "doughnut";
    data: {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }[];
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    type: "chart";
    x: number;
    y: number;
    id: string;
    chartType: "line" | "bar" | "pie" | "doughnut";
    data: {
        values: number[];
        labels: (string | number)[];
        name?: string | undefined;
    }[];
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
export declare const TableCellSchema: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
    text: z.ZodString;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    options?: Record<string, unknown> | undefined;
}, {
    text: string;
    options?: Record<string, unknown> | undefined;
}>]>;
export declare const TableElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"table">;
    width: z.ZodNumber;
    height: z.ZodOptional<z.ZodNumber>;
    rows: z.ZodArray<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        text: z.ZodString;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        options?: Record<string, unknown> | undefined;
    }, {
        text: string;
        options?: Record<string, unknown> | undefined;
    }>]>, "many">, "many">;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    type: "table";
    x: number;
    y: number;
    rows: (string | number | boolean | {
        text: string;
        options?: Record<string, unknown> | undefined;
    } | null)[][];
    id: string;
    height?: number | undefined;
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}, {
    width: number;
    type: "table";
    x: number;
    y: number;
    rows: (string | number | boolean | {
        text: string;
        options?: Record<string, unknown> | undefined;
    } | null)[][];
    id: string;
    height?: number | undefined;
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
}>;
export declare const GroupElementSchema: z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"group">;
    elements: z.ZodArray<z.ZodLazy<z.ZodType<any, z.ZodTypeDef, any>>, "many">;
    transform: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "group";
    x: number;
    y: number;
    id: string;
    elements: any[];
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    transform?: string | undefined;
}, {
    type: "group";
    x: number;
    y: number;
    id: string;
    elements: any[];
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    transform?: string | undefined;
}>;
export declare const LayoutElementSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    rotation: z.ZodOptional<z.ZodNumber>;
    opacity: z.ZodOptional<z.ZodNumber>;
    animation: z.ZodOptional<z.ZodObject<{
        enter: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }, {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    }>>;
    placement: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        mode: z.ZodOptional<z.ZodEnum<["flow", "absolute"]>>;
        column: z.ZodOptional<z.ZodNumber>;
        row: z.ZodOptional<z.ZodNumber>;
        columnSpan: z.ZodOptional<z.ZodNumber>;
        rowSpan: z.ZodOptional<z.ZodNumber>;
        basis: z.ZodOptional<z.ZodNumber>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }, {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"layout">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    layout: z.ZodDiscriminatedUnion<"mode", [z.ZodObject<{
        mode: z.ZodLiteral<"grid">;
        columns: z.ZodArray<z.ZodNumber, "many">;
        rows: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        gap: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            row: z.ZodOptional<z.ZodNumber>;
            column: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            column?: number | undefined;
            row?: number | undefined;
        }, {
            column?: number | undefined;
            row?: number | undefined;
        }>]>>;
        padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        }, {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        }>]>>;
        alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
        justifyItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
    }, "strip", z.ZodTypeAny, {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    }, {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    }>, z.ZodObject<{
        mode: z.ZodLiteral<"flex">;
        direction: z.ZodOptional<z.ZodEnum<["row", "column"]>>;
        wrap: z.ZodOptional<z.ZodBoolean>;
        gap: z.ZodOptional<z.ZodNumber>;
        padding: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
            top: z.ZodOptional<z.ZodNumber>;
            right: z.ZodOptional<z.ZodNumber>;
            bottom: z.ZodOptional<z.ZodNumber>;
            left: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        }, {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        }>]>>;
        alignItems: z.ZodOptional<z.ZodEnum<["start", "center", "end", "stretch"]>>;
        justifyContent: z.ZodOptional<z.ZodEnum<["start", "center", "end", "space-between"]>>;
    }, "strip", z.ZodTypeAny, {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    }, {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    }>]>;
    elements: z.ZodArray<z.ZodLazy<z.ZodType<any, z.ZodTypeDef, any>>, "many">;
    overflow: z.ZodOptional<z.ZodEnum<["clip", "visible", "warn"]>>;
}, "strip", z.ZodTypeAny, {
    layout: {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    } | {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    type: "layout";
    x: number;
    y: number;
    id: string;
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    overflow?: "clip" | "visible" | "warn" | undefined;
}, {
    layout: {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    } | {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    type: "layout";
    x: number;
    y: number;
    id: string;
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    overflow?: "clip" | "visible" | "warn" | undefined;
}>, {
    layout: {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    } | {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    type: "layout";
    x: number;
    y: number;
    id: string;
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    overflow?: "clip" | "visible" | "warn" | undefined;
}, {
    layout: {
        mode: "grid";
        columns: number[];
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | {
            column?: number | undefined;
            row?: number | undefined;
        } | undefined;
        rows?: number[] | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        justifyItems?: "start" | "center" | "end" | "stretch" | undefined;
    } | {
        mode: "flex";
        padding?: number | {
            left?: number | undefined;
            right?: number | undefined;
            top?: number | undefined;
            bottom?: number | undefined;
        } | undefined;
        gap?: number | undefined;
        alignItems?: "start" | "center" | "end" | "stretch" | undefined;
        direction?: "column" | "row" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    type: "layout";
    x: number;
    y: number;
    id: string;
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        easing?: string | undefined;
        duration?: number | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
        step?: number | undefined;
    } | undefined;
    placement?: {
        mode?: "flow" | "absolute" | undefined;
        column?: number | undefined;
        row?: number | undefined;
        basis?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
    } | undefined;
    overflow?: "clip" | "visible" | "warn" | undefined;
}>;
export declare const ElementSchema: z.ZodType<any>;
export declare const SlideSchema: z.ZodObject<{
    id: z.ZodString;
    background: z.ZodOptional<z.ZodString>;
    layout: z.ZodOptional<z.ZodString>;
    elements: z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">;
    notes: z.ZodOptional<z.ZodString>;
    fx: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    elements: any[];
    layout?: string | undefined;
    background?: string | undefined;
    notes?: string | undefined;
    fx?: string[] | undefined;
}, {
    id: string;
    elements: any[];
    layout?: string | undefined;
    background?: string | undefined;
    notes?: string | undefined;
    fx?: string[] | undefined;
}>;
export declare const DeckSchema: z.ZodEffects<z.ZodObject<{
    meta: z.ZodObject<{
        title: z.ZodString;
        theme: z.ZodOptional<z.ZodString>;
        canvas: z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>;
        fonts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        htmlRuntime: z.ZodOptional<z.ZodObject<{
            transition: z.ZodOptional<z.ZodObject<{
                type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide"]>>;
                durationMs: z.ZodOptional<z.ZodNumber>;
                easing: z.ZodOptional<z.ZodString>;
                autoAnimate: z.ZodOptional<z.ZodBoolean>;
                unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
            }, "strip", z.ZodTypeAny, {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            }, {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        }, {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    }, {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    }>;
    slides: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        background: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodString>;
        elements: z.ZodArray<z.ZodType<any, z.ZodTypeDef, any>, "many">;
        notes: z.ZodOptional<z.ZodString>;
        fx: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }, {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    meta: {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    };
    slides: {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }[];
}, {
    meta: {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    };
    slides: {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }[];
}>, {
    meta: {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    };
    slides: {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }[];
}, {
    meta: {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
        } | undefined;
    };
    slides: {
        id: string;
        elements: any[];
        layout?: string | undefined;
        background?: string | undefined;
        notes?: string | undefined;
        fx?: string[] | undefined;
    }[];
}>;
export type ValidationError = {
    path: (string | number)[];
    message: string;
};
export type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    errors: ValidationError[];
};
export declare function validateDeck(input: unknown): ValidationResult<z.infer<typeof DeckSchema>>;
//# sourceMappingURL=schema.d.ts.map