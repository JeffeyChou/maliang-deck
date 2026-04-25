---
name: shared-constraints
description: DSL authoring rules, canvas formats, element types, image handling, renderer capabilities, and quality constraints shared across all Maliang Deck agent roles and styles.
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

Common DSL authoring rules for all Maliang Deck agent roles. These constraints apply regardless of style (`academic`, `consulting`, or future styles) and regardless of which workflow stage is active.

Adapted from ppt-master `shared-standards.md` and `executor-base.md`, with all SVG-specific instructions replaced by JSON DSL equivalents.

---

## 1. DSL as Single Source of Truth

The JSON deck DSL is the single canonical representation of a presentation:

- All element positions, dimensions, and content are expressed as DSL fields
- Renderer behavior follows from DSL — do not describe SVG attributes directly
- `@maliang-deck/schema` is the sole arbiter of what is a valid DSL structure
- Guidance lints check style conformance within valid DSL; they do not replace schema validation

If a presentation element cannot be expressed in the current DSL schema, raise a schema extension request — do not encode it as a workaround in notes or constraint strings.

---

## 2. Canvas Formats

Canvas dimensions are declared once in `meta.canvas` and locked at deck-plan time:

```json
{ "meta": { "canvas": { "width": 1280, "height": 720 } } }
```

| Format | meta.canvas.width | meta.canvas.height | Ratio |
|--------|-------------------|--------------------|-------|
| 16:9 (default) | 1280 | 720 | 16:9 |
| 4:3 | 1024 | 768 | 4:3 |

**Safe area**: 40px margins all sides. No essential content outside `x: 40–1240, y: 40–680` for 1280×720.

All element `x`, `y`, `w`, `h` values are in pixels relative to the canvas top-left origin (x increases rightward, y downward).

---

## 3. Element Types

Valid `slides[].elements[].type` values and their primary fields:

| type | Key fields |
|------|-----------|
| `text` | `content`, `fontSize`, `fontFamily`, `fontWeight`, `color`, `align` |
| `rect` | `width`, `height`, `fill`, `stroke`, `radius` |
| `circle` | `radius`, `fill`, `stroke` |
| `ellipse` | `width`, `height`, `fill`, `stroke` |
| `line` | `x2`, `y2`, `stroke`, `strokeWidth` |
| `path` | `d`, `fill`, `stroke` |
| `polygon` | `points`, `fill`, `stroke` |
| `image` | `src`, `fit`, `width`, `height` |
| `chart` | `chartType`, `data`, `width`, `height` |
| `table` | `rows`, `width` |
| `group` | `elements[]` (recursive) |

Every element requires `id`, `x`, `y` (and `type`). Width/height are required for most types.

---

## 4. Element Position Rules

- Explicit `x`, `y`, `w`, `h` on every element — no renderer defaults
- No overlapping bounding boxes unless intentional layering (background rect + text)
- Column alignment: elements in same column share `x`; row alignment: share `y`
- Stay within safe area (40px margins)

---

## 5. Text Elements

`type: "text"` uses `content` as the field name (not `text`). The `text` shorthand is accepted in role doc frontmatter references only.

- Multi-line text handled by `layoutTextBox()` in `text-measure` — do not manually insert line breaks
- CJK content: break opportunities inserted automatically between CJK characters
- Font size and weight via element style fields (`fontSize`, `fontWeight`)

---

## 6. Image Elements

`type: "image"` must specify `src` and `fit`:

| fit value | Behavior |
|-----------|----------|
| `"contain"` | Scale to fit within bounds, preserve ratio (may letterbox) |
| `"cover"` | Scale to fill bounds, preserve ratio (may crop) |
| `"fill"` | Stretch to exactly fill (distorts ratio) |

**Never use `"fill"` for photography or figures.** Use only for solid fills or patterns where distortion is invisible.

Placeholder when image not available: use a `rect` with dashed stroke + `text` description, and mark `slides[].notes` with `[IMAGE PLACEHOLDER: description]`.

---

## 7. Group Elements

