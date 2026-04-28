import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TemplatePackSchema } from './contracts.js';
import type { TemplatePack } from './contracts.js';

export type BuiltInTemplateManifestEntry = {
    id: string;
    dir: string;
    pack: string;
};

export type BuiltInTemplatePackRecord = {
    id: string;
    ownerDir: string;
    packPath: string;
    pack: TemplatePack;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '../../../..');
const manifestPath = resolve(repoRoot, 'assets', 'templates', 'manifest.json');

let manifestCache: { templates: BuiltInTemplateManifestEntry[] } | undefined;
let recordsCache: BuiltInTemplatePackRecord[] | undefined;

function readManifest(): { templates: BuiltInTemplateManifestEntry[] } {
    if (manifestCache)
        return manifestCache;
    if (!existsSync(manifestPath)) {
        manifestCache = { templates: [] };
        return manifestCache;
    }
    const value = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    if (
        typeof value !== 'object' ||
        value === null ||
        !Array.isArray(value.templates)
    ) {
        throw new Error(`Invalid built-in template manifest: ${manifestPath}`);
    }
    manifestCache = value as { templates: BuiltInTemplateManifestEntry[] };
    return manifestCache;
}

export function listBuiltInTemplateManifestEntries(): BuiltInTemplateManifestEntry[] {
    return [...readManifest().templates];
}

export function listBuiltInTemplateIds(): string[] {
    return listBuiltInTemplateManifestEntries().map((entry) => entry.id);
}

export function isBuiltInTemplateId(id: string): boolean {
    return listBuiltInTemplateIds().includes(id);
}

export function listBuiltInTemplatePackRecords(): BuiltInTemplatePackRecord[] {
    if (recordsCache)
        return recordsCache.map((record) => ({ ...record }));
    recordsCache = listBuiltInTemplateManifestEntries().map((entry) => {
        const ownerDir = resolve(repoRoot, 'assets', 'templates', entry.dir);
        const packPath = resolve(ownerDir, entry.pack);
        const pack = TemplatePackSchema.parse(JSON.parse(readFileSync(packPath, 'utf-8')));
        if (pack.id !== entry.id) {
            throw new Error(`Built-in template manifest id mismatch: ${entry.id} points to ${pack.id}`);
        }
        return { id: entry.id, ownerDir, packPath, pack };
    });
    return recordsCache.map((record) => ({ ...record }));
}

export function listBuiltInTemplatePacks(): TemplatePack[] {
    return listBuiltInTemplatePackRecords().map((record) => record.pack);
}

export function getBuiltInTemplatePackRecord(id: string): BuiltInTemplatePackRecord | undefined {
    return listBuiltInTemplatePackRecords().find((record) => record.id === id);
}
