import type { Deck, Element as SchemaElement } from '@maliang-deck/schema';

export type PptxGenJsChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export type PptxGenJsChartSeries = {
  name?: string;
  labels: Array<string | number>;
  values: number[];
};

export type PptxGenJsTablePrimitiveCell = string | number | boolean | null;

export type PptxGenJsTableObjectCell = {
  text: string;
  options?: Record<string, unknown>;
};

export type PptxGenJsTableCellInput = PptxGenJsTablePrimitiveCell | PptxGenJsTableObjectCell;

export type PptxGenJsBaseElement = {
  type: string;
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
};

export type PptxGenJsChartElement = PptxGenJsBaseElement & {
  type: 'chart';
  width: number;
  height: number;
  chartType: PptxGenJsChartType;
  data: PptxGenJsChartSeries[];
  options?: Record<string, unknown>;
};

export type PptxGenJsTableElement = PptxGenJsBaseElement & {
  type: 'table';
  width: number;
  height?: number;
  rows: PptxGenJsTableCellInput[][];
  options?: Record<string, unknown>;
};

export type PptxGenJsGroupElement = Omit<PptxGenJsBaseElement, 'type'> & {
  type: 'group';
  elements: PptxGenJsRenderableElement[];
  transform?: string;
};

export type PptxGenJsRenderableElement =
  | SchemaElement
  | PptxGenJsChartElement
  | PptxGenJsTableElement
  | PptxGenJsGroupElement;

export type PptxGenJsExportWarning = {
  code: string;
  message: string;
  detail?: unknown;
};

export type PptxGenJsExportRequest = {
  deck: Deck;
  outputPath: string;
  basePath?: string;
};

export type PptxGenJsExportResult = {
  format: 'pptx';
  outputPath: string;
  success: boolean;
  warnings: PptxGenJsExportWarning[];
  error?: string;
};
