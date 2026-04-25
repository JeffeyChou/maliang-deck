import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const runtimeSource = readFileSync(join(process.cwd(), 'runtime', 'runtime.js'), 'utf-8');

describe('HTML slide editor runtime lane', () => {
  it('performs the editor capability handshake and falls back to temporary-edit-only mode', () => {
    expect(runtimeSource).toContain("const EDITOR_ENDPOINT = '/__maliang-deck/editor'");
    expect(runtimeSource).toContain("fetch(EDITOR_ENDPOINT, { method: 'GET'");
    expect(runtimeSource).toContain('enterTemporaryEditorMode');
    expect(runtimeSource).toContain('Temporary edits only: save endpoint unavailable.');
    expect(runtimeSource).toContain('editorState.canPersist = !!capabilities.canPersist');
    expect(runtimeSource).toContain('Array.isArray(capabilities.warnings)');
    expect(runtimeSource).toContain("capabilities.warnings.join(' ')");
    expect(runtimeSource).not.toContain("' · ' + capabilities.mjsDivergenceWarning");
  });

  it('keeps editor initialization out of preview-only iframes', () => {
    const previewStart = runtimeSource.indexOf('if (isPreviewMode)');
    const previewEnd = runtimeSource.indexOf('return;\n    }', previewStart);
    const previewBlock = runtimeSource.slice(previewStart, previewEnd);

    expect(previewBlock).toContain("document.documentElement.setAttribute('data-preview', '1')");
    expect(previewBlock).not.toContain('initEditorLane()');
    expect(runtimeSource.indexOf('initEditorLane();')).toBeGreaterThan(previewEnd);
  });

  it('selects only explicitly editable text/rect-like targets and suppresses navigation while editing', () => {
    expect(runtimeSource).toContain("closest('[data-maliang-deck-editable]')");
    expect(runtimeSource).toContain("tokens.indexOf('geometry') >= 0");
    expect(runtimeSource).toContain("tokens.indexOf('text') >= 0");
    expect(runtimeSource).toContain("tokens.indexOf('rect-style') >= 0");
    expect(runtimeSource).toContain('window.__maliangDeckEditorActive = editorIsActive');
    expect(runtimeSource).toContain("if (window.__maliangDeckEditorActive && window.__maliangDeckEditorActive())");
    expect(runtimeSource).toContain("case 'ArrowRight': case 'PageDown': go(idx+1, false, { skipTimeline: true })");
  });

  it('converts viewport movement/resizing through CSS slide scale before creating constrained ops', () => {
    expect(runtimeSource).toContain('function slideSpaceScale(slide)');
    expect(runtimeSource).toContain('function viewportToSlideDelta(slide, dx, dy)');
    expect(runtimeSource).toContain('dx: dx / (scale.x || 1)');
    expect(runtimeSource).toContain('dy: dy / (scale.y || 1)');
    expect(runtimeSource).toContain("addEditorOp(item.el, { x: numberFromStyle(item.el, 'left', item.left), y: numberFromStyle(item.el, 'top', item.top) })");
    expect(runtimeSource).toContain("addEditorOp(drag.el, { width: numberFromStyle(drag.el, 'width', drag.startWidth), height: numberFromStyle(drag.el, 'height', drag.startHeight) })");
  });

  it('creates pending text/font/rect style ops, transient undo, and save payloads with baseRevision', () => {
    expect(runtimeSource).toContain("['x', 'y', 'width', 'height', 'content', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'fill', 'stroke', 'strokeWidth', 'radius']");
    expect(runtimeSource).toContain("addEditorOp(el, { content: after })");
    expect(runtimeSource).toContain("addEditorOp(el, { fontSize: fontSize })");
    expect(runtimeSource).toContain("applyEditorRectStyle('fill'");
    expect(runtimeSource).toContain("applyEditorRectStyle('stroke'");
    expect(runtimeSource).toContain("applyEditorRectNumberStyle('strokeWidth'");
    expect(runtimeSource).toContain("applyEditorRectNumberStyle('radius'");
    expect(runtimeSource).toContain('editorState.undoStack');
    expect(runtimeSource).toContain('editorState.redoStack');
    expect(runtimeSource).toContain("op: 'updateElement'");
    expect(runtimeSource).toContain('changes: safePatch');
    expect(runtimeSource).not.toContain("type: 'updateElement'");
    expect(runtimeSource).not.toContain('patch: safePatch');
    expect(runtimeSource).toContain('const payload = { baseRevision: editorState.baseRevision, ops: editorState.pendingOps.slice() }');
    expect(runtimeSource).toContain("fetch(EDITOR_SAVE_ENDPOINT");
    expect(runtimeSource).toContain('location.reload()');
    expect(runtimeSource).toContain("err.status === 409 ? 'Stale revision: '");
  });

  it('supports slide reorder operations and structured save errors', () => {
    expect(runtimeSource).toContain('function ensureEditorReorderDrawer()');
    expect(runtimeSource).toContain('function escapeEditorHtml(value)');
    expect(runtimeSource).toContain('function reorderEditorSlide(index, nextIndex)');
    expect(runtimeSource).toContain("op: 'reorderSlides'");
    expect(runtimeSource).toContain("op: 'deleteSlide'");
    expect(runtimeSource).toContain('slideIds: editorState.slideOrder.slice()');
    expect(runtimeSource).toContain('maliang-deck-editor-page-thumb');
    expect(runtimeSource).toContain("body.error || {}");
    expect(runtimeSource).toContain('serverError.message');
    expect(runtimeSource).toContain('serverError.path.join');
    expect(runtimeSource).not.toContain("new Error(body.error || body.message");
  });

  it('adopts reference-style editor chrome, multi-select, redo, and text styling controls', () => {
    expect(runtimeSource).toContain("'<button type=\"button\" data-role=\"slides\">Pages</button>'");
    expect(runtimeSource).toContain("'<button type=\"button\" data-role=\"redo\" disabled>Redo</button>'");
    expect(runtimeSource).toContain("'<button type=\"button\" data-role=\"done\">Done</button>'");
    expect(runtimeSource).toContain('maliang-deck-editor-textbar');
    expect(runtimeSource).toContain('selectedItems: []');
    expect(runtimeSource).toContain('selectEditorElement(target, !!e.ctrlKey)');
    expect(runtimeSource).toContain("toggleEditorTextStyle('fontWeight', 'bold', 'normal')");
    expect(runtimeSource).toContain("toggleEditorTextStyle('fontStyle', 'italic', 'normal')");
    expect(runtimeSource).toContain('applyEditorFontFamily');
  });
});
