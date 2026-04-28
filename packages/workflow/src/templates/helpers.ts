import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { normalizeBbox as normalizeBboxCompat } from './ir.js';
import type { TemplateBbox, TemplateExtractionIR, TemplateObservation, TemplateSourceFormat } from './contracts.js';

export function digestFile(inputPath: string): string { return createHash('sha256').update(readFileSync(inputPath)).digest('hex'); }

export function idFromPath(inputPath: string): string { return basename(inputPath, extname(inputPath)).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'template-source'; }

export function formatFromPath(inputPath: string): TemplateSourceFormat {
    const ext = extname(inputPath).toLowerCase();
    if (ext === '.pptx')
        return 'pptx';
    if (ext === '.html' || ext === '.htm')
        return 'html';
    if (ext === '.pdf')
        return 'pdf';
    if (ext === '.png')
        return 'png';
    throw new Error(`Unsupported template input format: ${inputPath}`);
}

export function normalizeBbox(
    bbox: TemplateBbox | { x: number; y: number; w: number; h: number },
    canvas: { width: number; height: number },
):
    | { x: number; y: number; width: number; height: number }
    | { x: number; y: number; w: number; h: number } {
    return normalizeBboxCompat(bbox as any, canvas) as any;
}

export function denormalizeBbox(
    bbox: TemplateBbox | { x: number; y: number; w: number; h: number },
    canvas: { width: number; height: number },
):
    | { x: number; y: number; w: number; h: number; width?: undefined; height?: undefined }
    | { x: number; y: number; width: number; height: number; w?: undefined; h?: undefined } {
    const width = 'width' in bbox ? bbox.width : bbox.w;
    const height = 'height' in bbox ? bbox.height : bbox.h;
    if ('w' in bbox || 'h' in bbox)
        return { x: Math.round(bbox.x * canvas.width), y: Math.round(bbox.y * canvas.height), w: Math.round(width * canvas.width), h: Math.round(height * canvas.height) };
    return { x: Math.round(bbox.x * canvas.width), y: Math.round(bbox.y * canvas.height), width: Math.round(width * canvas.width), height: Math.round(height * canvas.height) };
}

export function rollupConfidence(values: number[]): number { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0.35; }

export function isSignificantObservation(observation: TemplateObservation, canvas: { width: number; height: number }): boolean {
    const areaRatio = (observation.bbox.width * observation.bbox.height) / (canvas.width * canvas.height);
    if (observation.type === 'text')
        return Boolean(observation.text?.trim()) && areaRatio >= 0.0025;
    if (observation.type === 'table' || observation.type === 'chart')
        return areaRatio >= 0.02;
    if (['image', 'shape', 'region', 'background'].includes(observation.type))
        return areaRatio >= 0.01;
    return false;
}

export function collectWarnings(irs: TemplateExtractionIR[]): string[] { return Array.from(new Set(irs.flatMap((ir) => ir.warnings))); }

export function uniqueValues(values: Array<string | undefined>): string[] { return Array.from(new Set(values.filter((value) => Boolean(value && value.trim())))) as string[]; }

export function cssColors(input: string): string[] { return Array.from(new Set([...input.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase()))); }

export function clampRatio(value: number): number { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
