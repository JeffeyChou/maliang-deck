---
name: quality-checklist
description: Per-style pass/fail quality checklists for Maliang Deck agent guidance. Academic and consulting styles with lint severity levels.
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

# Quality Checklists

Per-style pass/fail checklists for slide DSL authoring. Items marked **[error]** block `workflow assemble`. Items marked **[warning]** report in output but do not block.

---

## Academic Style Checklist

### Content

- [ ] **[warning]** Every slide title states a finding, not a topic ("Stratified sampling eliminates bias" not "Methodology")
- [ ] **[warning]** No slide exceeds `density: 'medium'` (max 8 body lines)
- [ ] **[error]** Every data point has comparison context (prior period, control group, or baseline)
- [ ] **[error]** Every figure has a source-attributed caption element
- [ ] **[error]** `slides[].notes` contains full citation for every external claim or figure
- [ ] **[warning]** Appendix slides are separated from main deck slides (labeled "Appendix" in `slides[].id`)

### Visual

- [ ] **[warning]** Colors limited to declared palette tokens — no ad-hoc hex colors
- [ ] **[warning]** Font family consistent across all slides (matches `typographyScaleId`)
- [ ] **[error]** No element extends beyond canvas safe area (40px margins)
- [ ] **[warning]** Figures use `image.fit: "contain"` (not `"fill"`)
- [ ] **[warning]** Figure + caption grouped as `type: "group"` element

### Labels and Contrast

- [ ] **[warning]** All chart axes labeled with units
- [ ] **[warning]** All chart data series labeled (legend or direct label)
- [ ] **[warning]** Text contrast ratio ≥ 4.5:1 against background (WCAG AA)
- [ ] **[warning]** Colorblind-safe palette (no red-green only distinction for data)

### Tone and Rigor

- [ ] **[warning]** No unverified claims — every assertion traceable to a `sourceRef` or cited in notes
- [ ] **[warning]** Statistical significance reported where applicable (p-value, CI, effect size)
- [ ] **[warning]** Limitations acknowledged (at least in `slides[].notes` if not on slide)

---

## Consulting Style Checklist

### Narrative Structure (SCQA)

- [ ] **[warning]** Cover and first slide establish Situation + Complication
- [ ] **[warning]** Executive summary slide answers the Question with the Answer
- [ ] **[warning]** Body slides elaborate the Answer with supporting evidence
- [ ] **[warning]** Closing slide has a clear call to action

### Content — Pyramid Principle

- [ ] **[warning]** Every content slide title is an assertion, not a description
- [ ] **[error]** Every content slide has a takeaway band element (position y≈80, bold, one-sentence conclusion)
- [ ] **[error]** Every data metric has comparison context (benchmark, prior period, or target)
- [ ] **[error]** Every data-containing slide has source attribution in footer element
- [ ] **[error]** `slides[].notes` contains full source citations and pyramid-structured script

### Chart and Data Integrity

- [ ] **[warning]** Chart type matches content (trends → line, comparisons → bar, composition → donut)
- [ ] **[warning]** All chart axes and series labeled
- [ ] **[warning]** No more than 7 categories in a single chart (use table for larger datasets)
- [ ] **[warning]** MECE verified for all categorized analysis (noted in `slides[].notes`)
- [ ] **[warning]** Waterfall chart factors sum to total (or "Other" category labeled)

### Visual Discipline

- [ ] **[warning]** Maximum 3 primary colors per slide
- [ ] **[warning]** Accent color used at most 2–3 times per deck
- [ ] **[error]** No element extends beyond canvas safe area (40px margins)
- [ ] **[warning]** Colors serve information — no decorative color choices
- [ ] **[warning]** Data series differentiated by opacity variation, not different hues
- [ ] **[warning]** Accent bar present on all content pages (y=0, h=6, full width)

### Labels and Contrast

- [ ] **[warning]** Text contrast ratio ≥ 4.5:1 against background (WCAG AA)
- [ ] **[warning]** KPI numbers large enough to read at presentation distance (≥ 36px)
- [ ] **[warning]** Footer on every content slide (source | CONFIDENTIAL | page number)

---

## Shared Checklist (All Styles)

- [ ] **[error]** All `slides[].id` values are unique and non-empty
- [ ] **[error]** `meta.canvas.width` and `meta.canvas.height` match the locked `deckDesign.canvas`
- [ ] **[error]** No element coordinates produce overlapping bounding boxes (unless intentional layering)
- [ ] **[error]** No image element uses `fit: "fill"` with photographic content
- [ ] **[warning]** All `slides[].elements[].type` values are valid schema types
- [ ] **[warning]** `slides[].notes` non-empty on every slide with external data or figures
- [ ] **[warning]** Margin and spacing tokens not overridden per-slide

---

## Severity Reference

| Severity | Triggered by | Effect |
|----------|-------------|--------|
| `error` | `lintDeck()` error-severity rules | Blocks `workflow assemble` |
| `warning` | `lintDeck()` warning-severity rules | Reported in output; does not block |

Run `workflow assemble` to trigger the full lint pass. Resolve all errors before proceeding to `workflow build`.
