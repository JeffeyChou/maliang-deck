---
name: shared-constraints
description: DSL authoring rules, canvas policies, image handling, and quality constraints shared across all Maliang Deck agent roles and styles.
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

---

## 1. DSL as Single Source of Truth

The JSON deck DSL is the single canonical representation of a presentation. Do not treat the HTML preview, SVG output, PDF, or PPTX as authoritative.

**Implications:**

- All element positions, dimensions, and content are expressed as DSL fields
- Renderer behavior follows from DSL — do not describe SVG attributes directly
- Schema validation (`@maliang-deck/schema`) is the sole arbiter of what is a valid DSL structure
- Guidance lints check style conformance within valid DSL; they do not replace schema validation

If a presentation element cannot be expressed in the current DSL schema, the correct response is to raise a schema extension request — not to encode the intent as a workaround in notes or constraints text.

---

## 2. Canvas Policy

Canvas dimensions are declared once in `meta.canvas` and locked at deck-plan time. They do not vary per-slide.

```json
{
  "meta": {
    "canvas": { "width": 1280, "height": 720 }
  }
}
```

**Standard canvases:**

| Use case | width | height |
|----------|-------|--------|
| 16:9 presentation (default) | 1280 | 720 |
| 4:3 presentation | 1024 | 768 |

All element `x`, `y`, `w`, `h` values are in pixels relative to the canvas origin (top-left). The coordinate system has x increasing rightward and y increasing downward.

**Safe area**: Maintain 40px margins on all sides. No essential content outside `x: 40–1240, y: 40–680` for a 1280×720 canvas.

---

## 3. Element Position Rules

Every element must have explicit `x`, `y`, `w`, `h` values. Do not rely on renderer defaults for positioning.

**No overlapping elements** (unless intentionally layered with z-index). Elements in the same slide must have non-overlapping bounding boxes unless they form an intentional layered composition (e.g., a background rectangle with text on top).

**Alignment discipline**: Elements in a column must share the same `x` value. Elements in a row must share the same `y` value. Misaligned elements signal authoring errors, not design choices.

**Minimum element sizes:**

| Element type | Minimum w | Minimum h |
|-------------|-----------|-----------|
| Text (single line) | 100 | 20 |
| Text (multi-line) | 200 | 40 |
| Image | 100 | 100 |
| Group | 100 | 60 |

---

## 4. Text Element Rules

`slides[].elements[].type = "text"` elements must satisfy:

- `text` field is non-empty
- `x`, `y`, `w`, `h` define the bounding box — text is laid out within this box by `text-measure`
- Font size and weight are set through the element's style object, using values from the active typography scale
- Multi-line text is handled by `layoutTextBox()` — do not manually insert line breaks unless the break is semantically required (e.g., a heading and subheading are distinct semantic units)

**CJK content**: The text-measure package inserts break opportunities between CJK characters automatically. Do not add manual breaks between CJK characters.

---

## 5. Image Element Rules

`slides[].elements[].type = "image"` elements must specify:

- `src`: path to the image asset, relative to the project directory
- `fit`: one of `"contain"` | `"cover"` | `"fill"`
  - `"contain"` — scales image to fit within bounds, preserving aspect ratio (may show letterboxing)
  - `"cover"` — scales image to fill bounds, preserving aspect ratio (may crop)
  - `"fill"` — stretches image to exactly fill bounds (distorts if aspect ratios differ)

**Never use `"fill"` for photography or figures** — aspect ratio distortion is always incorrect. Use `"fill"` only for solid-color fills or patterns where distortion is invisible.

**Placeholder images**: Use a text element with placeholder description when the image is not yet available. Mark the slide's notes with `[IMAGE PLACEHOLDER: description]` to signal the missing asset.

---

## 6. Background Rules

`slides[].background` sets the slide background. Acceptable values:

- A hex color string: `"#FFFFFF"`
- An object with `type: "color"` and a color value
- An object with `type: "image"` and src/fit fields

Do not set background per-element using z-ordering tricks. Use `slides[].background` for the slide-level background.

---

## 7. Notes Field Usage

`slides[].notes` is the designated field for speaker notes and supplementary content that does not appear on the slide.

