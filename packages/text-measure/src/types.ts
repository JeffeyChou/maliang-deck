export interface TextBoxInput {
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  lineHeight: number;
}

export interface TextBox {
  width: number;
  height?: number;
}

export interface LayoutResult {
  lines: string[];
  lineWidths: number[];
  totalHeight: number;
  overflow: boolean;
  overflowAmount: number;
  measurementSource: 'fontkit' | 'heuristic';
  warnings: LayoutWarning[];
}

export interface LayoutWarning {
  type: 'overflow' | 'font-fallback' | 'missing-glyph' | 'unsupported-feature' | 'chart-degraded' | 'layout-flattened' | 'layout-overflow' | 'layout-unsupported-child' | 'renderer-unsupported-element';
  message: string;
  slideIndex?: number;
  elementId?: string;
  path?: string;
  phase?: string;
  policy?: string;
  detail?: unknown;
}

export interface FontRegistryOptions {
  deckFonts?: Record<string, string>;
  projectFonts?: Record<string, string>;
  cliFonts?: Record<string, string>;
}
