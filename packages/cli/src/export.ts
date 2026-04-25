import { resolve } from 'node:path';
import { exportDeckAsync, type ExportFormat, type PptxEngine } from '@maliang-deck/exporter';

export type RunExportOptions = {
  pptxEngine?: string;
};

function inferFormat(output: string): ExportFormat {
  const ext = output.toLowerCase().split('.').pop();
  return ext === 'pdf' ? 'pdf' : 'pptx';
}

export function parsePptxEngine(engine?: string): PptxEngine | undefined {
  if (engine == null) return undefined;
  if (engine === 'drawingml' || engine === 'pptxgenjs') return engine;
  throw new Error(`invalid PPTX engine "${engine}" (expected "drawingml" or "pptxgenjs")`);
}

export async function runExport(file: string, output: string, options: RunExportOptions = {}): Promise<void> {
  const deckPath = resolve(file);
  const outputPath = resolve(output);
  const format = inferFormat(outputPath);
  const result = await exportDeckAsync({
    deckPath,
    outputPath,
    format,
    pptxEngine: parsePptxEngine(options.pptxEngine),
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
