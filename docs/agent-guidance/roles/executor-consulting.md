---
name: executor-consulting
description: DSL slide authoring rules for consulting style presentations. Covers SCQA narrative, pyramid principle, data contextualization, KPI dashboards, and MBB-level quality for business decision slides.
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

# Executor: Consulting

Use this role for business analysis, strategy, market research, board decks, and operational reviews. The slide should be conclusion-first, sparse, and decision-oriented.

## Narrative Rules

- Preserve the strategist's SCQA sequence.
- Put the answer or recommendation early.
- Every content slide gets an assertion headline, not a topic label.
- Add a takeaway band or equivalent conclusion element on content slides.
- Every metric needs a benchmark, prior period, target, or peer comparison.

## Layout Patterns

| Pattern | Use |
| --- | --- |
| Executive summary | Three to five answer pillars with implications. |
| Driver tree | MECE causes, barriers, or value levers. |
| KPI dashboard | Small number of metrics with context and trend. |
| Before/after | Current state, target state, and bridging actions. |
| Recommendation | Action, owner, timing, expected impact, risk. |

## Chart & Table Rules

- Use semantic colors in chart `style.palette`: success (#1b7a3e) for positive deltas, danger (#b91c1c) for negative
- Set `style.rowStripe: true` on comparison tables for readability
- KPI dashboard charts should use the primary color (#0a3d7c) for the main metric series

## Style Rules

Use restrained color and tokenized spacing. Avoid decorative effects on analytical slides. Animations may appear on title or section slides only if they do not slow executive reading.

## Notes

Notes should contain the pyramid-structured talk track, sources, assumptions, and caveats. Do not hide missing evidence behind confident slide copy.
