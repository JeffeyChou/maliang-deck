import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  advanceProjectStage,
  assertSafeProjectSlug,
  createProject,
  getProjectPaths,
  readProjectManifest,
  resolveProjectArtifact,
} from '../src/project.js';

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'maliang-deck-workflow-project-'));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('workflow project scaffolding', () => {
  it('creates the canonical PRD project layout and manifest', async () => {
    await withTempDir(async (projectsRoot) => {
      const created = await createProject({
        projectsRoot,
        slug: 'demo-report',
        id: 'project-demo',
        now: new Date('2026-01-01T00:00:00.000Z'),
        sources: [{ id: 'source-1', kind: 'local-file', path: 'sources/report.pdf', status: 'pending' }],
        outputFormats: ['html', 'pdf', 'pptx'],
        requirementsMarkdown: '# Requirements\n\nSynthetic deck.\n',
      });

      const paths = getProjectPaths(projectsRoot, 'demo-report');
      await expect(stat(paths.sources)).resolves.toMatchObject({});
      await expect(stat(paths.mineruRaw)).resolves.toMatchObject({});
      await expect(stat(paths.doclingRaw)).resolves.toMatchObject({});
      await expect(stat(paths.normalized)).resolves.toMatchObject({});
      await expect(stat(paths.planning)).resolves.toMatchObject({});
      await expect(stat(paths.dslSlides)).resolves.toMatchObject({});
      await expect(stat(paths.renderHtml)).resolves.toMatchObject({});
      await expect(stat(paths.exports)).resolves.toMatchObject({});
      await expect(stat(paths.review)).resolves.toMatchObject({});
      await expect(stat(paths.mineruTasks)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.doclingTasks)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(paths.dslTasks)).rejects.toMatchObject({ code: 'ENOENT' });

      expect(created).toMatchObject({
        id: 'project-demo',
        slug: 'demo-report',
        stage: 'initialized',
        outputFormats: ['html', 'pdf', 'pptx'],
      });
      expect(created.artifacts).toMatchObject({
        requirements: 'requirements.md',
        materials: 'extraction/normalized/materials.json',
        blocks: 'extraction/normalized/blocks.json',
        assets: 'extraction/normalized/assets.json',
        outlineDraft: 'planning/outline-draft.md',
        outlineApproval: 'planning/outline-approved.md',
        planningTasks: 'planning/tasks.json',
        deckPlan: 'planning/deck-plan.json',
        dslTasks: 'dsl/tasks.json',
        slideSlices: 'dsl/slides',
        deck: 'dsl/deck.json',
      });
      await expect(readFile(paths.requirements, 'utf8')).resolves.toContain('Synthetic deck');

      const reread = await readProjectManifest(paths.projectFile);
      expect(reread).toEqual(created);
    });
  });

  it('rejects project slugs and artifact paths that escape the project', () => {
    expect(() => assertSafeProjectSlug('../escape')).toThrow(/Invalid project slug/);
    expect(() => assertSafeProjectSlug('nested/path')).toThrow(/Invalid project slug/);
    expect(() => getProjectPaths('/tmp/projects', '..')).toThrow(/Invalid project slug/);
    expect(() => resolveProjectArtifact('/tmp/projects/demo', '../outside.json')).toThrow(/inside the project/);
  });

  it('advances manifest stage without mutating DSL/export artifact paths', async () => {
    await withTempDir(async (projectsRoot) => {
      const created = await createProject({ projectsRoot, slug: 'stage-demo', id: 'stage-demo' });
      const advanced = advanceProjectStage(created, 'outline-approved', new Date('2026-01-02T00:00:00.000Z'));
      expect(advanced.stage).toBe('outline-approved');
      expect(advanced.updatedAt).toBe('2026-01-02T00:00:00.000Z');
      expect(advanced.artifacts.deck).toBe(created.artifacts.deck);
      expect(advanced.artifacts.exportReport).toBe(created.artifacts.exportReport);
    });
  });
});
