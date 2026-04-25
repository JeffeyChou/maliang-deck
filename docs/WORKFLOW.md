# Maliang Deck Slide Generation Workflow

This is the recommended minimal workflow for agents and humans when a user provides source materials and a slide goal.

## Principles

- Keep the workflow **project-based and persistent**: every durable artifact belongs under `projects/<slug>/`.
- Ask only for information that cannot be inferred safely from the materials.
- Do not generate slide DSL until the user approves the outline.
- Keep extraction, planning, DSL authoring, assembly, and export as separate gates.
- Never persist API tokens. `MINERU_API_TOKEN` is read from the environment or local `.env` at runtime only.

## Optional: extract or select a template pack

If the user supplies reference PPTX, HTML, PDF, or PNG material as a visual-system reference, treat template extraction as a separate workflow step before ordinary deck generation:

1. Extract a draft template pack from the references.
2. Review `coverage-report.json`, `coverage-thresholds.proposed.json`, warnings, and provenance.
3. Validate or sample the draft explicitly.
4. Approve or select the template pack before using it as generation guidance.

Repository-root CLI examples after `pnpm -r build`:

```bash
node packages/cli/dist/index.js template extract ref.pptx ref.html ref.pdf ref.png --out templates/ref --id ref
node packages/cli/dist/index.js template validate templates/ref/template-pack.json
node packages/cli/dist/index.js template sample templates/ref/template-pack.json --out projects/ref-sample
node packages/cli/dist/index.js template list --include-drafts --template-pack templates/ref/template-pack.json
```

Do not skip the normal outline/deck-plan/slide-work-order gates after selecting a template. A template pack only informs style, layout archetypes, and fragments; it does not replace the JSON DSL or directly feed renderers. See [`docs/TEMPLATE-EXTRACTION.md`](./TEMPLATE-EXTRACTION.md) for the full template extraction contract and review checklist.

## 1. Intake: ask for the missing brief

Start by collecting the minimum presentation brief:

- topic / goal
- source materials: PDFs, URLs, ZIPs, notes, images, data files
- audience: executives, researchers, students, customers, etc.
- duration or target slide count
- language and tone
- visual style or theme direction
- must-include content
- out-of-scope or sensitive content
- desired outputs: `html`, `pdf`, `pptx`
- live extraction preference: local/offline materials, optional local Docling extraction, or MinerU live API when a token is available

Best practice: ask in small rounds. Confirm the final brief before creating slides.

## 2. Create the project folder

Use a short stable slug, then initialize the project.

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow init <slug> \
  --sources <material-1> <material-2> \
  --formats html,pdf,pptx
```

Examples:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow init cuszp \
  --sources "projects/cuszp/paper.pdf" \
  --formats html,pdf,pptx
```

This creates persistent files under:

```text
projects/<slug>/
  project.json
  requirements.md
  extraction/
  planning/
  dsl/
  render/
  exports/
  review/
```

Create or refresh the requirements template:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow intake projects/<slug>
```

Then write the confirmed brief into `projects/<slug>/requirements.md`.

## 3. Extract and normalize source material

Choose one extraction provider, then normalize with the same provider. MinerU remains the default path for prepared MinerU-style artifacts and live precise extraction; Docling is an optional local PDF path for faster no-token intake.

```bash
# Default MinerU-compatible local/prepared artifacts
pnpm --dir packages/cli exec tsx src/index.ts workflow extract projects/<slug>
pnpm --dir packages/cli exec tsx src/index.ts workflow normalize projects/<slug>

# Optional local Docling PDF extraction
pip install docling
pnpm --dir packages/cli exec tsx src/index.ts workflow extract projects/<slug> \
  --provider docling --document-timeout 300
pnpm --dir packages/cli exec tsx src/index.ts workflow normalize projects/<slug> --provider docling
```

Docling is external optional tooling, not an npm dependency. It runs with remote services/plugins disabled; true air-gapped use needs pre-downloaded model artifacts via `--artifacts-path <path>`. Docling rejects remote URL sources unless a future explicit remote-input opt-in is added.

For live MinerU extraction, use `MINERU_API_TOKEN` only as an environment/local `.env` value. Live calls should be explicit opt-in and should not run by default in CI. The precise local-upload flow is:

1. request upload URLs with `/api/v4/file-urls/batch`
2. PUT source files to the returned upload URLs
3. poll `/api/v4/extract-results/batch/{batch_id}`
4. download the result ZIP
5. safely unpack it
6. normalize Markdown, content lists, and extracted assets

After normalization, inspect:

```text
projects/<slug>/extraction/normalized/materials.json
projects/<slug>/extraction/normalized/blocks.json
projects/<slug>/extraction/normalized/assets.json
projects/<slug>/extraction/normalized/source-summary.md
```
walkthrough the parsed information to gain understanding of the source materials and identify key content for the presentation. This is crucial for informed outline drafting in the next step.
If tables and figures are present in the source materials, pay special attention to their content and context during this review. These elements often contain critical data and insights that can be highly valuable for the presentation, use them if necessary to support the storyline and enhance the audience's understanding of the topic.

## 4. Draft outline and ask for approval

Create the outline work order:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow outline projects/<slug> --mode agent
```

