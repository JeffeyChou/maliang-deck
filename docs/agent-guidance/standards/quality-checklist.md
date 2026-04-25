---
name: quality-checklist
description: Per-style pass/fail quality checks for Maliang Deck slide DSL.
type: role
dslFieldReferences:
  - meta.canvas.width
  - meta.canvas.height
  - slides[].id
  - slides[].elements[].type
  - slides[].elements[].x
  - slides[].elements[].y
  - slides[].notes
stageApplicability:
  - slide-dsl
---

# Quality Checklist

Items marked `error` should block assembly or delivery. Items marked `warning` should be fixed before final handoff when practical.

## Universal

| Severity | Check |
| --- | --- |
| error | All slide IDs are unique and stable. |
| error | No essential element leaves the canvas safe area. |
| error | Required citations and source refs are present in notes. |
| warning | Text is readable, aligned, and not overcrowded. |
| warning | Colors, fonts, and spacing match locked style tokens. |
| warning | PDF/PPTX outputs do not rely on HTML-only motion. |

## Academic

| Severity | Check |
| --- | --- |
| warning | Slide titles state findings, not topics. |
| warning | Each slide carries one main claim and stays at medium density or lower. |
| error | Every figure has a source-attributed caption. |
| error | Data points include baseline, control, prior-period, or comparison context. |
| warning | Statistical significance, limitations, and methods caveats are in notes when relevant. |

## Consulting

| Severity | Check |
| --- | --- |
| warning | Deck follows SCQA: situation, complication, question, answer. |
| warning | Each content slide has an assertion headline. |
| error | Each content slide has a clear takeaway band or equivalent conclusion element. |
| error | Every metric has benchmark, target, or prior-period context. |
| warning | Categories are MECE where analysis claims require it. |
