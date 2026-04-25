import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDeckToHtml } from '@maliang-deck/renderer-html';
import type { Deck } from '@maliang-deck/schema';

const runtimeSource = readFileSync(join(process.cwd(), 'runtime', 'runtime.js'), 'utf-8');

describe('reveal-style presenter controls runtime', () => {
  it('maps left/right to slide-only navigation and up/down to timeline steps', () => {
    expect(runtimeSource).toContain("case 'ArrowRight': case 'PageDown': go(idx+1, false, { skipTimeline: true })");
    expect(runtimeSource).toContain("case 'ArrowLeft': case 'PageUp': go(idx-1, false, { skipTimeline: true })");
    expect(runtimeSource).toContain("case 'ArrowDown': advanceTimelineStep('forward')");
    expect(runtimeSource).toContain("case 'ArrowUp': advanceTimelineStep('backward')");
    expect(runtimeSource).toContain('!options.skipTimeline');
  });

  it('lets the presenter window send animation-step commands without changing slides', () => {
    expect(runtimeSource).toContain("{ type: 'timeline-step', direction: direction }");
    expect(runtimeSource).toContain("e.data.type === 'timeline-step'");
    expect(runtimeSource).toContain("case 'ArrowDown': step('forward')");
    expect(runtimeSource).toContain("case 'ArrowUp': step('backward')");
  });

  it('ships laser pointer and popup whiteboard controls with no external runtime plugin dependency', () => {
    expect(runtimeSource).toContain('function toggleLaserPointer');
    expect(runtimeSource).toContain('maliang-deck-laser-pointer');
    expect(runtimeSource).toContain('maliang-deck-laser-trails');
    expect(runtimeSource).toContain('function startLaserTrail');
    expect(runtimeSource).toContain('function finishLaserTrail');
    expect(runtimeSource).toContain('function strokeLineWidth');
    expect(runtimeSource).toContain('function quadraticBezierStroke');
    expect(runtimeSource).toContain('function differentialAddStrokePoint');
    expect(runtimeSource).toContain('maliangDeckLaserTrailFade');
    expect(runtimeSource).toContain('function toggleWhiteboard');
    expect(runtimeSource).toContain('maliang-deck-whiteboard__canvas');
    expect(runtimeSource).toContain('function drawWhiteboardStrokeTail');
    expect(runtimeSource).toContain('whiteboardStroke = createStrokeModel');
    expect(runtimeSource).toContain('data-role="undo"');
    expect(runtimeSource).toContain('data-role="redo"');
    expect(runtimeSource).toContain('function undoWhiteboard');
    expect(runtimeSource).toContain('function redoWhiteboard');
    expect(runtimeSource).toContain('whiteboardRedoStack = []');
    expect(runtimeSource).toContain('data-role="eraser"');
    expect(runtimeSource).toContain("setWhiteboardTool('eraser')");
    expect(runtimeSource).toContain("globalCompositeOperation = isEraser ? 'destination-out' : 'source-over'");
    expect(runtimeSource).toContain('function renderWhiteboardHistory');
    expect(runtimeSource).toContain("case 'l': case 'L': toggleLaserPointer()");
    expect(runtimeSource).toContain("case 'w': case 'W': toggleWhiteboard()");
  });

  it('keeps slide index only in the presenter timer panel', () => {
    expect(runtimeSource).not.toContain('id="cur-meta"');
    expect(runtimeSource).not.toContain('id="nxt-meta"');
    expect(runtimeSource).not.toContain("getElementById('cur-meta')");
    expect(runtimeSource).not.toContain("getElementById('nxt-meta')");
    expect(runtimeSource).toContain('id="timer-count"');
    expect(runtimeSource).toContain("timerCount.textContent = (n + 1) + ' / ' + total");
    expect(runtimeSource).toContain("const hideSel = '.progress-bar, .slide-number, .notes-overlay");
  });

  it('renders the runtime and timeline scripts needed by the controls', () => {
    const deck: Deck = {
      meta: { title: 'controls', canvas: { width: 1280, height: 720 } },
      slides: [
        {
          id: 'slide-1',
          elements: [
            {
              type: 'text',
              id: 'animated',
              x: 10,
              y: 20,
              width: 240,
              content: 'Animated',
              animation: { enter: 'fade-up', step: 1 },
            },
          ],
        },
      ],
    };

    const html = renderDeckToHtml(deck);

    expect(html).toContain('/runtime/runtime.js');
    expect(html).toContain('/runtime/timeline.js');
    expect(html).toContain('data-anim-enter="fade-up"');
    expect(html).toContain('data-anim-step="1"');
  });
});
