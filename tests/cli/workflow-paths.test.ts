import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveWorkflowProjectInput, resolveWorkflowSourceInput } from '../../packages/cli/src/commands/workflow.js';

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
});

describe('workflow CLI project path resolution', () => {
  it('resolves slug inputs to the workspace projects directory even when invoked from packages/cli', () => {
    process.chdir(join(originalCwd, 'packages', 'cli'));

    expect(resolveWorkflowProjectInput('demo-deck')).toBe(join(originalCwd, 'projects', 'demo-deck'));
    expect(resolveWorkflowProjectInput('projects/demo-deck')).toBe(join(originalCwd, 'projects', 'demo-deck'));
  });

  it('keeps absolute project paths unchanged and supports explicit project roots', () => {
    const absolute = resolve('/tmp/maliang-projects/demo');

    expect(resolveWorkflowProjectInput(absolute)).toBe(absolute);
    expect(resolveWorkflowProjectInput('demo', '/tmp/custom-projects')).toBe(resolve('/tmp/custom-projects/demo'));
  });

  it('resolves local source inputs from the workspace root while preserving URLs', () => {
    process.chdir(join(originalCwd, 'packages', 'cli'));

    expect(resolveWorkflowSourceInput('projects/source.pdf')).toBe(join(originalCwd, 'projects', 'source.pdf'));
    expect(resolveWorkflowSourceInput('https://example.test/source.pdf')).toBe('https://example.test/source.pdf');
  });
});
