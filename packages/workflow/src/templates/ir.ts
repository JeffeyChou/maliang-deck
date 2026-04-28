import { TemplateBboxSchema, TemplateExtractionIRSchema } from './contracts.js';
import type { TemplateBbox, TemplateExtractionIR, TemplateObservation } from './contracts.js';

type Dimensions = {
    width: number;
    height: number;
};

type LooseBbox = {
    x: number;
    y: number;
    width?: number;
    height?: number;
    w?: number;
    h?: number;
};

function widthOf(box: LooseBbox): number { return box.width ?? box.w ?? 0; }
function heightOf(box: LooseBbox): number { return box.height ?? box.h ?? 0; }

export function normalizeBbox<T extends LooseBbox>(
    bbox: T,
    from: Dimensions,
    to?: Dimensions,
): T extends { w: number; h: number } ? { x: number; y: number; w: number; h: number } : TemplateBbox {
    const width = widthOf(bbox);
    const height = heightOf(bbox);
    if (bbox.x < 0 || bbox.y < 0 || width <= 0 || height <= 0)
        throw new Error('Invalid bbox: dimensions must be positive and coordinates non-negative');
    if (from.width <= 0 || from.height <= 0)
        throw new Error('Invalid canvas dimensions');
    if (!to) {
        if ('w' in bbox || 'h' in bbox)
            return { x: bbox.x / from.width, y: bbox.y / from.height, w: width / from.width, h: height / from.height } as any;
        return TemplateBboxSchema.parse({ x: bbox.x / from.width, y: bbox.y / from.height, width: width / from.width, height: height / from.height }) as any;
    }
    return TemplateBboxSchema.parse({ x: (bbox.x / from.width) * to.width, y: (bbox.y / from.height) * to.height, width: (width / from.width) * to.width, height: (height / from.height) * to.height }) as any;
}

export function clampBbox(bbox: LooseBbox, dimensions: Dimensions): TemplateBbox {
    const x = Math.max(0, Math.min(bbox.x, dimensions.width - 1));
    const y = Math.max(0, Math.min(bbox.y, dimensions.height - 1));
    const width = Math.max(1, Math.min(widthOf(bbox), dimensions.width - x));
    const height = Math.max(1, Math.min(heightOf(bbox), dimensions.height - y));
    return TemplateBboxSchema.parse({ x, y, width, height });
}

export function rollupObservationConfidence(observations: TemplateObservation[]): number {
    if (observations.length === 0)
        return 0.35;
    return observations.reduce((sum, observation) => sum + observation.confidence, 0) / observations.length;
}

export function rollupConfidence(observations: TemplateObservation[]): number {
    return rollupObservationConfidence(observations);
}

export function mergeExtractionIR(id: string, inputs: TemplateExtractionIR[]): TemplateExtractionIR {
    if (inputs.length === 0)
        throw new Error('Cannot merge empty template extraction IR list');
    return TemplateExtractionIRSchema.parse({
        id,
        createdAt: new Date().toISOString(),
        sources: inputs.flatMap((input) => input.sources),
        observations: inputs.flatMap((input) => input.observations),
        warnings: Array.from(new Set(inputs.flatMap((input) => input.warnings))),
    });
}
