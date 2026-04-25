---
name: style-consulting
description: Consulting style definition reference. Tokens, layout patterns, palette, typography scale, and quality rules for the consulting presentation style (general and MBB-level).
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

# Consulting Style

| Field | Value |
| --- | --- |
| `styleId` | `consulting` |
| Recommended theme | `minimal-white` |
| Personality | Conclusion-first, executive-grade, sparse. |

## Tokens

| Token | Value / Use |
| --- | --- |
| `palette.primary` | `#005587` for title assertions and key data. |
| `palette.secondary` | `#1E293B` for body/takeaway text. |
| `palette.accent` | `#D04A02` for rare emphasis. |
| `palette.neutral` | `#64748B` for footers and labels. |
| `semantic.positive` | `#2E7D32`. |
| `semantic.negative` | `#C62828`. |
| `semantic.baseline` | `#94A3B8`. |

Typography uses Inter/Arial for headings and Inter/Calibri for body. Typical sizes: title 24-28px, takeaway 15-17px bold, body 14-16px, footer/source 10-12px.

## Layout Expectations

- Assertion headline plus clear support.
- Takeaway band on analytical slides.
- Low visual noise and strong alignment.
- Data always includes context: target, benchmark, peer, prior period, or contribution to total.
- Footers carry source attribution.

## Use With

- `roles/strategist.md`
- `roles/executor-consulting.md`
- `standards/shared-constraints.md`
- `standards/quality-checklist.md`
