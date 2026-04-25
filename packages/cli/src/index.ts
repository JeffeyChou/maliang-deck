#!/usr/bin/env node
import { program } from 'commander';
import { runServe } from './serve.js';
import { runExport } from './export.js';
import { runValidate } from './validate.js';
import { registerWorkflowCommand } from './commands/workflow.js';
import { registerTemplateCommand } from './commands/template.js';

program
  .name('maliang-deck')
  .description('Maliang Deck — presentation deck toolchain')
  .version('0.1.0');

program
  .command('serve <file>')
  .description('Start a dev server to preview the deck')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .action(async (file: string, opts: { port: string }) => {
    const port = parseInt(opts.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(`Error: invalid port "${opts.port}"`);
      process.exit(1);
    }
    await runServe(file, port);
  });

program
  .command('export <file> <output>')
  .description('Export the deck to PPTX')
  .option('--pptx-engine <engine>', 'PPTX engine: drawingml (default) or pptxgenjs')
  .action(async (file: string, output: string, opts: { pptxEngine?: string }) => {
    await runExport(file, output, { pptxEngine: opts.pptxEngine });
  });

registerWorkflowCommand(program);
registerTemplateCommand(program);

program
  .command('validate <file>')
  .description('Validate a deck JSON file against the schema')
  .action(async (file: string) => {
    await runValidate(file);
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
