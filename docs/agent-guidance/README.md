# Agent Guidance

Maliang Deck uses structured TypeScript guidance plus short narrative role docs.

| Layer | Owns |
| --- | --- |
| `packages/workflow/src/guidance/` | Valid styles, tokens, lint rules, schema paths, and work-order enrichment. |
| `docs/agent-guidance/` | Human-readable guidance for strategy, slide authoring, style choices, and quality review. |

The structured layer proves output stays inside the style contract. The markdown layer tells agents what to choose.

## Style Identity

`styleId` selects the guidance/design system (`academic`, `consulting`). `deckDesign` in `planning/deck-plan.json` is the project style contract for DSL colors, fonts, spacing, margins, layout patterns, and approved asset refs. `theme` selects runtime CSS rendering for HTML only; do not use `meta.theme` as style identity.

## Workflow Use

Guidance enriches:

- `workflow outline`: audience, story arc, and evidence expectations;
- `workflow plan-deck`: layout and token recommendations;
- `workflow generate-dsl`: role-specific slide authoring constraints;
- `workflow assemble`: blocking errors and non-blocking warnings.

For motion-heavy slides, follow [assets/ANIMATIONS.md](../../assets/ANIMATIONS.md) first: identify the DSL surface, check slide density, match the effect to the slide role, and verify reduced-motion/export behavior before choosing an effect.

## Role Docs

| Document | Role |
| --- | --- |
| `roles/strategist.md` | Outline and deck-plan authoring. |
| `roles/executor-academic.md` | Academic slide DSL authoring. |
| `roles/executor-consulting.md` | Consulting slide DSL authoring. |
| `roles/style-academic.md` | Academic style token reference. |
| `roles/style-consulting.md` | Consulting style token reference. |
| `standards/shared-constraints.md` | Cross-style DSL constraints. |
| `standards/quality-checklist.md` | Final pass/fail checks. |

Every role doc must keep YAML frontmatter with `dslFieldReferences` and `stageApplicability`; `tests/workflow/role-doc-linter.test.ts` validates references against `@maliang-deck/schema`.

## Template Packs

Extracted template packs are file-backed style/guidance inputs. Draft packs are not generation-safe by default; approve or explicitly include them before use. See [Template Extraction](../TEMPLATE-EXTRACTION.md).

## Adding a Style

1. Add a `StyleDefinition` under `packages/workflow/src/guidance/styles/`.
2. Register it in `guidance/index.ts`.
3. Add executor and style role docs with valid frontmatter.
4. Run the role-doc linter:

```bash
pnpm exec vitest run tests/workflow/role-doc-linter.test.ts
```
