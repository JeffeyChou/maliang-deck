# Ralph Execution Brief

## Goal

Compact and reorganize `docs/` so Maliang Deck documentation is easier to scan, has fewer overlapping files, and preserves the operational contracts needed by contributors and agents.

## Scope

- Inventory current docs and identify duplication.
- Merge files when one canonical document can carry the same contract.
- Shorten verbose status, roadmap, architecture, workflow, authoring, template, and agent-guidance docs.
- Preserve role-doc frontmatter required by the guidance linter.
- Update stale markdown references after merges/deletions.

## Non-goals

- Change source code behavior.
- Rewrite tests except if documentation path changes require it.
- Remove guidance needed by workflow lints or style registry references.
- Run network or live extraction checks.

## Acceptance Criteria

- `docs/` has fewer standalone docs than before and no obvious duplicate shared-constraints file.
- Core docs still cover architecture, workflow, configuration, authoring/runtime extension, template extraction, project status/roadmap, and agent guidance.
- Stale links to removed docs are updated.
- Markdown/source search finds no references to removed docs.
- Role-doc linter passes, or any blocker is documented with exact evidence.

## Validation Commands

- `rg "ROADMAP|ADDING-ANIMATIONS|COMPONENT-MACRO|DSL-FIRST-HYBRID|TEMPLATE-DEPENDENCY|roles/shared-constraints" docs packages tests -g '!docs/ralph-*.md'`
- `pnpm exec vitest run tests/workflow/role-doc-linter.test.ts`
- `wc -l docs/*.md docs/agent-guidance/*.md docs/agent-guidance/roles/*.md docs/agent-guidance/standards/*.md`

## Open Risks

- Some external users may have bookmarked removed docs; internal links will be updated, but external links cannot be preserved without redirect files.
- The role-doc linter may require frontmatter fields to stay exactly valid; preserve frontmatter and only compact bodies.
