# COT4400 Sorting Recitation

Recitation deck generated from `inputs/COT4400_01_W11_Sorting_updated.pdf` using the extracted Presentation Design System template.

## Files

- `dsl/deck.json` — source-of-truth Maliang Deck deck.
- `render/html/index.html` — generated preview.
- `docs/material-review.md` — source material coverage notes.
- `requirements.md` — user/session requirements.


## Speaker notes

Every slide in `dsl/deck.json` includes numbered, sentence-by-sentence speaker notes in `slides[].notes`. The quality report is:

```text
coverage/speaker-notes-report.json
```

## Verify

```bash
node packages/cli/dist/index.js validate examples/algorithm-sorting-recitation/dsl/deck.json
node examples/presentation-design-system-template/scripts/render-preview.mjs \
  --deck examples/algorithm-sorting-recitation/dsl/deck.json \
  --out examples/algorithm-sorting-recitation/render/html/index.html
```
