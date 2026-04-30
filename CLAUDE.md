# Slide Production MUST_READ

This file is for agents producing decks with Maliang Deck. It is not a
development guide.

## Core Rule

The JSON deck DSL is the source of truth.

```text
JSON deck DSL -> HTML preview
JSON deck DSL -> SVG -> PDF / PPTX export
```

Do not hand-edit exported HTML, SVG, PDF, or PPTX as the canonical version.
Change the deck DSL, then regenerate outputs.

## Production Workflow

For document-to-slide projects, follow the gated workflow:

```text
init -> extract -> normalize -> outline -> approve-outline -> plan-deck -> generate-dsl -> assemble -> build
```

Rules:

- Do not generate slide DSL before `planning/outline-approved.md` exists.
- Do not create `planning/outline-approved.md` yourself. After authoring
  `planning/outline-draft.md`, present the outline plan to the user for review
  and wait for explicit approval or revision instructions.
- The outline review must expose audience, style, duration, source coverage,
  omissions, output formats, and the per-slide outline.
- Only run `workflow approve-outline` after explicit human approval, and record
  the human reviewer with `--reviewed-by`.
- `dsl/deck.json` is assembled from `dsl/slides/*.json`.
- Keep `project.json`, `requirements.md`, `planning/deck-plan.json`, and
  `dsl/deck.json` consistent.
- `styleId` means design-system identity.
- `DeckMeta.theme` means runtime CSS theme.
- Do not overload `theme` with workflow style identity.

## Deck DSL Priorities

- Use valid typed DSL fields first.
- Use `options` only for renderer-specific details.
- Keep element IDs stable and descriptive; exports and animations rely on them.
- Prefer structured elements over `customHtml`.
- Use `customHtml` only for HTML-only content and provide an export fallback
  when PDF/PPTX matter.
- Keep slide content within the canvas bounds.
- Keep dense slides readable; split overcrowded material into multiple slides.
- Use speaker notes when the deck is intended for presentation.

## Visual Style

- Follow the approved outline and deck plan.
- Maintain one coherent visual system across slides.
- Reuse the project palette, typography, spacing, and component patterns.
- Use assertion titles when the deck is explanatory or persuasive.
- Prefer diagrams, charts, tables, equations, and visual comparisons over long
  paragraphs.
- Make every chart/table readable without relying on presenter narration.
- Preserve citations, source labels, and uncertainty where the source material
  requires them.

## Math, Charts, Tables, Graphs

- Formulas should be authored as `formula` elements, not plain text, when they
  need math rendering or step animation.
- Formula steps should express meaningful derivation changes, not cosmetic
  rewrites.
- Charts and tables should use typed data and style fields.
- 2D graphs should use graph DSL where possible.
- 3D/WebGL graphs need a deterministic final-frame view for PDF/PPTX.
- Avoid raw LaTeX fallback in final PDF/PPTX; inspect exports when formulas are
  central to the deck.

## Animation And Interaction

- Use animation to clarify sequence, not decorate every element.
- Left/Right control reveal steps; Up/Down navigate slides.
- Space/Enter advance reveal steps, then slides.
- For step reveals, keep each click semantically meaningful.
- Morphing and rich text animation may be HTML-only; verify PDF/PPTX static
  fallbacks.

## Assets

- Deck-local assets may live under `examples/<deck>/assets/...` or the project
  equivalent.
- Reference deck-local themes/FX with relative paths.
- Use real images or generated bitmap assets when the audience needs to inspect
  a concrete object, place, product, or visual state.
- Do not rely on remote/CDN assets for verification exports unless explicitly
  required.

## Export Verification

When the deck is ready, export all requested formats:

```bash
node packages/cli/dist/index.js export path/to/deck.json out.pdf --format pdf
node packages/cli/dist/index.js export path/to/deck.json out.pptx --format pptx
node packages/cli/dist/index.js export path/to/deck.json out-html --format html
```

Inspect the outputs, especially:

- text contrast on dark/light backgrounds
- formula rendering
- chart and table readability
- graph final frames
- missing assets or warning messages
- slide count and notes
- static PDF/PPTX fallbacks for HTML-only effects

## Quality Bar

A finished deck should:

- match the requested audience and purpose
- have a clear narrative arc
- use consistent layout and visual language
- avoid overflowing or clipped text
- preserve source meaning accurately
- make exports usable in HTML, PDF, and PPTX when requested

## Useful Production Docs

- `docs/AUTHORING.md`
- `docs/WORKFLOW.md`
- `docs/CONFIGURATION.md`
- `docs/agent-guidance/README.md`
- `assets/ANIMATIONS.md`
