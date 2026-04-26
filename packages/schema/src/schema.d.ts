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
    type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide", "dissolve", "zoom", "push", "cover"]>>;
    durationMs: z.ZodOptional<z.ZodNumber>;
    easing: z.ZodOptional<z.ZodString>;
    autoAnimate: z.ZodOptional<z.ZodBoolean>;
    unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
    durationMs?: number | undefined;
    easing?: string | undefined;
    autoAnimate?: boolean | undefined;
    unmatched?: "fade" | "instant" | undefined;
}, {
    type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
    durationMs?: number | undefined;
    easing?: string | undefined;
    autoAnimate?: boolean | undefined;
    unmatched?: "fade" | "instant" | undefined;
}>;
export declare const HtmlRuntimeConfigSchema: z.ZodObject<{
    transition: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide", "dissolve", "zoom", "push", "cover"]>>;
        durationMs: z.ZodOptional<z.ZodNumber>;
        easing: z.ZodOptional<z.ZodString>;
        autoAnimate: z.ZodOptional<z.ZodBoolean>;
        unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    }, {
        type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    }>>;
    showProgressBar: z.ZodOptional<z.ZodBoolean>;
    showSlideNumber: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    transition?: {
        type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    } | undefined;
    showProgressBar?: boolean | undefined;
    showSlideNumber?: boolean | undefined;
}, {
    transition?: {
        type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
        durationMs?: number | undefined;
        easing?: string | undefined;
        autoAnimate?: boolean | undefined;
        unmatched?: "fade" | "instant" | undefined;
    } | undefined;
    showProgressBar?: boolean | undefined;
    showSlideNumber?: boolean | undefined;
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
    defaultFont: z.ZodOptional<z.ZodString>;
    fonts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    htmlRuntime: z.ZodOptional<z.ZodObject<{
        transition: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide", "dissolve", "zoom", "push", "cover"]>>;
            durationMs: z.ZodOptional<z.ZodNumber>;
            easing: z.ZodOptional<z.ZodString>;
            autoAnimate: z.ZodOptional<z.ZodBoolean>;
            unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
        }, "strip", z.ZodTypeAny, {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        }, {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        }>>;
        showProgressBar: z.ZodOptional<z.ZodBoolean>;
        showSlideNumber: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        transition?: {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
        showProgressBar?: boolean | undefined;
        showSlideNumber?: boolean | undefined;
    }, {
        transition?: {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
        showProgressBar?: boolean | undefined;
        showSlideNumber?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    canvas: {
        width: number;
        height: number;
    };
    theme?: string | undefined;
    defaultFont?: string | undefined;
    fonts?: Record<string, string> | undefined;
    htmlRuntime?: {
        transition?: {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
        showProgressBar?: boolean | undefined;
        showSlideNumber?: boolean | undefined;
    } | undefined;
}, {
    title: string;
    canvas: {
        width: number;
        height: number;
    };
    theme?: string | undefined;
    defaultFont?: string | undefined;
    fonts?: Record<string, string> | undefined;
    htmlRuntime?: {
        transition?: {
            type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
            durationMs?: number | undefined;
            easing?: string | undefined;
            autoAnimate?: boolean | undefined;
            unmatched?: "fade" | "instant" | undefined;
        } | undefined;
        showProgressBar?: boolean | undefined;
        showSlideNumber?: boolean | undefined;
    } | undefined;
}>;
export declare const AnimationSchema: z.ZodObject<{
    enter: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    delay: z.ZodOptional<z.ZodNumber>;
    easing: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    step?: number | undefined;
    duration?: number | undefined;
    easing?: string | undefined;
    enter?: string | undefined;
    delay?: number | undefined;
}, {
    step?: number | undefined;
    duration?: number | undefined;
    easing?: string | undefined;
    enter?: string | undefined;
    delay?: number | undefined;
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
    row?: number | undefined;
    column?: number | undefined;
    mode?: "flow" | "absolute" | undefined;
    basis?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
}, {
    row?: number | undefined;
    column?: number | undefined;
    mode?: "flow" | "absolute" | undefined;
    basis?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
}>, {
    row?: number | undefined;
    column?: number | undefined;
    mode?: "flow" | "absolute" | undefined;
    basis?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
}, {
    row?: number | undefined;
    column?: number | undefined;
    mode?: "flow" | "absolute" | undefined;
    basis?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    columnSpan?: number | undefined;
    rowSpan?: number | undefined;
}>;
export declare const GridLayoutConfigSchema: z.ZodObject<{
    mode: z.ZodLiteral<"grid">;
    columns: z.ZodArray<z.ZodNumber, "many">;
    rows: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    gap: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodObject<{
        row: z.ZodOptional<z.ZodNumber>;
        column: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        row?: number | undefined;
        column?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
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
    direction?: "row" | "column" | undefined;
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
    direction?: "row" | "column" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
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
    direction?: "row" | "column" | undefined;
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
    direction?: "row" | "column" | undefined;
    wrap?: boolean | undefined;
    justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
}>]>;
export declare const ContinuousAnimationSchema: z.ZodObject<{
    duration: z.ZodNumber;
    delay: z.ZodOptional<z.ZodNumber>;
    loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
    trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
    step: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    duration: number;
    step?: number | undefined;
    delay?: number | undefined;
    loop?: number | boolean | undefined;
    trigger?: "visible" | "auto" | "step" | undefined;
}, {
    duration: number;
    step?: number | undefined;
    delay?: number | undefined;
    loop?: number | boolean | undefined;
    trigger?: "visible" | "auto" | "step" | undefined;
}>;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"text">;
    content: z.ZodString;
    width: z.ZodNumber;
    fontSize: z.ZodNumber;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontWeight: z.ZodOptional<z.ZodEnum<["normal", "bold"]>>;
    fontStyle: z.ZodOptional<z.ZodEnum<["normal", "italic"]>>;
    textDecoration: z.ZodOptional<z.ZodEnum<["none", "underline"]>>;
    color: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    verticalAlign: z.ZodOptional<z.ZodEnum<["top", "middle", "bottom"]>>;
    lineHeight: z.ZodOptional<z.ZodNumber>;
    textRole: z.ZodOptional<z.ZodEnum<["body", "label", "heading", "stat"]>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    fontSize: number;
    width: number;
    x: number;
    y: number;
    id: string;
    type: "text";
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    textDecoration?: "none" | "underline" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    verticalAlign?: "top" | "middle" | "bottom" | undefined;
    lineHeight?: number | undefined;
    textRole?: "body" | "label" | "heading" | "stat" | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    content: string;
    fontSize: number;
    width: number;
    x: number;
    y: number;
    id: string;
    type: "text";
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | undefined;
    fontStyle?: "normal" | "italic" | undefined;
    textDecoration?: "none" | "underline" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    verticalAlign?: "top" | "middle" | "bottom" | undefined;
    lineHeight?: number | undefined;
    textRole?: "body" | "label" | "heading" | "stat" | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
    x: number;
    y: number;
    id: string;
    type: "rect";
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    radius?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "rect";
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    radius?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"circle">;
    radius: z.ZodNumber;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    radius: number;
    id: string;
    type: "circle";
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    x: number;
    y: number;
    radius: number;
    id: string;
    type: "circle";
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
    x: number;
    y: number;
    id: string;
    type: "ellipse";
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "ellipse";
    fill?: string | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"line">;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    strokeDasharray: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    x2: number;
    y2: number;
    id: string;
    type: "line";
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    strokeDasharray?: string | undefined;
}, {
    x: number;
    y: number;
    x2: number;
    y2: number;
    id: string;
    type: "line";
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"path">;
    d: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    id: string;
    type: "path";
    d: string;
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    x: number;
    y: number;
    id: string;
    type: "path";
    d: string;
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"polygon">;
    points: z.ZodString;
    fill: z.ZodOptional<z.ZodString>;
    stroke: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    id: string;
    type: "polygon";
    points: string;
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
}, {
    x: number;
    y: number;
    id: string;
    type: "polygon";
    points: string;
    fill?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
    x: number;
    y: number;
    id: string;
    type: "image";
    src: string;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    fit?: "none" | "cover" | "contain" | "fill" | undefined;
}, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "image";
    src: string;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    fit?: "none" | "cover" | "contain" | "fill" | undefined;
}>;
export declare const ChartStyleSchema: z.ZodObject<{
    palette: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    axisColor: z.ZodOptional<z.ZodString>;
    gridColor: z.ZodOptional<z.ZodString>;
    labelColor: z.ZodOptional<z.ZodString>;
    backgroundColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    showLegend: z.ZodOptional<z.ZodBoolean>;
    showDataLabels: z.ZodOptional<z.ZodBoolean>;
    legendPosition: z.ZodOptional<z.ZodEnum<["top", "bottom", "right"]>>;
    gridLines: z.ZodOptional<z.ZodBoolean>;
    rounded: z.ZodOptional<z.ZodBoolean>;
    areaFill: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    strokeWidth?: number | undefined;
    palette?: string[] | undefined;
    axisColor?: string | undefined;
    gridColor?: string | undefined;
    labelColor?: string | undefined;
    backgroundColor?: string | undefined;
    showLegend?: boolean | undefined;
    showDataLabels?: boolean | undefined;
    legendPosition?: "right" | "top" | "bottom" | undefined;
    gridLines?: boolean | undefined;
    rounded?: boolean | undefined;
    areaFill?: boolean | undefined;
}, {
    strokeWidth?: number | undefined;
    palette?: string[] | undefined;
    axisColor?: string | undefined;
    gridColor?: string | undefined;
    labelColor?: string | undefined;
    backgroundColor?: string | undefined;
    showLegend?: boolean | undefined;
    showDataLabels?: boolean | undefined;
    legendPosition?: "right" | "top" | "bottom" | undefined;
    gridLines?: boolean | undefined;
    rounded?: boolean | undefined;
    areaFill?: boolean | undefined;
}>;
export declare const TableStyleSchema: z.ZodObject<{
    headerBackground: z.ZodOptional<z.ZodString>;
    headerColor: z.ZodOptional<z.ZodString>;
    rowStripe: z.ZodOptional<z.ZodBoolean>;
    stripeColor: z.ZodOptional<z.ZodString>;
    borderColor: z.ZodOptional<z.ZodString>;
    borderWidth: z.ZodOptional<z.ZodNumber>;
    cellPadding: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    rounded: z.ZodOptional<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    fontSize?: number | undefined;
    fontFamily?: string | undefined;
    rounded?: boolean | undefined;
    headerBackground?: string | undefined;
    headerColor?: string | undefined;
    rowStripe?: boolean | undefined;
    stripeColor?: string | undefined;
    borderColor?: string | undefined;
    borderWidth?: number | undefined;
    cellPadding?: string | undefined;
}, {
    fontSize?: number | undefined;
    fontFamily?: string | undefined;
    rounded?: boolean | undefined;
    headerBackground?: string | undefined;
    headerColor?: string | undefined;
    rowStripe?: boolean | undefined;
    stripeColor?: string | undefined;
    borderColor?: string | undefined;
    borderWidth?: number | undefined;
    cellPadding?: string | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
    style: z.ZodOptional<z.ZodObject<{
        palette: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        axisColor: z.ZodOptional<z.ZodString>;
        gridColor: z.ZodOptional<z.ZodString>;
        labelColor: z.ZodOptional<z.ZodString>;
        backgroundColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        showLegend: z.ZodOptional<z.ZodBoolean>;
        showDataLabels: z.ZodOptional<z.ZodBoolean>;
        legendPosition: z.ZodOptional<z.ZodEnum<["top", "bottom", "right"]>>;
        gridLines: z.ZodOptional<z.ZodBoolean>;
        rounded: z.ZodOptional<z.ZodBoolean>;
        areaFill: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        strokeWidth?: number | undefined;
        palette?: string[] | undefined;
        axisColor?: string | undefined;
        gridColor?: string | undefined;
        labelColor?: string | undefined;
        backgroundColor?: string | undefined;
        showLegend?: boolean | undefined;
        showDataLabels?: boolean | undefined;
        legendPosition?: "right" | "top" | "bottom" | undefined;
        gridLines?: boolean | undefined;
        rounded?: boolean | undefined;
        areaFill?: boolean | undefined;
    }, {
        strokeWidth?: number | undefined;
        palette?: string[] | undefined;
        axisColor?: string | undefined;
        gridColor?: string | undefined;
        labelColor?: string | undefined;
        backgroundColor?: string | undefined;
        showLegend?: boolean | undefined;
        showDataLabels?: boolean | undefined;
        legendPosition?: "right" | "top" | "bottom" | undefined;
        gridLines?: boolean | undefined;
        rounded?: boolean | undefined;
        areaFill?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "chart";
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    style?: {
        strokeWidth?: number | undefined;
        palette?: string[] | undefined;
        axisColor?: string | undefined;
        gridColor?: string | undefined;
        labelColor?: string | undefined;
        backgroundColor?: string | undefined;
        showLegend?: boolean | undefined;
        showDataLabels?: boolean | undefined;
        legendPosition?: "right" | "top" | "bottom" | undefined;
        gridLines?: boolean | undefined;
        rounded?: boolean | undefined;
        areaFill?: boolean | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "chart";
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    style?: {
        strokeWidth?: number | undefined;
        palette?: string[] | undefined;
        axisColor?: string | undefined;
        gridColor?: string | undefined;
        labelColor?: string | undefined;
        backgroundColor?: string | undefined;
        showLegend?: boolean | undefined;
        showDataLabels?: boolean | undefined;
        legendPosition?: "right" | "top" | "bottom" | undefined;
        gridLines?: boolean | undefined;
        rounded?: boolean | undefined;
        areaFill?: boolean | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
    style: z.ZodOptional<z.ZodObject<{
        headerBackground: z.ZodOptional<z.ZodString>;
        headerColor: z.ZodOptional<z.ZodString>;
        rowStripe: z.ZodOptional<z.ZodBoolean>;
        stripeColor: z.ZodOptional<z.ZodString>;
        borderColor: z.ZodOptional<z.ZodString>;
        borderWidth: z.ZodOptional<z.ZodNumber>;
        cellPadding: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodString>;
        rounded: z.ZodOptional<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        fontSize?: number | undefined;
        fontFamily?: string | undefined;
        rounded?: boolean | undefined;
        headerBackground?: string | undefined;
        headerColor?: string | undefined;
        rowStripe?: boolean | undefined;
        stripeColor?: string | undefined;
        borderColor?: string | undefined;
        borderWidth?: number | undefined;
        cellPadding?: string | undefined;
    }, {
        fontSize?: number | undefined;
        fontFamily?: string | undefined;
        rounded?: boolean | undefined;
        headerBackground?: string | undefined;
        headerColor?: string | undefined;
        rowStripe?: boolean | undefined;
        stripeColor?: string | undefined;
        borderColor?: string | undefined;
        borderWidth?: number | undefined;
        cellPadding?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    x: number;
    y: number;
    id: string;
    type: "table";
    rows: (string | number | boolean | {
        text: string;
        options?: Record<string, unknown> | undefined;
    } | null)[][];
    height?: number | undefined;
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    style?: {
        fontSize?: number | undefined;
        fontFamily?: string | undefined;
        rounded?: boolean | undefined;
        headerBackground?: string | undefined;
        headerColor?: string | undefined;
        rowStripe?: boolean | undefined;
        stripeColor?: string | undefined;
        borderColor?: string | undefined;
        borderWidth?: number | undefined;
        cellPadding?: string | undefined;
    } | undefined;
}, {
    width: number;
    x: number;
    y: number;
    id: string;
    type: "table";
    rows: (string | number | boolean | {
        text: string;
        options?: Record<string, unknown> | undefined;
    } | null)[][];
    height?: number | undefined;
    options?: Record<string, unknown> | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    style?: {
        fontSize?: number | undefined;
        fontFamily?: string | undefined;
        rounded?: boolean | undefined;
        headerBackground?: string | undefined;
        headerColor?: string | undefined;
        rowStripe?: boolean | undefined;
        stripeColor?: string | undefined;
        borderColor?: string | undefined;
        borderWidth?: number | undefined;
        cellPadding?: string | undefined;
    } | undefined;
}>;
export declare const CustomHtmlElementSchema: z.ZodObject<{
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"customHtml">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    html: z.ZodString;
    fallbackImage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    html: string;
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "customHtml";
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    fallbackImage?: string | undefined;
}, {
    html: string;
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "customHtml";
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    fallbackImage?: string | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"group">;
    elements: z.ZodArray<z.ZodLazy<z.ZodType<any, z.ZodTypeDef, any>>, "many">;
    transform: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    id: string;
    type: "group";
    elements: any[];
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    transform?: string | undefined;
}, {
    x: number;
    y: number;
    id: string;
    type: "group";
    elements: any[];
    width?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
        }, {
            row?: number | undefined;
            column?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
        direction?: "row" | "column" | undefined;
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
        direction?: "row" | "column" | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
        direction?: "row" | "column" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "layout";
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
        direction?: "row" | "column" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "layout";
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
        direction?: "row" | "column" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "layout";
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
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
            row?: number | undefined;
            column?: number | undefined;
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
        direction?: "row" | "column" | undefined;
        wrap?: boolean | undefined;
        justifyContent?: "start" | "center" | "end" | "space-between" | undefined;
    };
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "layout";
    elements: any[];
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    overflow?: "clip" | "visible" | "warn" | undefined;
}>;
export declare const TextAnimEffectSchema: z.ZodObject<{
    name: z.ZodEnum<["stagger", "wave", "cascade", "scramble", "decode", "typewriter", "fade-chars", "bounce-chars", "rotate-chars", "scale-chars", "blur-reveal", "glitch"]>;
    splitMode: z.ZodOptional<z.ZodEnum<["char", "word", "line"]>>;
    stagger: z.ZodOptional<z.ZodNumber>;
    direction: z.ZodOptional<z.ZodEnum<["forward", "backward", "center", "edges", "random"]>>;
    easing: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
    stagger?: number | undefined;
    duration?: number | undefined;
    easing?: string | undefined;
    direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
    splitMode?: "line" | "char" | "word" | undefined;
}, {
    name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
    stagger?: number | undefined;
    duration?: number | undefined;
    easing?: string | undefined;
    direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
    splitMode?: "line" | "char" | "word" | undefined;
}>;
export declare const TextPathSchema: z.ZodObject<{
    d: z.ZodString;
    align: z.ZodOptional<z.ZodEnum<["start", "center", "end"]>>;
    offset: z.ZodOptional<z.ZodNumber>;
    animate: z.ZodOptional<z.ZodBoolean>;
    animateDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    d: string;
    align?: "start" | "center" | "end" | undefined;
    offset?: number | undefined;
    animate?: boolean | undefined;
    animateDuration?: number | undefined;
}, {
    d: string;
    align?: "start" | "center" | "end" | undefined;
    offset?: number | undefined;
    animate?: boolean | undefined;
    animateDuration?: number | undefined;
}>;
export declare const AnimatedTextElementSchema: z.ZodObject<{
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"animatedText">;
    content: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodOptional<z.ZodNumber>;
    fontSize: z.ZodNumber;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontWeight: z.ZodOptional<z.ZodEnum<["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]>>;
    color: z.ZodOptional<z.ZodString>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    lineHeight: z.ZodOptional<z.ZodNumber>;
    textAnimation: z.ZodUnion<[z.ZodObject<{
        name: z.ZodEnum<["stagger", "wave", "cascade", "scramble", "decode", "typewriter", "fade-chars", "bounce-chars", "rotate-chars", "scale-chars", "blur-reveal", "glitch"]>;
        splitMode: z.ZodOptional<z.ZodEnum<["char", "word", "line"]>>;
        stagger: z.ZodOptional<z.ZodNumber>;
        direction: z.ZodOptional<z.ZodEnum<["forward", "backward", "center", "edges", "random"]>>;
        easing: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }, {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }>, z.ZodArray<z.ZodObject<{
        name: z.ZodEnum<["stagger", "wave", "cascade", "scramble", "decode", "typewriter", "fade-chars", "bounce-chars", "rotate-chars", "scale-chars", "blur-reveal", "glitch"]>;
        splitMode: z.ZodOptional<z.ZodEnum<["char", "word", "line"]>>;
        stagger: z.ZodOptional<z.ZodNumber>;
        direction: z.ZodOptional<z.ZodEnum<["forward", "backward", "center", "edges", "random"]>>;
        easing: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }, {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }>, "many">]>;
    path: z.ZodOptional<z.ZodObject<{
        d: z.ZodString;
        align: z.ZodOptional<z.ZodEnum<["start", "center", "end"]>>;
        offset: z.ZodOptional<z.ZodNumber>;
        animate: z.ZodOptional<z.ZodBoolean>;
        animateDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        d: string;
        align?: "start" | "center" | "end" | undefined;
        offset?: number | undefined;
        animate?: boolean | undefined;
        animateDuration?: number | undefined;
    }, {
        d: string;
        align?: "start" | "center" | "end" | undefined;
        offset?: number | undefined;
        animate?: boolean | undefined;
        animateDuration?: number | undefined;
    }>>;
    morphTo: z.ZodOptional<z.ZodString>;
    morphDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content: string;
    fontSize: number;
    width: number;
    x: number;
    y: number;
    id: string;
    type: "animatedText";
    textAnimation: {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    } | {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }[];
    path?: {
        d: string;
        align?: "start" | "center" | "end" | undefined;
        offset?: number | undefined;
        animate?: boolean | undefined;
        animateDuration?: number | undefined;
    } | undefined;
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    lineHeight?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    morphTo?: string | undefined;
    morphDuration?: number | undefined;
}, {
    content: string;
    fontSize: number;
    width: number;
    x: number;
    y: number;
    id: string;
    type: "animatedText";
    textAnimation: {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    } | {
        name: "stagger" | "wave" | "cascade" | "scramble" | "decode" | "typewriter" | "fade-chars" | "bounce-chars" | "rotate-chars" | "scale-chars" | "blur-reveal" | "glitch";
        stagger?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        direction?: "center" | "forward" | "backward" | "edges" | "random" | undefined;
        splitMode?: "line" | "char" | "word" | undefined;
    }[];
    path?: {
        d: string;
        align?: "start" | "center" | "end" | undefined;
        offset?: number | undefined;
        animate?: boolean | undefined;
        animateDuration?: number | undefined;
    } | undefined;
    fontFamily?: string | undefined;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
    color?: string | undefined;
    align?: "center" | "left" | "right" | undefined;
    lineHeight?: number | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    morphTo?: string | undefined;
    morphDuration?: number | undefined;
}>;
export declare const FormulaHighlightSchema: z.ZodObject<{
    symbol: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    color?: string | undefined;
}, {
    symbol: string;
    color?: string | undefined;
}>;
export declare const FormulaMorphMapSchema: z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodNumber>, z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, z.ZodArray<z.ZodObject<{
    source: z.ZodNumber;
    target: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    source: number;
    target: number;
}, {
    source: number;
    target: number;
}>, "many">]>;
export declare const FormulaStepSchema: z.ZodObject<{
    latex: z.ZodString;
    annotation: z.ZodOptional<z.ZodString>;
    highlight: z.ZodOptional<z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        color?: string | undefined;
    }, {
        symbol: string;
        color?: string | undefined;
    }>, "many">>;
    duration: z.ZodOptional<z.ZodNumber>;
    morphMap: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodNumber>, z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, z.ZodArray<z.ZodObject<{
        source: z.ZodNumber;
        target: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        source: number;
        target: number;
    }, {
        source: number;
        target: number;
    }>, "many">]>>;
}, "strip", z.ZodTypeAny, {
    latex: string;
    duration?: number | undefined;
    annotation?: string | undefined;
    highlight?: {
        symbol: string;
        color?: string | undefined;
    }[] | undefined;
    morphMap?: Record<string, number> | [number, number][] | {
        source: number;
        target: number;
    }[] | undefined;
}, {
    latex: string;
    duration?: number | undefined;
    annotation?: string | undefined;
    highlight?: {
        symbol: string;
        color?: string | undefined;
    }[] | undefined;
    morphMap?: Record<string, number> | [number, number][] | {
        source: number;
        target: number;
    }[] | undefined;
}>;
export declare const FormulaElementSchema: z.ZodObject<{
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"formula">;
    width: z.ZodNumber;
    height: z.ZodOptional<z.ZodNumber>;
    latex: z.ZodString;
    displayMode: z.ZodOptional<z.ZodBoolean>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        latex: z.ZodString;
        annotation: z.ZodOptional<z.ZodString>;
        highlight: z.ZodOptional<z.ZodArray<z.ZodObject<{
            symbol: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            symbol: string;
            color?: string | undefined;
        }, {
            symbol: string;
            color?: string | undefined;
        }>, "many">>;
        duration: z.ZodOptional<z.ZodNumber>;
        morphMap: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodNumber>, z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, z.ZodArray<z.ZodObject<{
            source: z.ZodNumber;
            target: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            source: number;
            target: number;
        }, {
            source: number;
            target: number;
        }>, "many">]>>;
    }, "strip", z.ZodTypeAny, {
        latex: string;
        duration?: number | undefined;
        annotation?: string | undefined;
        highlight?: {
            symbol: string;
            color?: string | undefined;
        }[] | undefined;
        morphMap?: Record<string, number> | [number, number][] | {
            source: number;
            target: number;
        }[] | undefined;
    }, {
        latex: string;
        duration?: number | undefined;
        annotation?: string | undefined;
        highlight?: {
            symbol: string;
            color?: string | undefined;
        }[] | undefined;
        morphMap?: Record<string, number> | [number, number][] | {
            source: number;
            target: number;
        }[] | undefined;
    }>, "many">>;
    morphEasing: z.ZodOptional<z.ZodString>;
    morphDuration: z.ZodOptional<z.ZodNumber>;
    morphMap: z.ZodOptional<z.ZodUnion<[z.ZodRecord<z.ZodString, z.ZodNumber>, z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, z.ZodArray<z.ZodObject<{
        source: z.ZodNumber;
        target: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        source: number;
        target: number;
    }, {
        source: number;
        target: number;
    }>, "many">]>>;
    stepTrigger: z.ZodOptional<z.ZodEnum<["auto", "click"]>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    x: number;
    y: number;
    id: string;
    type: "formula";
    latex: string;
    fontSize?: number | undefined;
    color?: string | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    morphDuration?: number | undefined;
    morphMap?: Record<string, number> | [number, number][] | {
        source: number;
        target: number;
    }[] | undefined;
    displayMode?: boolean | undefined;
    steps?: {
        latex: string;
        duration?: number | undefined;
        annotation?: string | undefined;
        highlight?: {
            symbol: string;
            color?: string | undefined;
        }[] | undefined;
        morphMap?: Record<string, number> | [number, number][] | {
            source: number;
            target: number;
        }[] | undefined;
    }[] | undefined;
    morphEasing?: string | undefined;
    stepTrigger?: "auto" | "click" | undefined;
}, {
    width: number;
    x: number;
    y: number;
    id: string;
    type: "formula";
    latex: string;
    fontSize?: number | undefined;
    color?: string | undefined;
    height?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    morphDuration?: number | undefined;
    morphMap?: Record<string, number> | [number, number][] | {
        source: number;
        target: number;
    }[] | undefined;
    displayMode?: boolean | undefined;
    steps?: {
        latex: string;
        duration?: number | undefined;
        annotation?: string | undefined;
        highlight?: {
            symbol: string;
            color?: string | undefined;
        }[] | undefined;
        morphMap?: Record<string, number> | [number, number][] | {
            source: number;
            target: number;
        }[] | undefined;
    }[] | undefined;
    morphEasing?: string | undefined;
    stepTrigger?: "auto" | "click" | undefined;
}>;
export declare const GraphFunctionSchema: z.ZodObject<{
    expr: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    domain: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    animate: z.ZodOptional<z.ZodEnum<["draw-on", "fade", "none"]>>;
    animateDuration: z.ZodOptional<z.ZodNumber>;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    expr: string;
    label?: string | undefined;
    color?: string | undefined;
    strokeWidth?: number | undefined;
    animate?: "none" | "fade" | "draw-on" | undefined;
    animateDuration?: number | undefined;
    domain?: [number, number] | undefined;
}, {
    expr: string;
    label?: string | undefined;
    color?: string | undefined;
    strokeWidth?: number | undefined;
    animate?: "none" | "fade" | "draw-on" | undefined;
    animateDuration?: number | undefined;
    domain?: [number, number] | undefined;
}>;
export declare const GraphAnnotationSchema: z.ZodObject<{
    type: z.ZodEnum<["point", "tangent", "area", "vertical-line"]>;
    at: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    animate: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "point" | "tangent" | "area" | "vertical-line";
    label?: string | undefined;
    color?: string | undefined;
    at?: number | undefined;
    animate?: boolean | undefined;
}, {
    type: "point" | "tangent" | "area" | "vertical-line";
    label?: string | undefined;
    color?: string | undefined;
    at?: number | undefined;
    animate?: boolean | undefined;
}>;
export declare const GraphAxesSchema: z.ZodObject<{
    x: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    y: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    grid: z.ZodOptional<z.ZodBoolean>;
    labels: z.ZodOptional<z.ZodBoolean>;
    tickInterval: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    x: [number, number];
    y: [number, number];
    grid?: boolean | undefined;
    labels?: boolean | undefined;
    tickInterval?: number | undefined;
}, {
    x: [number, number];
    y: [number, number];
    grid?: boolean | undefined;
    labels?: boolean | undefined;
    tickInterval?: number | undefined;
}>;
export declare const GraphParameterSchema: z.ZodObject<{
    name: z.ZodString;
    range: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    animate: z.ZodOptional<z.ZodBoolean>;
    duration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    range: [number, number];
    duration?: number | undefined;
    animate?: boolean | undefined;
}, {
    name: string;
    range: [number, number];
    duration?: number | undefined;
    animate?: boolean | undefined;
}>;
export declare const Graph3dCameraSchema: z.ZodObject<{
    distance: z.ZodOptional<z.ZodNumber>;
    phi: z.ZodOptional<z.ZodNumber>;
    theta: z.ZodOptional<z.ZodNumber>;
    fov: z.ZodOptional<z.ZodNumber>;
    orbit: z.ZodOptional<z.ZodBoolean>;
    orbitSpeed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    distance?: number | undefined;
    phi?: number | undefined;
    theta?: number | undefined;
    fov?: number | undefined;
    orbit?: boolean | undefined;
    orbitSpeed?: number | undefined;
}, {
    distance?: number | undefined;
    phi?: number | undefined;
    theta?: number | undefined;
    fov?: number | undefined;
    orbit?: boolean | undefined;
    orbitSpeed?: number | undefined;
}>;
export declare const Graph3dSurfaceSchema: z.ZodObject<{
    expr: z.ZodString;
    colorMap: z.ZodOptional<z.ZodEnum<["viridis", "plasma", "inferno", "coolwarm", "rainbow", "monochrome"]>>;
    wireframe: z.ZodOptional<z.ZodBoolean>;
    opacity: z.ZodOptional<z.ZodNumber>;
    resolution: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    expr: string;
    opacity?: number | undefined;
    colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
    wireframe?: boolean | undefined;
    resolution?: number | undefined;
}, {
    expr: string;
    opacity?: number | undefined;
    colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
    wireframe?: boolean | undefined;
    resolution?: number | undefined;
}>;
export declare const GraphElementSchema: z.ZodObject<{
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
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }, {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    }>>;
    continuousAnimation: z.ZodOptional<z.ZodObject<{
        duration: z.ZodNumber;
        delay: z.ZodOptional<z.ZodNumber>;
        loop: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber]>>;
        trigger: z.ZodOptional<z.ZodEnum<["auto", "step", "visible"]>>;
        step: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    }, {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
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
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }, {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    }>>;
} & {
    type: z.ZodLiteral<"graph">;
    width: z.ZodNumber;
    height: z.ZodNumber;
    functions: z.ZodArray<z.ZodObject<{
        expr: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        domain: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        animate: z.ZodOptional<z.ZodEnum<["draw-on", "fade", "none"]>>;
        animateDuration: z.ZodOptional<z.ZodNumber>;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        expr: string;
        label?: string | undefined;
        color?: string | undefined;
        strokeWidth?: number | undefined;
        animate?: "none" | "fade" | "draw-on" | undefined;
        animateDuration?: number | undefined;
        domain?: [number, number] | undefined;
    }, {
        expr: string;
        label?: string | undefined;
        color?: string | undefined;
        strokeWidth?: number | undefined;
        animate?: "none" | "fade" | "draw-on" | undefined;
        animateDuration?: number | undefined;
        domain?: [number, number] | undefined;
    }>, "many">;
    axes: z.ZodObject<{
        x: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        y: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        grid: z.ZodOptional<z.ZodBoolean>;
        labels: z.ZodOptional<z.ZodBoolean>;
        tickInterval: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        x: [number, number];
        y: [number, number];
        grid?: boolean | undefined;
        labels?: boolean | undefined;
        tickInterval?: number | undefined;
    }, {
        x: [number, number];
        y: [number, number];
        grid?: boolean | undefined;
        labels?: boolean | undefined;
        tickInterval?: number | undefined;
    }>;
    parameter: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        range: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        animate: z.ZodOptional<z.ZodBoolean>;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        range: [number, number];
        duration?: number | undefined;
        animate?: boolean | undefined;
    }, {
        name: string;
        range: [number, number];
        duration?: number | undefined;
        animate?: boolean | undefined;
    }>>;
    annotations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["point", "tangent", "area", "vertical-line"]>;
        at: z.ZodOptional<z.ZodNumber>;
        color: z.ZodOptional<z.ZodString>;
        label: z.ZodOptional<z.ZodString>;
        animate: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "point" | "tangent" | "area" | "vertical-line";
        label?: string | undefined;
        color?: string | undefined;
        at?: number | undefined;
        animate?: boolean | undefined;
    }, {
        type: "point" | "tangent" | "area" | "vertical-line";
        label?: string | undefined;
        color?: string | undefined;
        at?: number | undefined;
        animate?: boolean | undefined;
    }>, "many">>;
    mode: z.ZodOptional<z.ZodEnum<["2d", "3d"]>>;
    surface: z.ZodOptional<z.ZodObject<{
        expr: z.ZodString;
        colorMap: z.ZodOptional<z.ZodEnum<["viridis", "plasma", "inferno", "coolwarm", "rainbow", "monochrome"]>>;
        wireframe: z.ZodOptional<z.ZodBoolean>;
        opacity: z.ZodOptional<z.ZodNumber>;
        resolution: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        expr: string;
        opacity?: number | undefined;
        colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
        wireframe?: boolean | undefined;
        resolution?: number | undefined;
    }, {
        expr: string;
        opacity?: number | undefined;
        colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
        wireframe?: boolean | undefined;
        resolution?: number | undefined;
    }>>;
    zAxis: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    camera: z.ZodOptional<z.ZodObject<{
        distance: z.ZodOptional<z.ZodNumber>;
        phi: z.ZodOptional<z.ZodNumber>;
        theta: z.ZodOptional<z.ZodNumber>;
        fov: z.ZodOptional<z.ZodNumber>;
        orbit: z.ZodOptional<z.ZodBoolean>;
        orbitSpeed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        distance?: number | undefined;
        phi?: number | undefined;
        theta?: number | undefined;
        fov?: number | undefined;
        orbit?: boolean | undefined;
        orbitSpeed?: number | undefined;
    }, {
        distance?: number | undefined;
        phi?: number | undefined;
        theta?: number | undefined;
        fov?: number | undefined;
        orbit?: boolean | undefined;
        orbitSpeed?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "graph";
    functions: {
        expr: string;
        label?: string | undefined;
        color?: string | undefined;
        strokeWidth?: number | undefined;
        animate?: "none" | "fade" | "draw-on" | undefined;
        animateDuration?: number | undefined;
        domain?: [number, number] | undefined;
    }[];
    axes: {
        x: [number, number];
        y: [number, number];
        grid?: boolean | undefined;
        labels?: boolean | undefined;
        tickInterval?: number | undefined;
    };
    mode?: "2d" | "3d" | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    parameter?: {
        name: string;
        range: [number, number];
        duration?: number | undefined;
        animate?: boolean | undefined;
    } | undefined;
    annotations?: {
        type: "point" | "tangent" | "area" | "vertical-line";
        label?: string | undefined;
        color?: string | undefined;
        at?: number | undefined;
        animate?: boolean | undefined;
    }[] | undefined;
    surface?: {
        expr: string;
        opacity?: number | undefined;
        colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
        wireframe?: boolean | undefined;
        resolution?: number | undefined;
    } | undefined;
    zAxis?: [number, number] | undefined;
    camera?: {
        distance?: number | undefined;
        phi?: number | undefined;
        theta?: number | undefined;
        fov?: number | undefined;
        orbit?: boolean | undefined;
        orbitSpeed?: number | undefined;
    } | undefined;
}, {
    width: number;
    height: number;
    x: number;
    y: number;
    id: string;
    type: "graph";
    functions: {
        expr: string;
        label?: string | undefined;
        color?: string | undefined;
        strokeWidth?: number | undefined;
        animate?: "none" | "fade" | "draw-on" | undefined;
        animateDuration?: number | undefined;
        domain?: [number, number] | undefined;
    }[];
    axes: {
        x: [number, number];
        y: [number, number];
        grid?: boolean | undefined;
        labels?: boolean | undefined;
        tickInterval?: number | undefined;
    };
    mode?: "2d" | "3d" | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    animation?: {
        step?: number | undefined;
        duration?: number | undefined;
        easing?: string | undefined;
        enter?: string | undefined;
        delay?: number | undefined;
    } | undefined;
    continuousAnimation?: {
        duration: number;
        step?: number | undefined;
        delay?: number | undefined;
        loop?: number | boolean | undefined;
        trigger?: "visible" | "auto" | "step" | undefined;
    } | undefined;
    placement?: {
        row?: number | undefined;
        column?: number | undefined;
        mode?: "flow" | "absolute" | undefined;
        basis?: number | undefined;
        x?: number | undefined;
        y?: number | undefined;
        columnSpan?: number | undefined;
        rowSpan?: number | undefined;
    } | undefined;
    parameter?: {
        name: string;
        range: [number, number];
        duration?: number | undefined;
        animate?: boolean | undefined;
    } | undefined;
    annotations?: {
        type: "point" | "tangent" | "area" | "vertical-line";
        label?: string | undefined;
        color?: string | undefined;
        at?: number | undefined;
        animate?: boolean | undefined;
    }[] | undefined;
    surface?: {
        expr: string;
        opacity?: number | undefined;
        colorMap?: "viridis" | "plasma" | "inferno" | "coolwarm" | "rainbow" | "monochrome" | undefined;
        wireframe?: boolean | undefined;
        resolution?: number | undefined;
    } | undefined;
    zAxis?: [number, number] | undefined;
    camera?: {
        distance?: number | undefined;
        phi?: number | undefined;
        theta?: number | undefined;
        fov?: number | undefined;
        orbit?: boolean | undefined;
        orbitSpeed?: number | undefined;
    } | undefined;
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
        defaultFont: z.ZodOptional<z.ZodString>;
        fonts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        htmlRuntime: z.ZodOptional<z.ZodObject<{
            transition: z.ZodOptional<z.ZodObject<{
                type: z.ZodOptional<z.ZodEnum<["none", "fade", "slide", "dissolve", "zoom", "push", "cover"]>>;
                durationMs: z.ZodOptional<z.ZodNumber>;
                easing: z.ZodOptional<z.ZodString>;
                autoAnimate: z.ZodOptional<z.ZodBoolean>;
                unmatched: z.ZodOptional<z.ZodEnum<["fade", "instant"]>>;
            }, "strip", z.ZodTypeAny, {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            }, {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            }>>;
            showProgressBar: z.ZodOptional<z.ZodBoolean>;
            showSlideNumber: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
        }, {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
        } | undefined;
    }, {
        title: string;
        canvas: {
            width: number;
            height: number;
        };
        theme?: string | undefined;
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
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
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
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
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
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
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
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
        defaultFont?: string | undefined;
        fonts?: Record<string, string> | undefined;
        htmlRuntime?: {
            transition?: {
                type?: "none" | "fade" | "slide" | "dissolve" | "zoom" | "push" | "cover" | undefined;
                durationMs?: number | undefined;
                easing?: string | undefined;
                autoAnimate?: boolean | undefined;
                unmatched?: "fade" | "instant" | undefined;
            } | undefined;
            showProgressBar?: boolean | undefined;
            showSlideNumber?: boolean | undefined;
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