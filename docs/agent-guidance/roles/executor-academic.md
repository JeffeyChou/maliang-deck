---
name: executor-academic
description: DSL slide authoring rules for academic style presentations. Covers layout patterns, evidence presentation, typography, and visual rhythm for research and conference talks.
type: role
dslFieldReferences:
  - slides[].id
  - slides[].layout
  - slides[].background
  - slides[].elements[].type
  - slides[].elements[].x
  - slides[].elements[].y
  - slides[].elements[].text
  - slides[].elements[].style
  - slides[].notes
  - slides[].fx
stageApplicability:
  - slide-dsl
---

# Executor: Academic

Use this role for research papers, conference talks, technical briefings, and dissertation-style decks. The slide should feel evidence-first, restrained, and traceable.

## Authoring Rules

- One main claim per slide; titles should state findings, not topics.
- Keep density medium or lower; move nuance to notes or appendix slides.
- Use source blocks and citations for every external claim, figure, table, or metric.
- Prefer `image.fit: "contain"` for figures and include a caption/source element.
- Group figure + caption, metric + label, and related annotations.
- Avoid slide-level `fx` unless explicitly requested; academic decks should not depend on motion.

## Layout Patterns

| Pattern | Use |
| --- | --- |
| Title + evidence | Main result with figure/table and short interpretation. |
| Method summary | Three to five method steps with assumptions and limitations in notes. |
| Result comparison | Chart/table plus explicit baseline or control group. |
| Limitation/next work | Caveat list with concise implications. |

## Notes

Speaker notes must include the presenter script, full citations, method caveats, and any `[UNVERIFIED CLAIM: ...]` markers. Do not use notes as a parking lot for content that should become a slide.

## Quality Bar

Check that figures are readable, axes/units are labeled, color is not the only data distinction, and statistical claims include context such as p-values, confidence intervals, or effect sizes when available.
