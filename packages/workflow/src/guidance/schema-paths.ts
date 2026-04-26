/**
 * Extract valid DSL field path strings from @maliang-deck/schema Zod definitions.
 *
 * These paths are used by the role-doc linter to validate that
 * `dslFieldReferences` in role doc YAML frontmatter point to real schema fields.
 *
 * Path notation used in role docs:
 *   meta.title
 *   meta.canvas.width
 *   slides[].id
 *   slides[].elements[].type
 *   slides[].elements[].x
 *   slides[].elements[].text   (shorthand for content on TextElement)
 *   slides[].elements[].style  (shorthand for style-related fields)
 */

/**
 * The canonical set of valid DSL field path strings.
 *
 * These are derived from @maliang-deck/schema (DeckSchema, SlideSchema, ElementSchema)
 * and expressed using the dot/bracket-index notation used in role doc frontmatter.
 *
 * When adding a new field to @maliang-deck/schema, add the corresponding path here.
 */
export const VALID_DSL_PATHS: ReadonlySet<string> = new Set([
  // ── Deck meta ──────────────────────────────────────────────────────────────
  'meta.title',
  'meta.theme',
  'meta.canvas',
  'meta.canvas.width',
  'meta.canvas.height',
  'meta.fonts',
  'meta.htmlRuntime',
  'meta.htmlRuntime.transition',
  'meta.htmlRuntime.transition.type',
  'meta.htmlRuntime.transition.durationMs',

  // ── Slide top-level ────────────────────────────────────────────────────────
  'slides[].id',
  'slides[].background',
  'slides[].layout',
  'slides[].elements',
  'slides[].notes',
  'slides[].fx',

  // ── Base element fields (shared by all element types) ─────────────────────
  'slides[].elements[].id',
  'slides[].elements[].type',
  'slides[].elements[].x',
  'slides[].elements[].y',
  'slides[].elements[].width',
  'slides[].elements[].height',
  'slides[].elements[].rotation',
  'slides[].elements[].opacity',
  'slides[].elements[].animation',

  // ── Text element ──────────────────────────────────────────────────────────
  'slides[].elements[].content',
  // 'text' is the shorthand alias used in role docs for 'content' on text elements
  'slides[].elements[].text',
  'slides[].elements[].fontSize',
  'slides[].elements[].fontFamily',
  'slides[].elements[].fontWeight',
  'slides[].elements[].fontStyle',
  'slides[].elements[].color',
  'slides[].elements[].align',
  'slides[].elements[].verticalAlign',
  'slides[].elements[].lineHeight',
  'slides[].elements[].textRole',

  // ── Style shorthand (role docs refer to visual styling collectively) ───────
  'slides[].elements[].style',

  // ── Rect element ──────────────────────────────────────────────────────────
  'slides[].elements[].fill',
  'slides[].elements[].stroke',
  'slides[].elements[].strokeWidth',
  'slides[].elements[].radius',

  // ── Circle / Ellipse ──────────────────────────────────────────────────────
  // (radius, fill, stroke, strokeWidth already covered above)

  // ── Line element ──────────────────────────────────────────────────────────
  'slides[].elements[].x2',
  'slides[].elements[].y2',
  'slides[].elements[].strokeDasharray',

  // ── Path element ──────────────────────────────────────────────────────────
  'slides[].elements[].d',

  // ── Polygon element ───────────────────────────────────────────────────────
  'slides[].elements[].points',

  // ── Image element ─────────────────────────────────────────────────────────
  'slides[].elements[].src',
  'slides[].elements[].fit',
  'slides[].elements[].alt',

  // ── Chart element ─────────────────────────────────────────────────────────
  'slides[].elements[].chartType',
  'slides[].elements[].data',
  'slides[].elements[].options',
  'slides[].elements[].style.palette',
  'slides[].elements[].style.axisColor',
  'slides[].elements[].style.gridColor',
  'slides[].elements[].style.labelColor',
  'slides[].elements[].style.backgroundColor',
  'slides[].elements[].style.strokeWidth',
  'slides[].elements[].style.showLegend',
  'slides[].elements[].style.showDataLabels',
  'slides[].elements[].style.legendPosition',
  'slides[].elements[].style.gridLines',
  'slides[].elements[].style.rounded',
  'slides[].elements[].style.areaFill',

  // ── Table element ─────────────────────────────────────────────────────────
  'slides[].elements[].rows',
  'slides[].elements[].style.headerBackground',
  'slides[].elements[].style.headerColor',
  'slides[].elements[].style.rowStripe',
  'slides[].elements[].style.stripeColor',
  'slides[].elements[].style.borderColor',
  'slides[].elements[].style.borderWidth',
  'slides[].elements[].style.cellPadding',
  'slides[].elements[].style.fontSize',
  'slides[].elements[].style.fontFamily',

  // ── Custom HTML element ────────────────────────────────────────────────────
  'slides[].elements[].html',
  'slides[].elements[].fallbackImage',

  // ── Group element ─────────────────────────────────────────────────────────
  'slides[].elements[].elements',
  'slides[].elements[].transform',
]);

/**
 * Returns true if the given path string is a known valid DSL field path.
 */
export function isValidDslPath(path: string): boolean {
  return VALID_DSL_PATHS.has(path);
}

/**
 * Returns the sorted list of all valid DSL field paths.
 * Useful for error messages and documentation generation.
 */
export function listValidDslPaths(): string[] {
  return [...VALID_DSL_PATHS].sort();
}
