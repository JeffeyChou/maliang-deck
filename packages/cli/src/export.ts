import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportDeckAsync, exportDeckToHtml, type ExportFormat } from '@maliang-deck/exporter';
import type { HtmlExportMode } from '@maliang-deck/renderer-html';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

export type RunExportOptions = {
  format?: string;
  htmlMode?: string;
};

function inferFormat(output: string, explicit?: string): ExportFormat {
  if (explicit === 'html') return 'html';
  if (explicit === 'pdf') return 'pdf';
  if (explicit === 'pptx') return 'pptx';
  const ext = output.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'html' || ext === 'htm') return 'html';
  return 'pptx';
}

function parseHtmlMode(mode?: string): HtmlExportMode {
  if (mode === 'editable') return 'editable';
  return 'readonly';
}

export async function runExport(file: string, output: string, options: RunExportOptions = {}): Promise<void> {
  const deckPath = resolve(file);
  const outputPath = resolve(output);
  const format = inferFormat(outputPath, options.format);

  if (format === 'html') {
    const mode = parseHtmlMode(options.htmlMode);
    const result = exportDeckToHtml({
      deckPath,
      outputDir: outputPath,
      mode,
      repoRoot: REPO_ROOT,
    });
    if (!result.success) {
      console.error(`Export failed: ${result.error ?? 'unknown error'}`);
      process.exitCode = 1;
      return;
    }
    for (const warning of result.warnings) {
      console.warn(`Warning [${warning.code}]: ${warning.message}`);
    }
    console.log(`Exported HTML (${mode}) → ${result.outputPath}`);
    return;
  }

  const result = await exportDeckAsync({
    deckPath,
    outputPath,
    format,
  });
  if (!result.success) {
    console.error(`Export failed: ${result.error ?? 'unknown error'}`);
    process.exitCode = 1;
    return;
  }
  for (const warning of result.warnings) {
    console.warn(`Warning [${warning.code}]: ${warning.message}`);
  }
  console.log(`Exported ${format.toUpperCase()} → ${result.outputPath}`);
}
