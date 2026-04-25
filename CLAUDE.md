# CLAUDE.md

Guidance for Claude when working with Maliang Deck: authoring slides, extending the toolchain, and preserving the DSL-first architecture.

## Project Purpose

Maliang Deck is a JSON-DSL slide toolchain. The core contract:

```
JSON deck DSL  →  HTML preview
JSON deck DSL  →  SVG  →  PDF / PPTX export
```

The JSON DSL is the **single source of truth**. Never make HTML, SVG, PDF, or
PPTX the canonical source.

## Monorepo Layout

```
packages/schema          Deck DSL types + Zod validators (no local deps)
packages/text-measure    Fontkit text measurement, reflow (depends: schema)
packages/renderer-html   DSL → interactive HTML (depends: schema, text-measure)
packages/renderer-svg    DSL → SVG for export (depends: schema, text-measure)
packages/exporter        PDF/PPTX export service (depends: schema, renderer-svg, text-measure)
packages/workflow        Document-to-slides pipeline, template extraction, agent guidance (depends: schema, renderer-html, exporter)
packages/cli             CLI entry point (depends: all)
runtime/                 Browser runtime, animation timeline, 20 canvas FX, 36 CSS themes
python/                  PDF/PPTX bridges only (DrawingML, CairoSVG)
```

**Dependency rules**: schema has zero local deps. workflow must not import cli.
exporter must not import workflow or cli. Python must not own DSL parsing.

## Architecture Rules

- Preserve DSL-as-single-source-of-truth.
- Schema validation before renderers depend on new fields.
- Renderers are pure: DSL → strings/artifacts, no workflow decisions.
- Python isolated to PDF/PPTX conversion.
- No hidden LLM/provider-backed generation.
- Template extraction is workflow/compiler guidance only; renderers/exporters stay template-unaware.
- No cloud storage, UI screens, or auth unless explicitly requested.

## Workflow Pipeline

The workflow is a 9-stage gated pipeline that turns documents into slides.
Each stage produces artifacts; gates enforce ordering.

```
init → extract → normalize → outline → approve-outline → plan-deck → generate-dsl → assemble → build
```

**Project layout** (`projects/<slug>/`):
```
project.json                        # manifest (styleId, sources, outputFormats)
requirements.md                     # brief
extraction/normalized/              # blocks.json, assets.json
planning/outline-approved.md        # gate: must exist before DSL generation
planning/deck-plan.json             # deckDesign + per-slide design
dsl/slides/*.json                   # one JSON file per slide
dsl/deck.json                       # assembled deck
render/html/  exports/*.pdf *.pptx  # build outputs
```

**Key rules**:
- Do not generate slide DSL before `outline-approved.md` exists.
- `--mode agent` means an agent writes the artifact. It does not call an LLM provider.
- Work orders carry a typed `guidance` field (not prompt soup in `constraints`).

## Agent Guidance System

The workflow includes a **hybrid guidance system** that enriches work orders
to produce publish-ready slides matching a chosen presentation style.

**Structured core** (`packages/workflow/src/guidance/`):
- `style-registry.ts` — `registerStyle()` / `getStyle()` / `listStyles()`
- `styles/academic.ts`, `styles/consulting.ts` — two built-in StyleDefinitions
- `work-order-enricher.ts` — injects typed guidance at outline, deck-plan, DSL stages
- `lint-rules.ts` — 7 DSL lints (palette, canvas-bounds, overflow, images, citations, assertions, density)
- `consistency-validator.ts` — cross-slide checks after assembly
- `role-doc-loader.ts` — loads narrative docs with YAML frontmatter + SHA-256 digest
- `role-doc-linter.ts` + `schema-paths.ts` — validates role docs against DSL schema

**Narrative role docs** (`docs/agent-guidance/`):
- `roles/strategist.md` — audience analysis, story arc, visualization selection
- `roles/executor-academic.md` — evidence-first layouts, citations, formal tone
- `roles/executor-consulting.md` — SCQA, pyramid principle, assertion titles, KPI dashboards
- `standards/shared-constraints.md` — DSL authoring rules, canvas formats, renderer capabilities
- `standards/quality-checklist.md` — per-style pass/fail checklists

**Key concepts**:
- `styleId` (design system identity) ≠ `theme` (runtime CSS). Don't overload `DeckMeta.theme`.
- `deckDesign` in deck-plan.json locks design tokens before parallel slide generation.
- Guidance constraints are **lints over valid DSL**, not a second schema.
- Role docs have YAML frontmatter with `dslFieldReferences` validated by CI linter.
- Lint severity: `error` blocks assembly, `warning` reports only.


## Template Extraction System

