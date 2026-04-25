# Extraction Workflow Notes

This document records the workflow improvements made after reviewing the initial extraction loop.

## Causes of the initial errors

1. `omx explore` failed because its fast read-only harness required Cargo or a prebuilt binary that was not available in this environment. The extraction fell back to ordinary shell/file inspection.
2. The first generator attempt had a shell-command composition bug: a temporary-script variable assignment was accidentally passed to `mkdir`, so the generated `.mjs` path resolved incorrectly.
3. The first HTML-render attempt used a temporary script under `/tmp`. ESM imports then resolved relative to `/tmp` instead of the repo, and workspace package aliases were not available from that script location.
4. Full `pnpm test` exposed unrelated fixture drift: three existing tests reference `projects/cuszp/dsl/deck.json`, while this checkout contains `projects/cuszp-hpc/dsl/deck.json`.

## Workflow fixes added here

- Committed reusable scripts under `scripts/` so rendering and starter-deck creation are repeatable.
- Scripts resolve the repo root by walking upward to `package.json` with `name: maliang-deck`.
- Scripts import local built packages through absolute file URLs, avoiding `/tmp` and workspace-alias resolution issues.
- Scripts validate generated decks by default and fail with actionable messages when `dist` files are missing.
- `create-deck.mjs` makes `dsl/deck.json` reusable as a pattern library, not just a static screenshot-derived sample.

## Recommended extraction workflow

1. Extract or manually model the visual system into `template-pack.json` and `dsl/deck.json`.
2. Validate both artifacts:

   ```bash
   node packages/cli/dist/index.js validate examples/presentation-design-system-template/dsl/deck.json
   node packages/cli/dist/index.js template validate examples/presentation-design-system-template/template-pack.json
   ```

3. Regenerate HTML preview:

   ```bash
   node examples/presentation-design-system-template/scripts/render-preview.mjs
   ```

4. Smoke-test reuse by creating a new starter deck:

   ```bash
   node examples/presentation-design-system-template/scripts/create-deck.mjs --out /tmp/pds-starter.json
   node examples/presentation-design-system-template/scripts/render-preview.mjs --deck /tmp/pds-starter.json --out /tmp/pds-starter.html
   ```

## What is still not solved

- `template-pack.json` is valid and useful as template metadata, but the repo's current compiler only creates a simple sample from a template pack.
- Rich content-to-slide generation still needs a higher-level generator that selects archetypes, maps content roles into slots, and fills chart/table/media data intentionally.
- Manual extraction from a composite image remains approximate. Exact brand colors, image assets, and micro-layout values should be reviewed against source design files when available.
