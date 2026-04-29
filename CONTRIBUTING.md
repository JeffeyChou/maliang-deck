# Contributing to Maliang Deck

Thanks for your interest in contributing. Maliang Deck is a DSL-first slide
workflow, and contributions are most helpful when they strengthen that model:
JSON deck DSL stays the source of truth, while HTML, SVG, PDF, and PPTX are
generated outputs.

## Good First Contributions

- Documentation improvements and typo fixes
- Small bug fixes with clear reproduction steps
- Focused renderer or exporter fixes
- New examples that demonstrate existing DSL features clearly
- Tests for schema, workflow, renderer, or export behavior

## Discuss First

For larger changes, please open an issue first so we can align on direction
before you spend time on an implementation. This is especially helpful for:

- new DSL element types or public schema changes;
- major runtime features, animation systems, or editor behavior;
- PDF/PPTX export behavior changes;
- new extraction providers;
- workflow gate changes;
- broad refactors, renames, or package-boundary changes.

This keeps review practical and makes it easier for your work to land.

## Pull Request Expectations

- Keep each PR focused on one concern.
- Explain what changed, why it changed, and how it was tested.
- Include reproduction steps for bug fixes.
- Avoid unrelated formatting churn.
- Do not hand-edit generated export artifacts as the canonical change; update
  the source DSL, workflow code, renderer code, or docs instead.

## Local Checks

Run the checks that match your change:

```bash
pnpm lint
pnpm -r typecheck
pnpm test
pnpm -r build
```

If your change affects rendering or export behavior, also validate and export a
representative deck:

```bash
pnpm validate examples/dreamy-blur-physics/deck.json
pnpm export examples/dreamy-blur-physics/deck.json out.pdf --format pdf
pnpm export examples/dreamy-blur-physics/deck.json out.pptx --format pptx
pnpm export examples/dreamy-blur-physics/deck.json out-html --format html
```

## License

Maliang Deck uses a dual-license model: AGPL for the open-source community path,
and commercial licenses for teams that need different terms. To keep that model
workable, contributions need clear inbound rights.

By submitting a contribution, you agree that:

- your contribution is licensed to the public under AGPL-3.0-or-later;
- you grant the project maintainer a perpetual, worldwide, non-exclusive,
  irrevocable, royalty-free license to use, reproduce, modify, distribute,
  sublicense, and relicense your contribution as part of Maliang Deck, including
  under commercial license terms;
- you have the right to submit the contribution under these terms;
- if these terms do not work for you, please open an issue before submitting so
  we can discuss whether another path is appropriate.

This is the project's lightweight inbound contribution rule. A formal CLA may be
introduced later for larger commercial partnerships or major contributions.

See [LICENSE](./LICENSE), [DUAL-LICENSE.md](./DUAL-LICENSE.md), and
[COMMERCIAL.md](./COMMERCIAL.md).
