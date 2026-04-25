# Presentation Design System Template

Draft template/project extracted from the provided Image #1 design-system screenshot.

## What is reusable?

Use these files as distinct layers:

| File | Purpose | Edit directly? |
| --- | --- | --- |
| `template-pack.json` | Draft reusable template metadata: tokens, archetypes, slots, fragments, guidance, coverage. | Yes, when refining the extracted template definition. |
| `dsl/deck.json` | Concrete 20-slide pattern library in ordinary Maliang Deck JSON DSL. This is the best current source for making new slides. | Yes. Copy or generate from these slide patterns. |
| `render/html/index.html` | Generated preview of `dsl/deck.json`. | No. Regenerate it with `scripts/render-preview.mjs`. |
| `docs/extraction-notes.md` | Human-readable visual system notes and caveats. | Yes. |
| `scripts/*.mjs` | Reusable workflow helpers for creating decks and regenerating previews. | Yes, if the workflow needs to change. |

The temporary `.mjs` files used during extraction are **not** required. The committed scripts below replace that ad-hoc step with reproducible commands.

## Scripts

### Create a new deck from the pattern library

```bash
node examples/presentation-design-system-template/scripts/create-deck.mjs \
  --out /tmp/client-deck.json \
  --layouts title-cover,two-column-content,chart-table,closing \
  --title "Quarterly Product Review" \
  --subtitle "Market, product, and roadmap update" \
  --company "Acme"
```

The script copies matching layout examples from `dsl/deck.json`, rewrites slide/element ids, replaces common placeholder text, and validates the generated deck.

Available layouts:

- `title-cover`
- `system-reference`
- `one-column-content`
- `two-column-content`
- `multi-column-content`
- `large-media`
- `gallery`
- `chart-table`
- `data-text-image`
- `section-divider`
- `closing`
- `summary`

### Render a deck preview

```bash
node examples/presentation-design-system-template/scripts/render-preview.mjs
```

That regenerates:

```text
examples/presentation-design-system-template/render/html/index.html
```

Render a generated deck instead:

```bash
node examples/presentation-design-system-template/scripts/render-preview.mjs \
  --deck /tmp/client-deck.json \
  --out /tmp/client-deck.html
```

## Verify

```bash
node packages/cli/dist/index.js validate examples/presentation-design-system-template/dsl/deck.json
node packages/cli/dist/index.js template validate examples/presentation-design-system-template/template-pack.json
node examples/presentation-design-system-template/scripts/create-deck.mjs --out /tmp/pds-smoke.json
node examples/presentation-design-system-template/scripts/render-preview.mjs --deck /tmp/pds-smoke.json --out /tmp/pds-smoke.html
```

If `packages/*/dist` files are missing, run:

```bash
pnpm build
```

## Current reuse model

The current repo template compiler can validate `template-pack.json` and generate a basic sample. It does not yet fully instantiate rich decks from all extracted fragments. For practical deck creation today, use `dsl/deck.json` as a concrete pattern library and `scripts/create-deck.mjs` as the starter-deck generator.