The agent should draft:

```text
projects/<slug>/planning/outline-draft.md
```

The outline should include:

- title and thesis
- target audience and duration
- slide-by-slide storyline
- source block / asset references where useful
- what is intentionally omitted
- expected outputs and style direction

Ask the user to approve or revise the outline. Do not continue to DSL generation until approved.

When approved:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow approve-outline projects/<slug>
```

## 5. Plan the deck

Create a deck-plan work order:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow plan-deck projects/<slug> --mode agent
```

The agent authors:

```text
projects/<slug>/planning/deck-plan.json
```

Then validate it:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow plan-deck projects/<slug> --validate-only
```

A good deck plan defines each slide's purpose, source references, candidate assets, layout intent, visual style, and speaker notes needs. Speaker-notes intent should describe spoken explanation beats, not a generic phrase such as "summarize this slide."

## 6. Generate slide DSL

After outline approval and deck-plan validation, create slide work orders:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow generate-dsl projects/<slug> --mode agent --parallel
```

Agents then write slide slices under:

```text
projects/<slug>/dsl/slides/
```

Best practices for slide DSL:

- validate against the schema early
- reuse source block IDs and asset refs from normalized artifacts
- keep coordinates intentional and readable
- include `notes` as a sentence-by-sentence presenter script, not a slide-level summary
- use theme variables where possible
- use `animation` for per-element timeline steps
- use `meta.htmlRuntime.transition` for live HTML slide-to-slide polish
- keep `htmlRuntime` HTML-only; PDF/PPTX exporters ignore it

## 7. Assemble and build outputs

Assemble slide slices into a deck:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow assemble projects/<slug>
```

During assembly, workflow lint checks for missing or vague speaker notes. Notes warnings do not block assembly, but they should be fixed before review or export.

Build the requested outputs:

```bash
pnpm --dir packages/cli exec tsx src/index.ts workflow build projects/<slug> --formats html,pdf,pptx
```

Expected outputs:

```text
projects/<slug>/render/html/index.html
projects/<slug>/exports/deck.pdf
projects/<slug>/exports/deck.pptx
projects/<slug>/exports/export-report.json
```

For native editable PowerPoint charts/tables, use the pptxgenjs export path where appropriate:

```bash
pnpm --dir packages/cli exec tsx src/index.ts export \
  projects/<slug>/dsl/deck.json \
  projects/<slug>/exports/deck.pptx \
  --pptx-engine pptxgenjs
```

## 8. Present or inspect the HTML deck

Serve any deck JSON directly:

```bash
pnpm --dir packages/cli exec tsx src/index.ts serve projects/<slug>/dsl/deck.json --port 4173
```

Open:

```text
http://localhost:4173
```

Keyboard controls:

- `←` / `→`: previous / next slide
- `↑` / `↓`: in-slide animation steps
- `Space` / `Enter`: step when possible, otherwise next slide
- `S`: presenter mode; current/next preview iframes hide deck slide numbers, while the timer card shows slide position
- `L`: laser pointer
- `W`: whiteboard with marker, eraser, undo, redo, clear, color, and size controls

### HTML editor persistence

Browser edits are persistent only when the deck is opened through the local serve command above. In that mode, Save posts a constrained patch to the server, validates the result, and writes the canonical DSL JSON file (for example `projects/<slug>/dsl/deck.json`). The next serve or rebuild from that DSL keeps those edits.

Static exported HTML cannot write files. If the editor cannot reach `/__maliang-deck/editor`, edits are temporary-only and are lost on refresh or reopen.

The editor updates DSL JSON, not `.mjs` generator scripts. If the deck was generated from `.mjs`, rerunning the generator may overwrite saved DSL edits.

MVP persistent edits: slide reorder; top-level text move/resize/content/font size; top-level rectangle move/resize/fill/stroke/stroke width/radius.

## 9. Verification checklist

Before reporting completion, run the relevant checks:

```bash
pnpm exec vitest run tests/runtime/*.test.ts
pnpm exec vitest run tests/renderer-html/chart-table.test.ts tests/renderer-svg/chart-table.test.ts
pnpm --dir packages/workflow exec vitest run --config vitest.config.ts
pnpm -r build
pnpm -r typecheck
pnpm lint
pnpm test
```

If a full-suite failure depends on an ignored local fixture, report it explicitly and include focused passing evidence.

## 10. Agent handoff summary template

End with a concise summary:

```text
Project: projects/<slug>
Inputs: <materials>
Brief: <audience, duration, style, outputs>
Approved outline: projects/<slug>/planning/outline-approved.md
Deck JSON: projects/<slug>/dsl/deck.json
Outputs:
- HTML: projects/<slug>/render/html/index.html
- PDF: projects/<slug>/exports/deck.pdf
- PPTX: projects/<slug>/exports/deck.pptx
Serve command:
  pnpm --dir packages/cli exec tsx src/index.ts serve projects/<slug>/dsl/deck.json --port 4173
Verification:
  <commands and pass/fail evidence>
Known gaps:
  <deferred work or risks>
```
