import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
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
      '@maliang-deck/exporter-pptxgenjs': resolve(__dirname, 'packages/exporter-pptxgenjs/src/index.ts'),
      '@maliang-deck/workflow': resolve(__dirname, 'packages/workflow/src/index.ts'),
    },
  },
});