**Required notes content:**
- Full citations for any external data or figures on the slide
- Sentence-by-sentence presenter script, preferably one numbered sentence per spoken beat
- Presenter talking points that expand on slide assertions with transitions, derivation steps, audience prompts, caveats, and reveal timing where relevant
- Methodological context that audience specialists may ask about
- `[IMAGE PLACEHOLDER: description]` markers when images are missing

**Prohibited notes content:**
- Content that belongs on the slide (if it's important enough to say, it may need a dedicated slide)
- JSON, DSL snippets, or technical metadata (notes are for presenters)
- One-line slide summaries such as "Explain this slide" or "Review the chart"

---

## 8. Slide ID Rules

`slides[].id` must be:
- Unique within the deck
- A non-empty string
- Stable across deck regeneration (do not use random UUIDs that change on each run)

Recommended convention: `slide-N-slug` where N is the slide number (zero-padded) and slug is a short kebab-case description of the slide's content. Example: `slide-03-methodology`, `slide-07-key-findings`.

---

## 9. Animation and Effects (`slides[].fx`)

`slides[].fx` controls slide-level animation and visual effects. Use sparingly.

**Academic style**: No `fx` by default. Animations distract from evidence.
**Consulting style**: Simple entry animations acceptable on title and section slides only. Never animate content slides — executives do not wait for animations.

When `fx` is required, use DSL-declared animation types only (see `docs/ADDING-ANIMATIONS.md`). Do not describe animation through notes or constraint strings.

---

## 10. Source Reference Rules (`sourceRefs`)

Work orders generated by `generate-dsl` include `sourceRefs` linking slide content to normalized extraction blocks from the source document. DSL authors must:

- Preserve the `sourceRefs` mapping in generated work orders — do not discard extraction references
- When authoring slide text, prefer wording from the source extraction over paraphrasing
- When a claim cannot be traced to a `sourceRef`, flag it in `slides[].notes` with `[UNVERIFIED CLAIM: text]`

---

## 11. Quality Gate Severity Levels

The guidance quality system uses two severity levels:

| Severity | Effect | Examples |
|----------|--------|----------|
| `error` | Blocks assembly (`workflow assemble`) | Missing `slides[].id`, canvas overflow, invalid palette color |
| `warning` | Reports in output, does not block | High density slide, missing source attribution, assertion title missing |

Resolve all `error` severity issues before proceeding to `workflow assemble`. Address `warning` severity issues before final delivery.

---

## 12. Style Token Usage

Design tokens from `deckDesign.lockedTokens` and the style registry must be used as-is. Do not:

- Override margin values per-slide
- Choose element spacing values outside the locked `spacing.element` and `spacing.section` tokens
- Use colors outside the declared palette (check `deckDesign.paletteId`)

If the locked tokens produce a layout that doesn't fit the content, the correct response is to simplify the content — not to widen the margins or reduce the spacing.

---

## 13. Renderer Capability Awareness

The DSL targets multiple renderers. Some features have partial or no support in certain export targets:

| Feature | HTML | SVG/PDF | PPTX |
|---------|------|---------|------|
| CSS transitions | Full | None | None |
| Custom fonts (Inter) | Full | Full | Partial |
| Gradient backgrounds | Full | Full | Partial |
| Animations (`fx`) | Full | None | Partial |
| Rich text runs | Planned | Planned | Planned |

When authoring DSL for a deck that will be exported to PDF or PPTX, do not rely on features marked `None` or `Planned`. Use only features marked `Full` for cross-format compatibility.

---

## 14. Forbidden Patterns

These patterns are explicitly forbidden in DSL authoring:

| Pattern | Why forbidden |
|---------|---------------|
| Encoding layout in `slides[].notes` | Notes are for presenters; layout is expressed through element positions |
| Using `meta.theme` as style identity | `theme` is a renderer CSS concern; style identity uses `styleId` in `project.json` |
| Hardcoding pixel values outside locked tokens | Visual drift across parallel-generated slides |
| Empty `slides[].id` or non-unique IDs | Assembly fails; cross-references break |
| `type: "fill"` on photographic images | Aspect ratio distortion |
| Per-slide margin overrides | Breaks consistency validator |
| Colors not in the declared palette | Fails palette lint rule |
