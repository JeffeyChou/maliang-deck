export { exportDeck, exportDeckAsync } from './export-deck.js';
export { exportDeckToHtml } from './export-html.js';
export type { ExportHtmlRequest } from './export-html.js';
export type {
  ExportDeckAsyncDependencies,
  ExportDeckDependencies,
  ExportDeckRequest,
  PptxEngine,
  PptxgenjsExportAsyncHandler,
  PptxgenjsExportHandler,
  PptxgenjsExportRequest,
} from './export-deck.js';
export { createExportReport } from './export-report.js';
export type { ExportDeckResult, ExportFormat, ExportReport, ExportWarning } from './export-report.js';
export {
  PPTX_ANIMATION_MAPPINGS,
  assessPptxAnimationPlan,
  classifyPptxAnimationSupport,
  createPptxAnimationPlan,
  generatePptxAnimationPlan,
} from './pptx-animation.js';
export type {
  PptxAnimationCapabilityReport,
  PptxAnimationItem,
  PptxAnimationPlan,
  PptxAnimationStep,
} from './pptx-animation.js';
