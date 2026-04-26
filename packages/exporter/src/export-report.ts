export type ExportFormat = 'pdf' | 'pptx' | 'html';

export type ExportWarning = {
  code: string;
  message: string;
  detail?: unknown;
};

export type ExportDeckResult = {
  format: ExportFormat;
  outputPath: string;
  success: boolean;
  warnings: ExportWarning[];
  error?: string;
};

export type ExportReport = {
  requestedFormats: ExportFormat[];
  producedArtifacts: Record<string, string>;
  results: ExportDeckResult[];
  warnings: ExportWarning[];
  createdAt: string;
};

export function createExportReport(results: ExportDeckResult[]): ExportReport {
  const producedArtifacts: Record<string, string> = {};
  const warnings: ExportWarning[] = [];
  for (const result of results) {
    if (result.success) producedArtifacts[result.format] = result.outputPath;
    warnings.push(...result.warnings);
  }
  return {
    requestedFormats: results.map((result) => result.format),
    producedArtifacts,
    results,
    warnings,
    createdAt: new Date().toISOString(),
  };
}
