import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { approveOutline, assertOutlineApproved, createOutlineWorkOrder, createProject } from '@maliang-deck/workflow';

const tempDirs: string[] = [];

function tempProjectsRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'maliang-deck-outline-approval-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('outline approval gate', () => {
  it('requires a human reviewer before copying the outline draft to the approved gate', () => {
    const projectsRoot = tempProjectsRoot();
    const manifest = createProject({ projectsRoot, slug: 'approval-demo', sources: ['source.pdf'] });
    const root = join(projectsRoot, manifest.slug);
    createOutlineWorkOrder(root);

    expect(() => approveOutline(root, { reviewedBy: '' })).toThrow(/reviewed-by/);
    expect(() => approveOutline(root, { reviewedBy: 'Codex' })).toThrow(/human reviewer/);
  });

  it('records approval metadata for reviewed outline drafts', () => {
    const projectsRoot = tempProjectsRoot();
    const manifest = createProject({ projectsRoot, slug: 'approval-metadata', sources: ['source.pdf'] });
    const root = join(projectsRoot, manifest.slug);
    createOutlineWorkOrder(root);

    approveOutline(root, {
      reviewedBy: 'Dr. Reviewer',
      approvalNote: 'Approved after reviewing audience, duration, style, and per-slide outline.',
      approvedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const metadata = JSON.parse(readFileSync(join(root, 'planning', 'outline-approval.json'), 'utf8')) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      status: 'approved',
      reviewedBy: 'Dr. Reviewer',
      approvalGate: 'human-review',
      approvedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(metadata.draftSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => assertOutlineApproved(root)).not.toThrow();
  });

  it('does not treat a copied approved outline as a complete approval gate', () => {
    const projectsRoot = tempProjectsRoot();
    const manifest = createProject({ projectsRoot, slug: 'approval-without-metadata', sources: ['source.pdf'] });
    const root = join(projectsRoot, manifest.slug);
    createOutlineWorkOrder(root);
    copyFileSync(join(root, 'planning', 'outline-draft.md'), join(root, 'planning', 'outline-approved.md'));

    expect(() => assertOutlineApproved(root)).toThrow(/approval metadata is missing/);
  });
});
