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

Animations and `slides[].fx` are HTML runtime features. Use them sparingly and ensure static PDF/PPTX still communicates the final state. Author animation names from [Authoring](../../AUTHORING.md); do not describe effects in notes.

## Forbidden Patterns

| Pattern | Reason |
| --- | --- |
| Layout encoded in notes | Notes are for presenters. |
| Per-slide margin overrides | Breaks consistency. |
| Colors outside palette | Breaks style linting. |
| Empty/random slide IDs | Breaks assembly and diffs. |
| `fit: "fill"` on photos/figures | Distorts evidence. |
| Unverified claims without notes citation | Weakens traceability. |
