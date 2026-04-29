/**
 * Public API for the agent guidance system.
 *
 * Exports types, style registry, and work-order enricher.
 * Style definitions (academic, consulting) are registered on module load.
 */
export { registerStyle, getStyle, listStyles } from './style-registry.js';
export { enrichOutlineWorkOrder, enrichDeckPlanWorkOrder, enrichDslWorkOrder } from './work-order-enricher.js';
export { validateConsistency } from './consistency-validator.js';
export { academicStyle } from './styles/academic.js';
export { consultingStyle } from './styles/consulting.js';
export { lintSlide, lintDeck, builtInRules } from './lint-rules.js';
export type { ElementBounds, LintContext } from './lint-rules.js';
export { isValidDslPath, listValidDslPaths, VALID_DSL_PATHS } from './schema-paths.js';
export { lintRoleDocFile, lintRoleDocs } from './role-doc-linter.js';

// Auto-register built-in styles on module load
import { registerStyle } from './style-registry.js';
import { academicStyle } from './styles/academic.js';
import { consultingStyle } from './styles/consulting.js';
registerStyle(academicStyle);
registerStyle(consultingStyle);
