export type {
  TextBoxInput,
  TextBox,
  LayoutResult,
  LayoutWarning,
  FontRegistryOptions,
} from './types.js';

export { FontRegistry, defaultRegistry } from './font-registry.js';
export type { ResolvedFont } from './font-registry.js';

export { measureLine, measureLineHeight } from './fontkit-measurer.js';

export {
  estimateTextWidthHeuristic,
  estimateLineHeightHeuristic,
} from './heuristic-measurer.js';

export { layoutTextBox } from './layout.js';

export {
  reflowSlide,
  reflowDeck,
  toTextBoxInput,
} from './reflow.js';
export type { ReflowOptions, Adjustment, ReflowResult, ReflowReport } from './reflow.js';
