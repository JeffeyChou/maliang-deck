import { Command } from 'commander';
import {
  extractTemplatePack,
  listAvailableTemplateStyles,
  loadTemplatePackFile,
  normalizeTemplatePack,
  registerTemplatePackFile,
  TemplatePackLiteSchema,
  validateTemplatePack,
  writeTemplateSampleProject,
} from '@maliang-deck/workflow';
import { readFileSync } from 'node:fs';

export function registerTemplateCommand(program: Command): void {
  const template = program.command('template').description('Extract, validate, sample, and list reusable template packs');

  template
    .command('extract <input...>')
    .description('Extract a draft template pack from PPTX, HTML, PDF, or PNG inputs')
    .requiredOption('--out <dir>', 'Output directory for template-pack.json and coverage artifacts')
    .option('--id <id>', 'Template pack id')
    .action((inputs: string[], opts: { out: string; id?: string }) => {
      const pack = extractTemplatePack(inputs, opts.out, { id: opts.id });
      console.log(`Template pack: ${opts.out}/template-pack.json (${pack.activation.status})`);
      console.log(`Coverage report: ${opts.out}/coverage-report.json`);
      console.log('Threshold proposal: coverage-thresholds.proposed.json (advisory only; not enforced until approved)');
      if (pack.warnings.length) console.warn(`Warnings: ${pack.warnings.join('; ')}`);
    });

  template
    .command('validate <templatePack>')
    .description('Validate a template-pack.json file')
    .action((templatePack: string) => {
      const raw: unknown = JSON.parse(readFileSync(templatePack, 'utf-8'));
      const fullResult = TemplatePackLiteSchema.safeParse(raw);
      if (fullResult.success) {
        // Try full schema first; if it passes great, otherwise check lite
        try {
          const pack = validateTemplatePack(raw);
          console.log(`Template pack valid: ${pack.id}@${pack.version} (${pack.activation.status})`);
          if (pack.activation.status !== 'approved') console.warn('Draft/deprecated packs are not generation-active by default.');
        } catch {
          // Full schema failed but lite passed — report as valid lite template
          const lite = fullResult.data;
          const normalized = normalizeTemplatePack(lite);
          console.log(`Template pack valid (lite): ${normalized.id}@${normalized.version} (hand-crafted; audit fields filled with defaults)`);
          if ((normalized.activation.status as string) !== 'approved') console.warn('Draft/deprecated packs are not generation-active by default.');
        }
      } else {
        // Neither schema passes — try full schema for its detailed error message
        validateTemplatePack(raw);
      }
    });

  template
    .command('sample <templatePack>')
    .description('Generate a sample project from a template pack through ordinary JSON DSL')
    .requiredOption('--out <project>', 'Output project directory')
    .action((templatePack: string, opts: { out: string }) => {
      const pack = loadTemplatePackFile(templatePack);
      const result = writeTemplateSampleProject(pack, opts.out);
      console.log(`Sample deck: ${result.deckPath}`);
      console.log(`Sample HTML: ${result.htmlPath}`);
      console.log('Sample uses standard Maliang Deck JSON DSL; renderers remain template-unaware.');
      if (result.warnings.length) console.warn(`Warnings: ${result.warnings.join('; ')}`);
    });

  template
    .command('list')
    .description('List built-in styles and registered file-backed template styles')
    .option('--include-drafts', 'Include draft template packs when loading files')
    .option('--template-pack <paths...>', 'Template pack files to load before listing')
    .action((opts: { includeDrafts?: boolean; templatePack?: string[] }) => {
      for (const packPath of opts.templatePack ?? []) registerTemplatePackFile(packPath, { includeDrafts: Boolean(opts.includeDrafts) });
      for (const style of listAvailableTemplateStyles({ includeDrafts: Boolean(opts.includeDrafts) })) {
        console.log(`${style.id}\t${style.version}\t${style.name}`);
      }
    });
}
