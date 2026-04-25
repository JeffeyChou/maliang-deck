import { readFileSync } from 'node:fs';
import { validateDeck } from '@maliang-deck/schema';

export async function runValidate(file: string): Promise<void> {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf-8');
  } catch (err) {
    console.error(`Error: cannot read file "${file}": ${(err as NodeJS.ErrnoException).message}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`Error: invalid JSON in "${file}": ${(err as Error).message}`);
    process.exit(1);
  }

  const result = validateDeck(parsed);

  if (result.success) {
    const deck = result.data;
    console.log(`✓ Valid deck: "${deck.meta.title}" — ${deck.slides.length} slide(s)`);
  } else {
    console.error(`✗ Validation failed with ${result.errors.length} error(s):\n`);
    for (const error of result.errors) {
      const path = error.path.length > 0 ? error.path.join('.') : '(root)';
      console.error(`  ${path}: ${error.message}`);
    }
    process.exit(1);
  }
}
