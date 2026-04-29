import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Plugin } from 'vite';

/**
 * Vite plugin to resolve .js imports to .ts source files.
 * TypeScript ESM uses .js extensions in imports (per spec), but Vite needs
 * to find the .ts source files during development/testing.
 *
 * Falls back to dist/ when a .ts source file doesn't exist (some packages
 * have incomplete src/ but complete dist/ from a prior build).
 */
function resolveJsToTs(): Plugin {
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.endsWith('.js')) return null;
      if (!source.startsWith('.')) return null;
      const dir = importer.substring(0, importer.lastIndexOf('/'));
      // Prefer .ts source
      const tsPath = resolve(dir, source.replace(/\.js$/, '.ts'));
      if (existsSync(tsPath)) return tsPath;
      // Fallback: if importer is in src/, check dist/ for the .js file
      const absJs = resolve(dir, source);
      if (!existsSync(absJs)) {
        const distJs = absJs.replace(/\/src\//, '/dist/');
        if (existsSync(distJs)) return distJs;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@maliang-deck/authoring': resolve(__dirname, 'packages/authoring/src/index.ts'),
      '@maliang-deck/schema': resolve(__dirname, 'packages/schema/src/index.ts'),
      '@maliang-deck/renderer-html': resolve(__dirname, 'packages/renderer-html/src/index.ts'),
      '@maliang-deck/renderer-svg': resolve(__dirname, 'packages/renderer-svg/src/index.ts'),
      '@maliang-deck/text-measure': resolve(__dirname, 'packages/text-measure/src/index.ts'),
      '@maliang-deck/exporter': resolve(__dirname, 'packages/exporter/src/index.ts'),
      '@maliang-deck/workflow': resolve(__dirname, 'packages/workflow/src/index.ts'),
    },
  },
});
