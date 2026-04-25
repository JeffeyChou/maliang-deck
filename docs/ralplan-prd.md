# Ralplan PRD: Editable Slide Runtime Upgrade

## Problem

Maliang Deck has an editor lane, but it behaves like a persistent bottom inspector rather than the referenced slide-first editor. The current runtime lacks multi-selection, redo, rich text style controls, thumbnail-based Pages management, slide deletion, and the reference hover-revealed chrome. Slide preview mode exists through `?preview=N`, but the editor setup does not make Pages thumbnails or editor navigation use that model.

## Goals

- Let users move selected slide objects directly on the active slide.
- Support `Ctrl+click` multi-select for editable top-level objects.
- Resize text boxes and rely on CSS reflow so text wraps to the new width.
- Edit selected text object font weight, italic state, font family, and font size.
- Provide Undo and Redo for unsaved editor commands.
- Replace the always-visible editor panel with reference-style top-left hover chrome.
- Add a Pages sidebar with slide thumbnails, drag reorder, and delete.
- Persist supported geometry/style/reorder/delete changes through the existing editor save endpoint.

## Non-Goals

- Inline rich text spans within one text box; Maliang DSL currently stores text as a plain string plus box-level style fields.
- Editing nested group/layout descendants.
- Persisting generated MJS scripts when editing assembled `dsl/deck.json`.
- Full visual parity with `frontend-slides-editable`; this adapts its editor interaction model to Maliang's DSL/runtime.

## Decision Drivers

- Keep the JSON DSL as the source of truth.
- Reuse current renderer metadata and save endpoint.
- Avoid wholesale copying the reference single-file runtime because Maliang has navigation, presenter, FX, and timeline code already.
- Keep changes testable with existing Vitest runtime/source-contract tests plus schema/store tests.

## Options Considered

- Copy the reference runtime into Maliang HTML output. Rejected because it would conflict with existing deck scaling, navigation, presenter preview, runtime config, and save API.
- Build a separate editor application shell. Rejected as too large for this request and inconsistent with current standalone HTML preview output.
- Adapt the reference interaction design inside `runtime/runtime.js` and extend schema patch ops. Selected because it preserves Maliang architecture while covering the requested behavior.

## Accepted Approach

Implement a Maliang-native editor lane:

- Renderer continues emitting `data-maliang-deck-editable` on top-level text and rect elements.
- Runtime creates a fixed top-left hover cluster with `Edit`, `Pages`, `Save`, and edit-only `Undo`, `Redo`, `Done`.
- Runtime tracks a selected set instead of one selected node; drag moves the whole group and resize targets the primary selected object.
- Text controls are a floating toolbar for selected/focused text objects and write box-level `fontWeight`, `fontStyle`, `fontFamily`, and `fontSize`.
- Pages sidebar renders cloned slide thumbnails, supports drag/drop reorder and delete, and records `reorderSlides` / `deleteSlide` operations.
- Schema editor patch contract adds `deleteSlide` plus text style fields.

## Architect Review

The selected approach keeps persistence in `packages/schema/src/editor-patch.ts` and `packages/cli/src/editor/store.ts`, avoiding DOM-only saves. The main risk is the size of `runtime/runtime.js`; mitigation is to constrain the edit to the existing editor lane and add source-contract tests around behavior strings.

## Critic Review

Acceptance criteria must distinguish box-level text styling from inline selection styling. Thumbnail drag/drop is acceptable as Pages sidebar reordering, while up/down buttons are insufficient. Deleting the final slide should be blocked to keep valid decks.

## Acceptance Criteria

- Editor chrome is not always visible; controls appear from the top-left hover cluster.
- `Ctrl+click` can select and move multiple editable objects together.
- Resizing a text object changes its width/height and text wraps inside the box.
- Selected text objects can toggle bold/italic and set font family/font size.
- Undo and redo buttons plus keyboard shortcuts work for unsaved editor commands.
- Pages sidebar shows slide previews, supports drag reorder, and delete.
- Save persists geometry, text style, reorder, and delete operations to the deck JSON.

## Verification Plan

- Run targeted Vitest tests for schema/editor store/runtime contracts.
- Run TypeScript typecheck for changed packages if time permits.
- Manual smoke path: serve a deck, enter editor, move/resize/text-style, reorder/delete in Pages, save and confirm reload.