`type: "group"` wraps logically related elements. Use groups for:

| Group | Contains |
|-------|----------|
| Card / panel | Background rect + icon + title + body text |
| Figure | Image + caption text |
| Process step | Number + label + description |
| KPI card | Metric + label + trend annotation |
| Page header | Title + subtitle + accent decoration |

Groups map to DSL group elements and produce logical grouping in PDF/PPTX export.

---

## 8. Background Rules

`slides[].background` sets the slide background:

- Hex color string: `"#FFFFFF"`
- Object with `type: "color"` and color value
- Object with `type: "image"` and src/fit fields

Do not use z-ordering tricks for backgrounds. Use `slides[].background` for slide-level backgrounds.

---

## 9. Notes Field

`slides[].notes` is for speaker notes and supplementary content:

**Required:**
- Full citations for external data or figures
- Sentence-by-sentence presenter script, preferably one numbered sentence per spoken beat
- Presenter talking points expanding on slide assertions, including transitions, derivation steps, audience prompts, caveats, and reveal timing where relevant
- `[IMAGE PLACEHOLDER: description]` markers for missing assets

**Prohibited:**
- Content that belongs on the slide
- JSON, DSL snippets, or technical metadata
- One-line slide summaries such as "Explain this slide" or "Review the chart"

---

## 10. Slide IDs

`slides[].id` must be:
- Unique within the deck
- A non-empty string
- Stable across regeneration (no random UUIDs)

Convention: `slide-NN-slug` (e.g., `slide-03-methodology`).

---

## 11. Color Rules

- Use only palette tokens from the active style — no ad-hoc hex colors
- Transparency via element opacity fields, not rgba() strings
- Semantic colors: positive trends = green family, negative = red family, neutral baseline = gray
- Background: white `#FFFFFF` or near-white `#F8FAFC` for content slides

---

## 12. Typography Rules

- All slides in a deck use the same font family (set at `deckDesign.typographyScaleId`)
- Vary weight and size within the declared scale only
- System-safe fonts: Inter (bundled), Arial, Calibri, Georgia, Times New Roman
- No custom font declarations — use bundled Inter or system fonts

---

## 13. Renderer Capability Summary

| Feature | HTML | SVG/PDF | PPTX |
|---------|------|---------|------|
| CSS transitions | Full | None | None |
| Custom fonts (Inter) | Full | Full | Partial |
| Gradient fills | Full | Full | Partial |
| Animations (`fx`) | Full | None | Partial |
| Rich text runs | Planned | Planned | Planned |
| Charts | Full | Full | Full |
| Tables | Full | Full | Full |
| Groups | Full | Full | Full |

For PDF/PPTX export, use only features marked `Full` in those columns.

---

## 14. Animation (`slides[].fx`)

Use sparingly:
- Academic style: no `fx` — animations distract from evidence
- Consulting style: simple entry animations on `title` and `section` slides only
- Never animate content slides in consulting decks
- Use DSL-declared animation types only (see `docs/ADDING-ANIMATIONS.md`)

---

## 15. Locked Token Discipline

`deckDesign.lockedTokens` values must not be overridden per-slide:
- Margin values are fixed for the deck
- Element spacing comes from `spacing.element` and `spacing.section` tokens
- Colors come from `deckDesign.paletteId`

If locked tokens don't fit the content, simplify the content — not the layout contract.

---

## 16. Forbidden Patterns

| Pattern | Why forbidden |
|---------|---------------|
| Layout encoded in `slides[].notes` | Notes are for presenters; layout uses element positions |
| `meta.theme` used as style identity | `theme` is CSS renderer concern; style = `styleId` in `project.json` |
| Hardcoded pixel values outside locked tokens | Visual drift across parallel-generated slides |
| Empty or non-unique `slides[].id` | Assembly fails; cross-references break |
| `fit: "fill"` on photographic images | Aspect ratio distortion |
| Per-slide margin overrides | Breaks consistency validator |
| Colors outside declared palette | Fails palette lint rule |
