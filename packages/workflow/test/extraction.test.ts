import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertSafeArchiveEntry,
  downloadResultZip,
  pollSingleMinerUTask,
  readExtractionRecord,
  unpackMinerUZip
} from '../src/extraction.js';
import type { MinerUClient } from '../src/mineru-client.js';

const execFile = promisify(execFileCallback);
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'maliang-deck-workflow-'));
  tempDirs.push(dir);
  return dir;
}

describe('MinerU polling task records', () => {
  it('records polling attempts and final ZIP URL for a completed task', async () => {
    const projectDir = await tempProject();
    const states = [
      { state: 'pending' as const },
      { state: 'converting' as const },
      { state: 'done' as const, full_zip_url: 'https://cdn.example/result.zip' }
    ];
    const fakeClient = {
      async getTaskResult() {
        const data = states.shift() ?? { state: 'done' as const, full_zip_url: 'https://cdn.example/result.zip' };
        return { data: { task_id: 'task-1', err_msg: '', ...data }, message: 'ok', traceId: `trace-${data.state}`, request: {} };
      }
    } as unknown as MinerUClient;

    const record = await pollSingleMinerUTask({
      projectDir,
      materialId: 'material-1',
      taskId: 'task-1',
      client: fakeClient,
      intervalMs: 0,
      sleep: async () => undefined
    });

    expect(record.state).toBe('done');
    expect(record.pollAttempts.map((attempt) => attempt.state)).toEqual(['pending', 'converting', 'done']);
    expect(record.pollAttempts[2].fullZipUrl).toBe('https://cdn.example/result.zip');
    const persisted = await readExtractionRecord(projectDir, 'material-1');
    expect(persisted?.state).toBe('done');
  });

  it('records failed tasks as resumable task records with error message', async () => {
    const projectDir = await tempProject();
    const fakeClient = {
      async getTaskResult() {
        return {
          data: { task_id: 'task-1', state: 'failed' as const, err_msg: 'unsupported file' },
          message: 'ok',
          traceId: 'trace-failed',
          request: {}
        };
      }
    } as unknown as MinerUClient;

    const record = await pollSingleMinerUTask({ projectDir, materialId: 'material-1', taskId: 'task-1', client: fakeClient });

    expect(record.state).toBe('failed');
    expect(record.error).toBe('unsupported file');
    expect(record.pollAttempts).toHaveLength(1);
  });
});

describe('safe ZIP download and unpack', () => {
  it('downloads a ZIP into the material artifact folder', async () => {
    const projectDir = await tempProject();
    const zipBytes = Buffer.from('fake zip bytes');
    const zipPath = await downloadResultZip({
      projectDir,
      materialId: 'material-1',
      zipUrl: 'https://cdn.example/result.zip',
      fetch: async () => ({
        ok: true,
        status: 200,
        async json() {
          return {};
        },
        async arrayBuffer() {
          return zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);
        }
      })
    });

    expect(zipPath).toMatch(/extraction\/mineru\/raw\/material-1\/artifacts\/source\.zip$/);
    await expect(readFile(zipPath, 'utf8')).resolves.toBe('fake zip bytes');
  });

  it('unpacks safe MinerU ZIP files and records a manifest', async () => {
    const projectDir = await tempProject();
    const sourceDir = await tempProject();
    await execFile('mkdir', ['-p', path.join(sourceDir, 'images')]);
    await writeFile(path.join(sourceDir, 'full.md'), '# Extracted\n');
    await writeFile(path.join(sourceDir, 'images', 'chart.png'), 'png');
    const zipPath = path.join(projectDir, 'safe.zip');
    await execFile('zip', ['-qr', zipPath, 'full.md', 'images/chart.png'], { cwd: sourceDir });

    const manifest = await unpackMinerUZip(projectDir, 'material-1', zipPath);

    expect(manifest.files.map((file) => file.archivePath)).toEqual(['full.md', 'images/chart.png']);
    expect(manifest.outputDir).toMatch(/extraction\/mineru\/raw\/material-1$/);
    await expect(readFile(path.join(manifest.outputDir, 'full.md'), 'utf8')).resolves.toBe('# Extracted\n');
  });

  it('rejects ZIP entries that escape the target directory', async () => {
    const projectDir = await tempProject();
    const zipPath = path.join(projectDir, 'zip-slip.zip');
    await execFile('python3', [
      '-c',
      "import zipfile, sys; z=zipfile.ZipFile(sys.argv[1], 'w'); z.writestr('../evil.txt', 'bad'); z.close()",
      zipPath
    ]);

    await expect(unpackMinerUZip(projectDir, 'material-1', zipPath)).rejects.toMatchObject({
      code: 'MINERU_ZIP_UNSAFE_PATH'
    });
  });

  it('normalizes backslash traversal as unsafe before extracting', () => {
    expect(() => assertSafeArchiveEntry('..\\evil.txt', '/tmp/output')).toThrow(/escapes/);
  });
});
