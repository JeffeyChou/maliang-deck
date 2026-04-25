# Template Extraction System

Maliang Deck template extraction is a workflow-level subsystem. It converts reference PPTX, HTML, PDF, or PNG material into a draft `TemplatePack` with design tokens, layout archetypes, slot boxes, DSL fragment guidance, provenance, and coverage evidence.

## Current implementation status

Status: **implemented v1**. The system is intentionally deterministic and dependency-light: no parser/browser/native packages were added. It supports draft extraction from PPTX, HTML, PDF, and PNG references, writes coverage and advisory threshold artifacts, generates sample ordinary DSL/HTML output, and exposes `maliang-deck template extract|validate|sample|list`.

Verification recorded for the current implementation:

- `pnpm -r build`
- `pnpm -r typecheck`
- `pnpm lint`
- `pnpm test tests/workflow`
- `pnpm test tests/schema`
- `pnpm test tests/renderer-html tests/renderer-svg tests/exporter`
- template CLI extract/validate/sample/list smoke

Known full-suite gap: `pnpm test` still needs the ignored local `projects/cuszp/dsl/deck.json` fixture for three text-measure/cuSZp tests.

## Architecture

1. Source adapters read untrusted inputs and emit `TemplateExtractionIR` only.
2. Inference converts IR into a draft `TemplatePack`.
3. The compiler maps approved packs into existing guidance surfaces (`StyleDefinition`, `DeckDesign`, and `WorkOrderGuidance`).
4. Sample decks are ordinary Maliang Deck JSON DSL.
5. Renderers and exporters stay template-unaware and consume only deck DSL.

## CLI

```bash
maliang-deck template extract deck.pptx --out templates/acme --id acme
maliang-deck template validate templates/acme/template-pack.json
maliang-deck template sample templates/acme/template-pack.json --out projects/acme-sample
maliang-deck template list --include-drafts --template-pack templates/acme/template-pack.json
```

Extraction writes:

- `extraction-ir.json`
- `template-pack.json`
- `coverage-report.json`
- `coverage-thresholds.proposed.json`

Threshold proposals are advisory review evidence only. They are not enforced as final gates until a human explicitly approves that policy.

## Security and dependency review

The v1 implementation intentionally adds no parser, image, browser, or native dependencies. The lightweight adapters use deterministic local parsing and never call external LLM/API providers. Heavyweight additions remain behind dependency review:

- PPTX: JSZip + fast-xml-parser may replace the built-in OpenXML-lite ZIP/XML reader if richer shape geometry is required.
- HTML: parse5/jsdom may replace static regex extraction; Playwright should be added only if rendered screenshot/layout evidence is explicitly approved.
- PDF: pdfjs-dist may improve text and image extraction, with resource limits retained.
- PNG/image: pngjs can improve palette parsing; sharp should require explicit native-processing justification.

Current safety controls include PPTX/ZIP traversal rejection, corrupt archive rejection, HTML script/network ignore behavior, PDF encryption/resource-limit rejection, PNG signature/IHDR validation, and no network fetches.

## Confidence limits

This system does not promise pixel-perfect cloning and is not a full importer from PPTX/PDF/HTML/PNG to DSL. PDF and PNG observations are lower confidence; PNG is visual-only unless external annotation/OCR is added later. Draft template packs do not appear in generation-safe style lists unless explicitly included or approved.
