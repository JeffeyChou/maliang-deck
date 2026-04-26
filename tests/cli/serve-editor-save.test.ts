import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FileBackedEditorStore, EditorStoreError } from '../../packages/cli/src/editor/store.js';
import type { Deck } from '../../packages/schema/src/index.js';

function deck(): Deck {
  return {
    meta: { title: 'Serve editor', canvas: { width: 1280, height: 720 } },
    slides: [
      {
        id: 'a',
        elements: [
          { type: 'text', id: 'title', x: 10, y: 20, width: 200, height: 80, fontSize: 30, content: 'A' },
          { type: 'rect', id: 'box', x: 50, y: 60, width: 100, height: 120, fill: '#fff' },
        ],
      },
      { id: 'b', elements: [{ type: 'text', id: 'body', x: 10, y: 20, width: 200, fontSize: 20, content: 'B' }] },
    ],
  };
}

async function createDeckFile(pathParts: string[] = ['deck.json']): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'maliang-deck-editor-'));
  const dir = join(root, ...pathParts.slice(0, -1));
  await mkdir(dir, { recursive: true });
  const file = join(root, ...pathParts);
  await writeFile(file, `${JSON.stringify(deck(), null, 2)}\n`, 'utf-8');
  return file;
}

async function readDeck(file: string): Promise<Deck> {
  return JSON.parse(await readFile(file, 'utf-8')) as Deck;
}

async function expectStoreError(fn: () => Promise<unknown>, status: number, code: string): Promise<void> {
  await expect(fn()).rejects.toBeInstanceOf(EditorStoreError);
  try {
    await fn();
  } catch (error) {
    expect((error as EditorStoreError).status).toBe(status);
    expect((error as EditorStoreError).code).toBe(code);
  }
}

describe('serve editor store', () => {
  it('reports editor capabilities with revision and supported operations', async () => {
    const file = await createDeckFile();
    const store = await FileBackedEditorStore.create(file);

    expect(store.getCapability()).toMatchObject({
      canPersist: true,
      sourceKind: 'json',
      supportedOps: ['reorderSlides', 'deleteSlide', 'updateElement'],
      supportedElementTypes: ['text', 'rect', 'image', 'line', 'circle'],
      mjsDivergenceWarning: false,
    });
    expect(store.getCapability().revision).toMatch(/^[a-f0-9]{64}$/);
  });

  it('saves valid text, rect, and reorder operations then updates revision/render cache', async () => {
    const file = await createDeckFile();
    const store = await FileBackedEditorStore.create(file);
    const revision = store.getCapability().revision;

    const response = await store.save({
      baseRevision: revision,
      ops: [
        { op: 'updateElement', slideId: 'a', elementId: 'title', changes: { x: 44, content: 'Edited', fontSize: 42, fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'serif' } },
        { op: 'updateElement', slideId: 'a', elementId: 'box', changes: { width: 150, fill: '#f00', radius: 8 } },
        { op: 'reorderSlides', slideIds: ['b', 'a'] },
      ],
    });

    expect(response.ok).toBe(true);
    expect(response.reload).toBe(true);
    expect(response.revision).not.toBe(revision);
    const saved = await readDeck(file);
    expect(saved.slides.map((slide) => slide.id)).toEqual(['b', 'a']);
    expect(saved.slides[1].elements[0]).toMatchObject({ x: 44, content: 'Edited', fontSize: 42, fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'serif' });
    expect(saved.slides[1].elements[1]).toMatchObject({ width: 150, fill: '#f00', radius: 8 });
    expect(store.html).toContain('Edited');
  });

  it('rejects stale revisions and leaves file unchanged', async () => {
    const file = await createDeckFile();
    const store = await FileBackedEditorStore.create(file);
    const before = await readFile(file, 'utf-8');

    await expectStoreError(() => store.save({ baseRevision: 'stale', ops: [] }), 409, 'stale-revision');
    expect(await readFile(file, 'utf-8')).toBe(before);
  });

  it('rejects invalid patches and leaves file unchanged', async () => {
    const file = await createDeckFile();
    const store = await FileBackedEditorStore.create(file);
    const before = await readFile(file, 'utf-8');

    await expectStoreError(() => store.save({ baseRevision: store.getCapability().revision, ops: [{ op: 'updateElement', slideId: 'a', elementId: 'box', changes: { content: 'nope' } }] }), 400, 'unsupported-field');
    expect(await readFile(file, 'utf-8')).toBe(before);
  });

  it('saves slide deletes', async () => {
    const file = await createDeckFile();
    const store = await FileBackedEditorStore.create(file);

    await store.save({
      baseRevision: store.getCapability().revision,
      ops: [{ op: 'deleteSlide', slideId: 'a' }],
    });

    const saved = await readDeck(file);
    expect(saved.slides.map((slide) => slide.id)).toEqual(['b']);
  });

  it('warns when editing assembled DSL output that may diverge from generator scripts', async () => {
    const file = await createDeckFile(['dsl', 'deck.json']);
    const store = await FileBackedEditorStore.create(file);

    expect(store.getCapability().mjsDivergenceWarning).toBe(true);
    expect(store.getCapability().warnings.join('\n')).toContain('does not update generator scripts');
  });
});
