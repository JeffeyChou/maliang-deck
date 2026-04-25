# Agent Guidance System

Maliang Deck uses a **hybrid guidance system** that combines a structured TypeScript core with narrative role documents.

## How It Works

```
Structured core (TypeScript)          Narrative docs (Markdown)
─────────────────────────────         ──────────────────────────
packages/workflow/src/guidance/       docs/agent-guidance/
  types.ts          ← DSL types         roles/strategist.md
  style-registry.ts ← Style store       roles/executor-academic.md
  lint-rules.ts     ← DSL lints         roles/executor-consulting.md
  work-order-enricher.ts               roles/shared-constraints.md
  role-doc-linter.ts ← CI linter        roles/style-academic.md
  schema-paths.ts   ← Valid paths       roles/style-consulting.md
                                        standards/shared-constraints.md
                                        standards/quality-checklist.md
```

**The structured core** owns "what's valid" — palette tokens, layout coordinates, lint rules, quality checks. It validates DSL conformance programmatically.

**The narrative docs** own "what's good" — design judgment, storytelling frameworks, visual rhythm, professional expression standards. They teach agents *what to choose*.

The hybrid succeeds when: role docs teach the agent *what to choose*, and the TypeScript layer proves the result *stayed inside the chosen style contract*.

## Style Identity vs Theme

| Field | Purpose | Set at |
|-------|---------|--------|
| `styleId` | Guidance/design system identity (`academic`, `consulting`) | Intake / project.json |
| `theme` | Runtime CSS theme (`minimal-white`, `dark-gradient`) | Render time |

Do not overload `meta.theme` for style purposes. `styleId` drives work-order enrichment and quality lints. `theme` drives HTML/SVG rendering only.

## Workflow Integration

Guidance enriches all three authoring stages:

```
workflow outline     ← enriched with audience analysis + story arc guidance
workflow plan-deck   ← enriched with layout recommendations + locked tokens
workflow generate-dsl ← each slide work order carries structured guidance + role doc refs
workflow assemble    ← runs DSL lints; errors block assembly
```

## Role Documents

Each role doc targets a specific agent role and workflow stage:

| Document | Role | Stages |
|----------|------|--------|
| `roles/strategist.md` | Content planner | outline, deck-plan |
| `roles/executor-academic.md` | Academic slide author | slide-dsl |
| `roles/executor-consulting.md` | Consulting slide author | slide-dsl |
| `roles/shared-constraints.md` | All roles (DSL rules) | all |
| `roles/style-academic.md` | Academic style token reference | deck-plan, slide-dsl |
| `roles/style-consulting.md` | Consulting style token reference | deck-plan, slide-dsl |
| `standards/shared-constraints.md` | Cross-style authoring rules | all |
| `standards/quality-checklist.md` | Per-style pass/fail checklists | slide-dsl |

## YAML Frontmatter

Every role doc must have YAML frontmatter with two required fields:

```yaml
---
name: executor-academic
description: One-line description of this role doc's purpose.
type: role
dslFieldReferences:
  - meta.canvas.width
  - slides[].id
  - slides[].elements[].type
stageApplicability:
  - slide-dsl
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `dslFieldReferences` | Yes | DSL field paths this doc references. Validated by role-doc-linter against `@maliang-deck/schema`. |
| `stageApplicability` | Yes | Which workflow stages this doc applies to: `outline`, `deck-plan`, `slide-dsl`. |

The CI linter (`lintRoleDocs()`) validates all `dslFieldReferences` against the field path inventory in `packages/workflow/src/guidance/schema-paths.ts`. **If a schema field is removed or renamed, the linter catches stale references.**

## Extracted Template Packs

Extracted template packs are a file-backed source of style/guidance data, not a renderer feature. A pack becomes generation-safe only after review and approval; draft packs may be validated or sampled explicitly but should not appear in default style listings. The compile layer maps approved packs into the same `StyleDefinition`, `DeckDesign`, `SlideDesign`, and `WorkOrderGuidance` surfaces documented here.

For extraction review criteria, dependency gates, and CLI expectations, see [`../TEMPLATE-EXTRACTION.md`](../TEMPLATE-EXTRACTION.md).

## Adding a New Style

1. Create `packages/workflow/src/guidance/styles/my-style.ts` implementing `StyleDefinition`
2. Register it: `registerStyle(myStyle)` in `guidance/index.ts`
3. Create `docs/agent-guidance/roles/executor-my-style.md` with valid frontmatter
4. Create `docs/agent-guidance/roles/style-my-style.md` as the token reference
5. Run `pnpm test` — the linter integration test will validate frontmatter automatically

## Running the Linter

```typescript
import { lintRoleDocs } from '@maliang-deck/workflow';
import { join } from 'node:path';

const result = lintRoleDocs(join(process.cwd(), 'docs/agent-guidance'));
if (!result.pass) {
  console.error(result.errors);
  process.exit(1);
}
```

Or just run `pnpm test` — the test in `tests/workflow/role-doc-linter.test.ts` lints all role docs automatically.
