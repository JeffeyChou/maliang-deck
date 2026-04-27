# Template Extraction

Template extraction is a workflow-level subsystem for turning reference PPTX, HTML, PDF, or PNG material into draft `TemplatePack` artifacts. Packs provide style and layout guidance; renderers and exporters still consume ordinary deck DSL only.

## Status

Implemented v1:

- deterministic local adapters for PPTX, HTML, PDF, and PNG references;
- `TemplateExtractionIR`, draft `TemplatePack`, coverage report, and advisory threshold artifacts;
- compile layer into existing `StyleDefinition`, `DeckDesign`, `SlideDesign`, and `WorkOrderGuidance` surfaces;
- sample generation to ordinary JSON DSL and HTML preview;
- `maliang-deck template extract|validate|sample|list`;
- renderer-unaware tests and CLI smoke coverage.

## Architecture

```text
reference files
  -> source adapters
  -> TemplateExtractionIR
  -> draft TemplatePack + coverage evidence
  -> review/approval
  -> compiled guidance/style surfaces
  -> ordinary deck DSL generation
```

Key boundary: template fragments are generation guidance, not renderer input. Draft packs are excluded from generation-safe style listings unless explicitly included or approved.

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

Threshold proposals are review evidence only until a human explicitly approves that policy.

## Review Checklist

- Provenance lists every reference file and extracted observation source.
- Coverage report shows which tokens, layouts, slots, and fragments were inferred.
- Warnings are acceptable for lower-confidence PDF/PNG observations.
- Sample deck renders as ordinary DSL/HTML without renderer template awareness.
- Pack activation state is appropriate: draft for review, approved only after explicit acceptance.

## Dependency and Security Notes

The v1 implementation adds no parser, image, browser, or native runtime dependencies. Lightweight adapters use bounded deterministic parsing:

- PPTX: minimal ZIP central-directory reader plus XML token extraction.
- HTML: static string parsing for text/style hints; scripts are stripped and no browser/network runtime is used.
- PDF: static header, MediaBox, encryption, and text-token scan; semantic confidence is intentionally low.
- PNG: signature/IHDR/PLTE scan only; no native image processing.

Rejected for v1 because they were not needed for deterministic fixtures: `sharp`, Playwright, PDF.js, JSZip, fast-xml-parser, parse5/jsdom, and pngjs.

Future parser, browser, PDF-renderer, or native-image dependencies require a new dependency review plus security/resource-limit tests.

Current safety controls include PPTX/ZIP traversal rejection, corrupt archive rejection, HTML script/network ignore behavior, PDF encryption/resource-limit rejection, PNG signature/IHDR validation, and no network fetches.

## Confidence Limits

Template extraction does not promise pixel-perfect cloning and is not a full importer from PPTX/PDF/HTML/PNG to DSL. PDF and PNG observations are lower confidence; PNG is visual-only unless OCR/annotation support is added later.

## Verification

Current focused verification:

```bash
pnpm test tests/workflow
pnpm test tests/schema
pnpm test tests/renderer-html tests/renderer-svg tests/exporter
pnpm -r build
pnpm -r typecheck
pnpm lint
```

Also smoke `template extract`, `validate`, `sample`, and `list` when template code changes.
