import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractTemplateIr } from './adapters.js';
import { proposeCoverageThresholds } from './coverage.js';
import { inferTemplatePack } from './inference.js';
import { writeTemplateSampleProject } from './sample.js';
import type { TemplateCoverageReport, TemplateCoverageThresholdProposal, TemplateExtractionIR, TemplatePack } from './contracts.js';

export type TemplateExtractionResult = {
    pack: TemplatePack;
    ir: TemplateExtractionIR[];
    irs: TemplateExtractionIR[];
    coverage: TemplateCoverageReport;
    thresholds: TemplateCoverageThresholdProposal;
};

export function extractTemplatePack(
    paths: string[],
    options: {
        id: string;
        name?: string;
        version?: string;
        description?: string;
        sampleOutDir?: string;
    },
): TemplateExtractionResult {
    const irs = extractTemplateIr(paths, { id: options.id });
    let pack = inferTemplatePack(irs, { id: options.id, name: options.name, version: options.version });
    if (options.description)
        pack = { ...pack, description: options.description };
    if (options.sampleOutDir) {
        const sample = writeTemplateSampleProject(pack, options.sampleOutDir);
        pack = {
            ...pack,
            coverage: { ...pack.coverage, sampleDeck: sample.coverageSample } as NonNullable<TemplatePack['coverage']>,
            sampleDeck: { path: sample.deckPath, warnings: sample.warnings },
        };
    }
    return { pack, ir: irs, irs, coverage: pack.coverage as NonNullable<TemplatePack['coverage']>, thresholds: proposeCoverageThresholds(pack) };
}

export function writeTemplateExtraction(
    paths: string[],
    outDir: string,
    options: {
        id: string;
        name?: string;
        version?: string;
        description?: string;
    },
): TemplateExtractionResult {
    mkdirSync(outDir, { recursive: true });
    const result = extractTemplatePack(paths, { ...options, sampleOutDir: join(outDir, 'sample') });
    writeFileSync(join(outDir, 'template-pack.json'), `${JSON.stringify(result.pack, null, 2)}\n`, 'utf8');
    writeFileSync(join(outDir, 'extraction-ir.json'), `${JSON.stringify(result.ir, null, 2)}\n`, 'utf8');
    writeFileSync(join(outDir, 'coverage-report.json'), `${JSON.stringify(result.coverage, null, 2)}\n`, 'utf8');
    writeFileSync(join(outDir, 'coverage-thresholds.proposed.json'), `${JSON.stringify(result.thresholds, null, 2)}\n`, 'utf8');
    return result;
}
