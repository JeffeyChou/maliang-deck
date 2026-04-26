# Corporate Wave Blue Template

White/blue corporate design system with Inter typography, abstract wave artwork,
and modular content layouts. Extracted from a design-system screenshot.

## Files

| File | Purpose | Edit? |
| --- | --- | --- |
| `template-pack.json` | TemplatePackLite — tokens, archetypes, slots, fragments, guidance. | Yes |
| `dsl/deck.json` | 20-slide pattern library in Maliang Deck JSON DSL. Uses `defaultFont`. | Yes |
| `render/html/index.html` | Generated HTML preview of `dsl/deck.json`. | No — regenerate. |
| `docs/extraction-notes.md` | Visual system notes and caveats. | Yes |

## Scripts

Scripts live at the repo root in `scripts/template-tools/` (shared across templates).

### Create a new deck from the pattern library

```bash
node scripts/template-tools/create-deck.mjs \
  --out /tmp/client-deck.json \
  --layouts title-cover,two-column-content,chart-table,closing \
  --title "Quarterly Product Review" \
  --company "Acme"
```

### Render a deck preview

```bash
node scripts/template-tools/render-preview.mjs
node scripts/template-tools/render-preview.mjs --deck /tmp/client-deck.json --out /tmp/client-deck.html
```

## Available layouts

`title-cover`, `system-reference`, `one-column-content`, `two-column-content`,
`multi-column-content`, `large-media`, `gallery`, `chart-table`,
`data-text-image`, `section-divider`, `closing`, `summary`

## Verify

```bash
node packages/cli/dist/index.js validate examples/corporate-wave-blue/dsl/deck.json
node packages/cli/dist/index.js template validate examples/corporate-wave-blue/template-pack.json
```
