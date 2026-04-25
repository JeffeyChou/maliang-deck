# Template extraction example

Use the deterministic fixtures in `tests/fixtures/templates/`:

```bash
pnpm --filter @maliang-deck/cli build
node packages/cli/dist/index.js template extract tests/fixtures/templates/html/static-deck.html --out /tmp/maliang-deck-template --id fixture-template
node packages/cli/dist/index.js template validate /tmp/maliang-deck-template/template-pack.json
node packages/cli/dist/index.js template sample /tmp/maliang-deck-template/template-pack.json --out /tmp/maliang-deck-template-sample
```

The extracted pack is draft by default and is not generation-active until reviewed and approved.