Maliang Deck now includes a workflow-level template extraction subsystem under
`packages/workflow/src/templates/` plus `maliang-deck template ...` CLI commands.
It turns reference PPTX, HTML, PDF, or PNG material into a **draft**
`TemplatePack` with design tokens, layout archetypes, slots, parameterized DSL
fragment guidance, provenance, and coverage evidence.

Key rules:
- Template packs are not rendered directly. They compile into existing
  `StyleDefinition`, `DeckDesign`, `SlideDesign`, and `WorkOrderGuidance`
  surfaces.
- HTML/SVG/PDF/PPTX renderers remain template-unaware and consume ordinary deck
  DSL only.
- `coverage-thresholds.proposed.json` is advisory until explicitly reviewed.
- Draft packs are not generation-active by default.
- The v1 adapters are deterministic and dependency-light; no parser/browser/native
  packages were added. Future parser/image dependencies require dependency review.

Primary docs: `docs/TEMPLATE-EXTRACTION.md` and
`docs/TEMPLATE-DEPENDENCY-REVIEW.md`.

## Text & Export

- HTML text wraps via CSS. SVG/PDF/PPTX use `@maliang-deck/text-measure` (fontkit).
- PPTX: DrawingML (Python) remains default for shapes/gradients; opt-in pptxgenjs exports native charts/tables.
- PPTX animations: plan generation + capability reports exist; XML lowering is future work.

## Commands

```bash
# Build / check
pnpm -r build
pnpm -r typecheck
pnpm test

# Single package
pnpm --filter @maliang-deck/workflow test

# CLI
node packages/cli/dist/index.js validate examples/demo.json
node packages/cli/dist/index.js serve examples/demo.json --port 3000
node packages/cli/dist/index.js export examples/demo.json out.pdf

# Workflow (full pipeline)
node packages/cli/dist/index.js workflow init my-paper --sources paper.pdf
node packages/cli/dist/index.js workflow extract projects/my-paper
node packages/cli/dist/index.js workflow normalize projects/my-paper
node packages/cli/dist/index.js workflow outline projects/my-paper --mode agent
node packages/cli/dist/index.js workflow approve-outline projects/my-paper
node packages/cli/dist/index.js workflow plan-deck projects/my-paper --validate-only
node packages/cli/dist/index.js workflow generate-dsl projects/my-paper --mode agent --parallel
node packages/cli/dist/index.js workflow assemble projects/my-paper
node packages/cli/dist/index.js workflow build projects/my-paper --formats html,pdf,pptx

# Template extraction (draft pack + coverage + sample DSL/HTML)
node packages/cli/dist/index.js template extract ref.pptx ref.html ref.pdf ref.png --out templates/ref --id ref
node packages/cli/dist/index.js template validate templates/ref/template-pack.json
node packages/cli/dist/index.js template sample templates/ref/template-pack.json --out projects/ref-sample
node packages/cli/dist/index.js template list --include-drafts --template-pack templates/ref/template-pack.json
```

## Before / After Changing Code

```bash
# Before
git status --short && pnpm -r typecheck && pnpm test

# After
pnpm -r build && pnpm -r typecheck && pnpm lint && pnpm test

# If export changed
node packages/cli/dist/index.js export examples/demo.json /tmp/demo.pdf
node packages/cli/dist/index.js export examples/demo.json /tmp/demo.pptx
```

## Git Hygiene

- Never commit `.omx/`, `.codex`, `.env`, PDFs, PPTX, or project artifacts.
- `projects/*` is gitignored for local workflow outputs.
- Source in `src/`, build outputs in `dist/`. Don't track generated `.js`/`.d.ts`/`.map`.
- `pnpm lint` passes with the root ESLint 9 flat config and should be run after source changes.
- MinerU tokens: use `MINERU_API_TOKEN` env var, never commit. Live API tests are opt-in.
- Full `pnpm test` currently requires the ignored local `projects/cuszp/dsl/deck.json` fixture for three text-measure/cuSZp tests; report that gap explicitly when absent and include focused passing evidence.

## Where To Read More

- `docs/ARCHITECTURE.md` — package boundaries and data flow
- `docs/PROJECT-STATUS.md` — done/not-done feature state
- `docs/ROADMAP.md` — planned phases
- `docs/WORKFLOW.md` — detailed workflow best practices
- `docs/TEMPLATE-EXTRACTION.md` — template extraction contract, CLI, review gates
- `docs/TEMPLATE-DEPENDENCY-REVIEW.md` — dependency posture for template extraction
- `docs/ADDING-ANIMATIONS.md` — animation system
- `docs/agent-guidance/README.md` — guidance system overview (how to add styles)
- `.omc/plans/agent-guidance-system-v1.md` — guidance system implementation plan
- `.omc/specs/deep-interview-agent-guidance.md` — guidance system requirements spec
