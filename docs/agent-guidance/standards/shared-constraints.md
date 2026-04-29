---
name: shared-constraints
description: Cross-style DSL authoring rules for Maliang Deck agents.
type: role
dslFieldReferences:
  - meta.title
  - meta.theme
  - meta.canvas.width
  - meta.canvas.height
  - slides[].id
  - slides[].layout
  - slides[].background
  - slides[].elements[].type
  - slides[].elements[].x
  - slides[].elements[].y
  - slides[].elements[].text
  - slides[].notes
  - slides[].fx
stageApplicability:
  - outline
  - deck-plan
  - slide-dsl
---

# Shared Constraints

## Canonical Source

The JSON deck DSL is authoritative. HTML, SVG, PDF, and PPTX outputs are render targets. If a concept cannot be represented in schema-valid DSL, request a schema extension instead of hiding it in notes or renderer-specific markup.

## Canvas and Placement

- Declare `meta.canvas` once, normally `1280x720` for 16:9 or `1024x768` for 4:3.
- Use pixel coordinates from the top-left origin.
- Keep essential content inside a 40px safe area.
- Every visible element needs explicit position and dimensions where the schema expects them.
- Align columns by shared `x` and rows by shared `y`; overlap only for intentional layering.

## Elements

| Type | Main fields |
| --- | --- |
| `text` | `content`, font fields, color, align. |
| `rect`/`circle`/`ellipse` | geometry, fill, stroke. |
| `line`/`path`/`polygon` | points/path, stroke/fill. |
| `image` | `src`, `fit`, width, height. |
| `chart`/`table` | bounded data structures. |
| `group`/`layout` | recursive child elements. |

Use `content` for text payloads. Avoid manual line breaks unless semantically needed; `text-measure` handles wrapping and CJK break opportunities.

For images, prefer `contain` for figures and `cover` for photos. Do not use `fill` for photography or technical figures.

## Background, Notes, and IDs

- Use `slides[].background` for slide background, not z-order tricks.
- `slides[].id` must be unique, stable, and non-empty; prefer `slide-NN-slug`.
- `slides[].notes` must contain speaker script, citations, source caveats, and image placeholders. Do not put layout instructions, JSON, or vague summaries in notes.

## Tokens and Style

- Use the active style's palette, spacing, and typography tokens.
- Do not use `meta.theme` as style identity; style belongs in `styleId` / project guidance.
- If locked tokens do not fit, simplify content rather than mutating margins per slide.

## Runtime Features

Animations, `slides[].fx`, and `morphSteps` are HTML runtime features. Use them sparingly and ensure static PDF/PPTX still communicates the final state. SVG/PDF/PPTX exports ignore `morphSteps` and emit a diagnostic. Author animation names from [Authoring](../../AUTHORING.md); do not describe effects in notes.

Runtime extensions under `assets/extensions/` are also HTML-only. Use
`customHtml` for extension mounts such as `data-gif-ascii`, keep source assets
explicit and portable, and provide `fallbackImage` when PDF/PPTX needs to show
the same idea. For interactive Three.js plots, leave enough slide space for
mouse/touch interaction and avoid overlaying deck controls on top of the graph.

### Chart & Table Theming

The `style` field on chart and table elements provides typed, cross-renderer styling:

| Field | Chart | Table | Renderers |
|-------|-------|-------|-----------|
| palette / headerBackground | series colors (hex) | header bg (hex) | HTML, SVG, PPTX |
| axisColor / headerColor | axis line color | header text color | HTML, SVG |
| showDataLabels / rowStripe | data value labels | alternating rows | HTML, SVG |
| rounded | bar corner radius | table border-radius | HTML only |
| areaFill | filled area under lines | — | HTML only |

**Color resolution** (renderer-specific):
- HTML: `style` field (hex) → theme CSS vars → hardcoded defaults
- SVG/PDF: `style` field (hex) → hardcoded defaults (no CSS)
- PPTX: `style` field (hex) → hardcoded defaults

**Rules:**
- `style` fields accept hex colors only (#rgb or #rrggbb) — not CSS vars or named colors
- Omit `style` entirely for automatic theme adaptation in HTML
- `options` is for renderer/exporter-specific overrides; `style` is the stable typed API

### CSS naming convention for theme polish

When using themes with generic selectors (e.g., `neon-glass-dark`), name element
IDs with these suffixes to activate automatic CSS polish:

| Suffix      | Effect                          | Applies to |
|-------------|---------------------------------|------------|
| `-glass`    | Frosted backdrop + glow         | rect       |
| `-chip`     | Badge gradient sheen            | rect       |
| `-kicker`   | Uppercase + letter-spacing      | text       |
| `-title`    | Neon text-shadow glow           | text       |
| `-connector`| Animated line glow              | line       |
| `-orb`      | Radial gradient + screen blend  | circle     |
| `-ring`     | Orbital spin + glow             | ellipse    |

This convention eliminates per-ID CSS rules — new slides get visual polish
automatically when element IDs follow the pattern.

## Forbidden Patterns

| Pattern | Reason |
| --- | --- |
| Layout encoded in notes | Notes are for presenters. |
| Per-slide margin overrides | Breaks consistency. |
| Colors outside palette | Breaks style linting. |
| Empty/random slide IDs | Breaks assembly and diffs. |
| `fit: "fill"` on photos/figures | Distorts evidence. |
| Unverified claims without notes citation | Weakens traceability. |
