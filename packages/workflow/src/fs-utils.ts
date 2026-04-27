import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function writeJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

export function writeText(path: string, value: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, value, 'utf-8');
}

export function assertInside(parent: string, child: string): string {
  const parentAbs = resolve(parent);
  const childAbs = isAbsolute(child) ? resolve(child) : resolve(parentAbs, child);
  const rel = relative(parentAbs, childAbs);
  if (rel.startsWith('..') || rel === '..' || isAbsolute(rel)) {
    throw new Error(`Unsafe path escapes project root: ${child}`);
  }
  return childAbs;
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}
