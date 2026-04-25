# Maliang Deck Workflow

This is the recommended project-based process for turning source material into a deck. Durable artifacts live under `projects/<slug>/`; each stage leaves files that can be reviewed, edited, resumed, or rebuilt.

## Principles

- Keep extraction, planning, DSL authoring, assembly, and export as separate gates.
- Ask only for information that cannot be inferred safely from source materials.
- Do not generate slide DSL until the user approves the outline.
- Use `MINERU_API_TOKEN` only from environment/local `.env`; never persist token values.
- Treat template packs as style guidance, not renderer input.

## 1. Intake

Collect or infer the minimum brief:

- topic, audience, purpose, language, tone, target slide count or duration;
- source materials and must-include content;
- desired outputs: `html`, `pdf`, `pptx`;
- style direction or template references;
- extraction preference: prepared local artifacts, optional local Docling, or live MinerU.

Confirm the brief before creating slides.

## 2. Initialize Project

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow init <slug> \
  --sources <material-1> <material-2> \
  --formats html,pdf,pptx

pnpm --dir packages/cli exec tsx src/index.ts workflow intake projects/<slug>
```

Then write the confirmed brief into `projects/<slug>/requirements.md`.

## 3. Extract and Normalize

Prepared MinerU-compatible local artifacts:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow extract projects/<slug>
pnpm --dir packages/cli exec tsx src/index.ts workflow normalize projects/<slug>
```

Optional local Docling:

```bash
pip install docling
pnpm --dir packages/cli exec tsx src/index.ts workflow extract projects/<slug> \
  --provider docling --document-timeout 300
pnpm --dir packages/cli exec tsx src/index.ts workflow normalize projects/<slug> --provider docling
```

Live MinerU should be explicit and token-gated. The live path requests upload URLs, uploads files, polls batch results, downloads the ZIP, safely unpacks it, then normalizes Markdown, content lists, tables, and assets.

Review the normalized artifacts before planning:

```text
projects/<slug>/extraction/normalized/materials.json
projects/<slug>/extraction/normalized/blocks.json
projects/<slug>/extraction/normalized/assets.json
projects/<slug>/extraction/normalized/source-summary.md
```

Pay special attention to figures and tables; they often carry the evidence that should anchor the deck.

## 4. Optional Template Pack

If reference PPTX, HTML, PDF, or PNG material is supplied as a visual-system reference, extract and review a draft template before outline/deck planning:

```bash
node packages/cli/dist/index.js template extract ref.pptx ref.html ref.pdf ref.png --out templates/ref --id ref
node packages/cli/dist/index.js template validate templates/ref/template-pack.json
node packages/cli/dist/index.js template sample templates/ref/template-pack.json --out projects/ref-sample
node packages/cli/dist/index.js template list --include-drafts --template-pack templates/ref/template-pack.json
```

Review coverage, provenance, warnings, and sample output before approving or selecting the pack. Continue through the normal outline/deck-plan/DSL gates afterward.

## 5. Outline Gate

Create the outline work order:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow outline projects/<slug> --mode agent
```

Author `projects/<slug>/planning/outline-draft.md` with title/thesis, audience, duration, slide-by-slide storyline, source references, omissions, outputs, and style direction. Ask the user to approve or revise it.

After approval:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow approve-outline projects/<slug>
```

## 6. Deck Plan Gate

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow plan-deck projects/<slug> --mode agent
pnpm --dir packages/cli exec tsx src/index.ts workflow plan-deck projects/<slug> --validate-only
```

`planning/deck-plan.json` should define each slide's purpose, source refs, candidate assets, layout intent, style, and speaker-notes intent.

## 7. Slide DSL Gate

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow generate-dsl projects/<slug> --mode agent --parallel
```

Authors write slices under `projects/<slug>/dsl/slides/`.

Best practices:

- validate early against the schema;
- reuse normalized source block IDs and asset refs;
- keep coordinates intentional, or use `layout` for structured regions;
- write `notes` as presenter script, not vague summaries;
- use theme/style tokens where possible;
- keep `meta.htmlRuntime` and animations as HTML polish, not core content.

## 8. Assemble and Build

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow assemble projects/<slug>
pnpm --dir packages/cli exec tsx src/index.ts workflow build projects/<slug> --formats html,pdf,pptx
```

Assembly checks missing/vague notes and style guidance. Build writes requested outputs under `render/` and `exports/`.

## 9. Review

Before delivery:

- open the HTML deck and check navigation, notes, slide scaling, and runtime-only effects;
- inspect PDF for overflow, missing figures, and unreadable text;
- inspect PPTX for editability and warnings in `export-report.json`;
- verify citations/source refs in speaker notes;
- rerun focused tests or build commands for any package touched.
