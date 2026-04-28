import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { TemplateExtractionIRSchema } from './contracts.js';
import type { TemplateAdapterOptions, TemplateExtractionIR, TemplateSourceAdapter, TemplateSourceFormat } from './contracts.js';
import { clampBbox, mergeExtractionIR } from './ir.js';

const DEFAULT_CANVAS = { width: 1280, height: 720 };
const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;

type RichIR = TemplateExtractionIR & {
    source: TemplateExtractionIR['sources'][number];
    canvas: { width: number; height: number };
    confidence: 'high' | 'medium' | 'low';
    provenance: string[];
    tokens: { colors: string[]; fonts: string[] };
};

function now(): string { return new Date().toISOString(); }
function cleanId(value: string): string { return basename(value).replace(/\.[^.]+$/u, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'source'; }
function sourceId(format: string, path: string): string { return `${format}-${cleanId(path)}`; }
function formatFromPath(path: string): TemplateSourceFormat {
    const ext = extname(path).toLowerCase();
    if (ext === '.pptx')
        return 'pptx';
    if (ext === '.html' || ext === '.htm')
        return 'html';
    if (ext === '.pdf')
        return 'pdf';
    if (ext === '.png')
        return 'png';
    if (!ext)
        return 'pptx';
    throw new Error(`Unsupported template input format: ${path}`);
}

function colorsFromText(text: string): string[] {
    return Array.from(new Set([...text.matchAll(/#?([0-9a-fA-F]{6})\b/g)].map((m) => `#${m[1].toLowerCase()}`)));
}

function readLimited(path: string, maxBytes = 20 * 1024 * 1024): Buffer {
    const stats = statSync(path);
    if (stats.size > maxBytes)
        throw new Error(`Input exceeds resource limit (${stats.size} > ${maxBytes} bytes): ${path}`);
    return readFileSync(path);
}

function confidenceLabel(score: number): 'high' | 'medium' | 'low' { return score >= 0.75 ? 'high' : score >= 0.55 ? 'medium' : 'low'; }

function enrich(ir: TemplateExtractionIR): RichIR {
    const source = ir.sources[0];
    const avg = ir.observations.length ? ir.observations.reduce((sum, obs) => sum + obs.confidence, 0) / ir.observations.length : 0.35;
    return Object.assign(ir, {
        source,
        canvas: source.dimensions,
        confidence: confidenceLabel(avg),
        provenance: ir.observations.map((obs) => obs.provenance.path),
        tokens: {
            colors: Array.from(new Set(ir.observations.flatMap((obs) => obs.colors))),
            fonts: Array.from(new Set(ir.observations.map((obs) => (obs as any).fontFamily).filter(Boolean))),
        },
    }) as RichIR;
}

function parseIR(value: unknown): RichIR { return enrich(TemplateExtractionIRSchema.parse(value)); }

function safeZipEntryName(name: string): void {
    if (name.startsWith('/') || name.includes('..') || name.includes('\\'))
        throw new Error(`Unsafe archive entry/path traversal in PPTX/ZIP entry: ${name}`);
}

function u16(buffer: Buffer, offset: number): number { return buffer.readUInt16LE(offset); }
function u32(buffer: Buffer, offset: number): number { return buffer.readUInt32LE(offset); }

function parseZipEntries(buffer: Buffer): Array<{ name: string; data: Buffer }> {
    let eocd = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--)
        if (u32(buffer, i) === 0x06054b50) {
            eocd = i;
            break;
        }
    if (eocd < 0)
        throw new Error('Corrupt PPTX/ZIP archive: missing central directory');
    const count = u16(buffer, eocd + 10);
    let central = u32(buffer, eocd + 16);
    const entries: Array<{ name: string; data: Buffer }> = [];
    for (let i = 0; i < count; i++) {
        if (u32(buffer, central) !== 0x02014b50)
            throw new Error('Corrupt PPTX/ZIP archive: invalid central directory entry');
        const method = u16(buffer, central + 10);
        const compressedSize = u32(buffer, central + 20);
        const uncompressedSize = u32(buffer, central + 24);
        const nameLength = u16(buffer, central + 28);
        const extraLength = u16(buffer, central + 30);
        const commentLength = u16(buffer, central + 32);
        const localOffset = u32(buffer, central + 42);
        const name = buffer.subarray(central + 46, central + 46 + nameLength).toString('utf-8');
        safeZipEntryName(name);
        central += 46 + nameLength + extraLength + commentLength;
        if (name.endsWith('/'))
            continue;
        if (u32(buffer, localOffset) !== 0x04034b50)
            throw new Error(`Corrupt PPTX/ZIP archive: invalid local header for ${name}`);
        const localNameLength = u16(buffer, localOffset + 26);
        const localExtraLength = u16(buffer, localOffset + 28);
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
        const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : undefined;
        if (!data)
            throw new Error(`Unsupported PPTX/ZIP compression method ${method} for ${name}`);
        if (data.length !== uncompressedSize)
            throw new Error(`Corrupt PPTX/ZIP archive: size mismatch for ${name}`);
        entries.push({ name, data });
    }
    return entries;
}

function parseLocalZipEntries(buffer: Buffer): Array<{ name: string; data: Buffer }> {
    const entries: Array<{ name: string; data: Buffer }> = [];
    let offset = 0;
    while (offset + 30 <= buffer.length && u32(buffer, offset) === 0x04034b50) {
        const method = u16(buffer, offset + 8);
        const compressedSize = u32(buffer, offset + 18);
        const uncompressedSize = u32(buffer, offset + 22);
        const nameLength = u16(buffer, offset + 26);
        const extraLength = u16(buffer, offset + 28);
        const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf-8');
        safeZipEntryName(name);
        const dataOffset = offset + 30 + nameLength + extraLength;
        const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
        const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : undefined;
        if (!data)
            throw new Error(`Unsupported PPTX/ZIP compression method ${method} for ${name}`);
        if (uncompressedSize !== 0 && data.length !== uncompressedSize)
            throw new Error(`Corrupt PPTX/ZIP archive: size mismatch for ${name}`);
        entries.push({ name, data });
        offset = dataOffset + compressedSize;
    }
    if (entries.length === 0)
        throw new Error('Corrupt PPTX/ZIP archive: missing central directory');
    return entries;
}

function readPptxXmlParts(path: string, options?: TemplateAdapterOptions): Map<string, string> {
    const parts = new Map<string, string>();
    if (statSync(path).isDirectory()) {
        const root = resolve(path);
        const stack = [root];
        while (stack.length) {
            const current = stack.pop()!;
            for (const entry of readdirSync(current)) {
                const full = join(current, entry);
                const rel = full.slice(root.length + 1).replace(/\\/g, '/');
                safeZipEntryName(rel);
                if (statSync(full).isDirectory())
                    stack.push(full);
                else if (rel.endsWith('.xml'))
                    parts.set(rel, readFileSync(full, 'utf-8'));
            }
        }
        return parts;
    }
    const buffer = readLimited(path, options?.maxBytes);
    if (buffer.subarray(0, 4).toString('binary') !== 'PK\x03\x04')
        throw new Error(`PPTX input is not a ZIP/OpenXML archive: ${path}`);
    const entries = (() => {
        try {
            return parseZipEntries(buffer);
        } catch (error) {
            if (error instanceof Error && error.message.includes('missing central directory'))
                return parseLocalZipEntries(buffer);
            throw error;
        }
    })();
    for (const entry of entries)
        if (entry.name.endsWith('.xml'))
            parts.set(entry.name, entry.data.toString('utf-8'));
    return parts;
}

function xmlText(value: string): string { return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

function pptxDimensions(parts: Map<string, string>): { width: number; height: number } {
    const match = parts.get('ppt/presentation.xml')?.match(/<p:sldSz[^>]+cx=["'](\d+)["'][^>]+cy=["'](\d+)["']/);
    return match
        ? { width: Math.round((Number(match[1]) / EMU_PER_INCH) * PX_PER_INCH), height: Math.round((Number(match[2]) / EMU_PER_INCH) * PX_PER_INCH) }
        : DEFAULT_CANVAS;
}

function roleFromText(text: string, order: number): string { return order === 0 ? 'title' : /table/i.test(text) ? 'table' : /figure|image|chart/i.test(text) ? 'figure' : 'body'; }

function observation(
    id: string,
    type: string,
    role: string,
    text: string | undefined,
    bbox: { x: number; y: number; width: number; height: number },
    confidence: number,
    provenance: Record<string, unknown>,
    colors: string[] = [],
    warnings: string[] = [],
    fontFamily?: string,
): Record<string, unknown> {
    return { id, type, role, text, bbox, colors, confidence, provenance, warnings, fontFamily, fontSize: role === 'title' ? 44 : 24 };
}

export const pptxTemplateAdapter: TemplateSourceAdapter = {
    format: 'pptx',
    extract(path: string, options?: TemplateAdapterOptions): RichIR {
        const parts = readPptxXmlParts(path, options);
        const id = options?.id ?? sourceId('pptx', path);
        const dimensions = pptxDimensions(parts);
        const slides = Array.from(parts.entries())
            .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (slides.length === 0)
            throw new Error('PPTX archive does not contain slide XML parts');
        const themeColors = colorsFromText(
            Array.from(parts.entries())
                .filter(([name]) => name.includes('theme'))
                .map(([, text]) => text)
                .join('\n'),
        );
        const observations: Record<string, unknown>[] = [];
        const warnings: string[] = [];
        slides.forEach(([entryPath, xml], slideIndex) => {
            const texts = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/gs))
                .map((match) => xmlText(match[1].trim()))
                .filter(Boolean);
            if (!texts.length)
                warnings.push(`No text found in ${entryPath}`);
            texts.forEach((text, order) =>
                observations.push(
                    observation(
                        `${id}-slide-${slideIndex + 1}-text-${order + 1}`,
                        'text',
                        roleFromText(text, order),
                        text,
                        clampBbox(
                            {
                                x: dimensions.width * 0.08,
                                y: order === 0 ? dimensions.height * 0.08 : dimensions.height * (0.24 + order * 0.13),
                                width: dimensions.width * 0.84,
                                height: order === 0 ? 72 : 48,
                            },
                            dimensions,
                        ),
                        0.82,
                        { sourceId: id, format: 'pptx', path: entryPath, slideIndex, adapter: 'pptx-openxml-lite' },
                        [...new Set([...themeColors, ...colorsFromText(xml)])],
                    ),
                ),
            );
        });
        return parseIR({ id, createdAt: now(), sources: [{ id, format: 'pptx', path, dimensions, slideCount: slides.length, warnings }], observations, warnings });
    },
};

function stripTags(input: string): string {
    return input
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export const htmlTemplateAdapter: TemplateSourceAdapter = {
    format: 'html',
    extract(path: string, options?: TemplateAdapterOptions): RichIR {
        const html = readLimited(path, options?.maxBytes).toString('utf-8');
        const id = options?.id ?? sourceId('html', path);
        const warnings: string[] = [];
        if (/<script\b/i.test(html))
            warnings.push('HTML scripts were ignored and not executed.');
        if (/\b(?:src|href)=["']https?:\/\//i.test(html))
            warnings.push('External network resources were detected but not fetched.');
        const styleText = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
            .map((m) => m[1])
            .join('\n');
        const colors = colorsFromText(`${styleText}\n${html}`);
        const fontFamily = styleText.match(/font-family\s*:\s*([^;}{]+)/i)?.[1].replace(/["']/g, '').trim();
        const observations: Record<string, unknown>[] = [];
        let order = 0;
        for (const match of html.matchAll(/<(h1|h2|h3|p|li|section|article|div|figure|table)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
            const tag = match[1].toLowerCase();
            const text = stripTags(match[3]);
            if (!text && !['figure', 'table'].includes(tag))
                continue;
            const role = tag === 'h1' || (tag === 'h2' && order === 0) ? 'title' : tag === 'figure' ? 'figure' : tag === 'table' ? 'table' : 'body';
            const type = tag === 'table' ? 'table' : tag === 'figure' ? 'image' : 'text';
            observations.push(
                observation(
                    `${id}-node-${order + 1}`,
                    type,
                    role,
                    text || role,
                    clampBbox({ x: 96, y: order === 0 ? 64 : 160 + order * 84, width: 1088, height: role === 'title' ? 80 : 64 }, DEFAULT_CANVAS),
                    0.78,
                    { sourceId: id, format: 'html', path, selector: tag, pageIndex: 0, adapter: 'html-static-lite' },
                    colors,
                    [],
                    fontFamily,
                ),
            );
            order++;
        }
        if (!observations.length)
            warnings.push('No visible text/regions found in static HTML.');
        return parseIR({ id, createdAt: now(), sources: [{ id, format: 'html', path, dimensions: DEFAULT_CANVAS, pageCount: 1, warnings }], observations, warnings });
    },
};

export const pdfTemplateAdapter: TemplateSourceAdapter = {
    format: 'pdf',
    extract(path: string, options?: TemplateAdapterOptions): RichIR {
        const raw = readLimited(path, Math.min(options?.maxBytes ?? 12 * 1024 * 1024, 12 * 1024 * 1024)).toString('latin1');
        if (!raw.startsWith('%PDF'))
            throw new Error(`PDF input is corrupt or missing %PDF header: ${path}`);
        if (/\/Encrypt\b/.test(raw))
            throw new Error('Encrypted/password-protected PDF inputs are unsupported.');
        const id = options?.id ?? sourceId('pdf', path);
        const media = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/);
        const dimensions = media ? { width: Number(media[1]), height: Number(media[2]) } : { width: 612, height: 792 };
        const observations: Record<string, unknown>[] = [];
        let order = 0;
        for (const match of raw.matchAll(/\(([^()]{2,200})\)\s*Tj/g)) {
            const text = match[1].replace(/\\([()\\])/g, '$1').trim();
            if (text)
                observations.push(
                    observation(
                        `${id}-text-${++order}`,
                        'text',
                        order === 1 ? 'title' : 'body',
                        text,
                        clampBbox(
                            {
                                x: dimensions.width * 0.12,
                                y: dimensions.height * (0.12 + order * 0.1),
                                width: dimensions.width * 0.76,
                                height: order === 1 ? 44 : 32,
                            },
                            dimensions,
                        ),
                        0.52,
                        { sourceId: id, format: 'pdf', path, pageIndex: 0, adapter: 'pdf-lite' },
                        [],
                        ['PDF semantic extraction is lower confidence in v1.'],
                    ),
                );
        }
        if (!observations.length)
            observations.push(
                observation(
                    `${id}-region-1`,
                    'region',
                    'visual-region',
                    undefined,
                    clampBbox(
                        { x: dimensions.width * 0.1, y: dimensions.height * 0.1, width: dimensions.width * 0.8, height: dimensions.height * 0.8 },
                        dimensions,
                    ),
                    0.35,
                    { sourceId: id, format: 'pdf', path, pageIndex: 0, adapter: 'pdf-lite' },
                    [],
                    ['PDF produced visual-only fallback region.'],
                ),
            );
        const warnings = ['PDF extraction is lower confidence and does not guarantee semantic slot recovery.'];
        return parseIR({
            id,
            createdAt: now(),
            sources: [{ id, format: 'pdf', path, dimensions, pageCount: Math.max(1, (raw.match(/\/Type\s*\/Page\b/g) ?? []).length), warnings }],
            observations,
            warnings,
        });
    },
};

function pngDimensions(path: string, options?: TemplateAdapterOptions): { width: number; height: number } {
    const buffer = readLimited(path, Math.min(options?.maxBytes ?? 8 * 1024 * 1024, 8 * 1024 * 1024));
    if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        throw new Error(`Malformed PNG input: ${path}`);
    if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR')
        throw new Error(`Malformed PNG input: ${path}`);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export const pngTemplateAdapter: TemplateSourceAdapter = {
    format: 'png',
    extract(path: string, options?: TemplateAdapterOptions): RichIR {
        const dimensions = pngDimensions(path, options);
        const id = options?.id ?? sourceId('png', path);
        const warnings = ['PNG is extraction input only and visual-only in v1; no semantic slot guarantee.'];
        const observations = [
            observation(
                `${id}-region-1`,
                'region',
                'visual-region',
                undefined,
                clampBbox(
                    { x: dimensions.width * 0.08, y: dimensions.height * 0.08, width: dimensions.width * 0.84, height: dimensions.height * 0.84 },
                    dimensions,
                ),
                0.42,
                { sourceId: id, format: 'png', path, pageIndex: 0, adapter: 'png-lite' },
                ['#1a2c4e'],
                warnings,
            ),
        ];
        return parseIR({ id, createdAt: now(), sources: [{ id, format: 'png', path, dimensions, pageCount: 1, warnings }], observations, warnings });
    },
};

export const templateAdapters: Record<TemplateSourceFormat, TemplateSourceAdapter> = {
    pptx: pptxTemplateAdapter,
    html: htmlTemplateAdapter,
    pdf: pdfTemplateAdapter,
    png: pngTemplateAdapter,
};

export function extractTemplateIR(inputPath: string, options?: TemplateAdapterOptions): RichIR {
    return templateAdapters[formatFromPath(inputPath)].extract(inputPath, options) as RichIR;
}

export function extractTemplateIr(inputPaths: string | string[], options?: TemplateAdapterOptions): RichIR[] {
    return (Array.isArray(inputPaths) ? inputPaths : [inputPaths]).map((path, index) =>
        extractTemplateIR(path, { ...options, id: options?.id ? `${options.id}-${index + 1}` : undefined }),
    );
}

export function extractTemplateIRFromSources(inputPaths: string[], options?: TemplateAdapterOptions): RichIR {
    return enrich(mergeExtractionIR(options?.id ?? 'extracted-template-ir', extractTemplateIr(inputPaths, options)));
}
