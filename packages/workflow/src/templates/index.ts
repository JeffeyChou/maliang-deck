import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeJson } from '../fs-utils.js';
import { extractTemplateIr } from './adapters.js';
import { proposeCoverageThresholds } from './coverage.js';
import { inferTemplatePack } from './inference.js';
import { writeTemplateSampleProject } from './sample.js';
import type { TemplatePack } from './contracts.js';

export * from './contracts.js';
export * from './ir.js';
export * from './coverage.js';
export * from './adapters.js';
export * from './inference.js';
export * from './compiler.js';
export * from './compile.js';
export * from './registry.js';
export * from './sample.js';
export { writeTemplateExtraction, type TemplateExtractionResult } from './extract.js';

export type ExtractTemplatePackResult = TemplatePack & {
    pack: TemplatePack;
    irs: ReturnType<typeof extractTemplateIr>;
    ir: ReturnType<typeof extractTemplateIr>;
    coverage: TemplatePack['coverage'];
    thresholds: ReturnType<typeof proposeCoverageThresholds>;
    files?: {
        ir: string;
        pack: string;
        coverage: string;
        thresholds: string;
        sampleDeck?: string;
    };
    sample?: ReturnType<typeof writeTemplateSampleProject>;
};

export function extractTemplatePack(
    inputs: string[],
    outDirOrOptions:
        | string
        | {
              id?: string;
              outDir?: string;
              name?: string;
              version?: string;
              now?: Date;
              writeSample?: boolean;
          } = {},
    maybeOptions: {
        id?: string;
        name?: string;
        version?: string;
        now?: Date;
        writeSample?: boolean;
    } = {},
): ExtractTemplatePackResult {
    if (inputs.length === 0)
        throw new Error('At least one template input is required');
    const outDir = typeof outDirOrOptions === 'string' ? outDirOrOptions : outDirOrOptions.outDir;
    const options = typeof outDirOrOptions === 'string' ? maybeOptions : outDirOrOptions;
    const irs = extractTemplateIr(inputs, { id: options.id });
    let pack = inferTemplatePack(irs, { id: options.id, name: options.name, version: options.version });
    let sampleDeck: string | undefined;
    let sample: ReturnType<typeof writeTemplateSampleProject> | undefined;
    if (outDir) {
        mkdirSync(outDir, { recursive: true });
        if (options.writeSample ?? true) {
            sample = writeTemplateSampleProject(pack, join(outDir, 'sample'));
            sampleDeck = sample.deckPath;
            pack = {
                ...pack,
                coverage: { ...pack.coverage, sampleDeck: sample.coverageSample } as NonNullable<TemplatePack['coverage']>,
                sampleDeck: { path: sample.deckPath, warnings: sample.warnings },
            };
        }
        const thresholds = proposeCoverageThresholds(pack);
        const files = {
            ir: join(outDir, 'ir.json'),
            pack: join(outDir, 'template-pack.json'),
            coverage: join(outDir, 'coverage-report.json'),
            thresholds: join(outDir, 'coverage-thresholds.proposed.json'),
            sampleDeck,
        };
        writeJson(files.pack, pack);
        writeJson(files.coverage, pack.coverage);
        writeJson(files.thresholds, thresholds);
        writeJson(files.ir, irs);
        return { ...pack, pack, irs, ir: irs, coverage: pack.coverage, thresholds, files, sample };
    }
    const thresholds = proposeCoverageThresholds(pack);
    return { ...pack, pack, irs, ir: irs, coverage: pack.coverage, thresholds };
}
