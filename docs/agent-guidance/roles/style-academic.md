---
name: style-academic
description: Academic style definition reference. Tokens, layout patterns, palette, typography scale, and quality rules for the academic presentation style.
type: role
dslFieldReferences:
  - meta.canvas.width
  - meta.canvas.height
  - slides[].layout
  - slides[].elements[].type
  - slides[].elements[].x
  - slides[].elements[].y
  - slides[].elements[].style
stageApplicability:
  - deck-plan
  - slide-dsl
---

# Academic Style

| Field | Value |
| --- | --- |
| `styleId` | `academic` |
| Recommended theme | `minimal-white` |
| Personality | Evidence-first, rigorous, understated. |

## Tokens

| Token | Value / Use |
| --- | --- |
| `palette.primary` | `#005587` for headings and key figures. |
| `palette.secondary` | `#1E293B` for body text. |
| `palette.accent` | `#0076A8` for restrained highlights. |
| `palette.neutral` | `#64748B` for captions and source text. |
| `semantic.positive` | `#2E7D32`. |
| `semantic.negative` | `#C62828`. |

Typography uses Inter/Arial for headings and Inter/Calibri for body. Typical sizes: title 28-36px, section heading 22-26px, body 16-20px, caption 12-14px.

## Layout Expectations

- Generous margins and clear evidence hierarchy.
- Figures/tables receive captions and source attribution.
- Body copy supports, not repeats, the assertion title.
- Appendix content is separated and clearly labeled.

## Use With

- `roles/strategist.md`
- `roles/executor-academic.md`
- `standards/shared-constraints.md`
- `standards/quality-checklist.md`
