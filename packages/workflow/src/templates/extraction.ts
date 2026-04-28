import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { proposeCoverageThresholds } from './coverage.js';
import { extractTemplateIR } from './adapters.js';
import { inferTemplatePack } from './inference.js';
import { writeTemplateSampleProject } from './sample.js';
import type { TemplateExtractionIR, TemplatePack } from './contracts.js';

export type ExtractTemplateOptions = {
    id: string;
    outDir: string;
    name?: string;
    version?: string;
    now?: Date;
    writeSample?: boolean;
};

export type ExtractTemplateResult = {
    irs: TemplateExtractionIR[];
    pack: TemplatePack;
    files: {
        ir: string;
        pack: string;
        coverage: string;
        thresholds: string;
        sampleDeck?: string;
    };
    warnings: string[];
};

export async function extractTemplatePackToFiles(
    inputPaths: string[],
    options: ExtractTemplateOptions,
): Promise<ExtractTemplateResult> {
    if (inputPaths.length === 0)
        throw new Error('template extract requires at least one input');
    mkdirSync(options.outDir, { recursive: true });
    const irs = inputPaths.map((inputPath, index) =>
        extractTemplateIR(inputPath, { id: `${options.id}-source-${index + 1}` }),
    );
    let pack = inferTemplatePack(irs, { id: options.id, name: options.name, version: options.version });
    const warnings = [...(pack.coverage?.warnings ?? [])];
    let sampleDeck: string | undefined;
    if (options.writeSample ?? true) {
        const sample = writeTemplateSampleProject(pack, join(options.outDir, 'sample-project'));
        sampleDeck = sample.deckPath;
        pack = { ...pack, coverage: { ...pack.coverage, sampleDeck: sample.coverageSample } as TemplatePack['coverage'] & NonNullable<TemplatePack['coverage']>, sampleDeck: { path: sample.deckPath, warnings: sample.warnings } };
        warnings.push(...sample.warnings);
    }
    const files = {
        ir: join(options.outDir, 'template-ir.json'),
        pack: join(options.outDir, 'template-pack.json'),
        coverage: join(options.outDir, 'coverage-report.json'),
        thresholds: join(options.outDir, 'coverage-thresholds.proposed.json'),
        sampleDeck,
    };
    writeFileSync(files.ir, `${JSON.stringify(irs.length === 1 ? irs[0] : irs, null, 2)}\n`, 'utf8');
    writeFileSync(files.pack, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
    writeFileSync(files.coverage, `${JSON.stringify(pack.coverage ?? {}, null, 2)}\n`, 'utf8');
    writeFileSync(files.thresholds, `${JSON.stringify(proposeCoverageThresholds(pack), null, 2)}\n`, 'utf8');
    return { irs, pack, files, warnings };
}
