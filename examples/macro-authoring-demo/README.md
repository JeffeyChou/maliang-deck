# Macro Authoring Demo

This example shows the Phase 2 component/macro authoring contract.

Files:

- `authoring-deck.json` — compact authoring input with `kind: "component"` invocations.
- `raw-expanded-deck.json` — equivalent ordinary Deck DSL fixture that demonstrates the kind of output a compiler emits.
- `TOKEN-COMPARISON.md` — generated macro-vs-raw verbosity comparison.
- `measure-token-comparison.mjs` — dependency-free script used to regenerate the comparison.

Regenerate the comparison:

```bash
node examples/macro-authoring-demo/measure-token-comparison.mjs > examples/macro-authoring-demo/TOKEN-COMPARISON.md
```

The authoring input is intentionally not passed directly to renderers/exporters. Compile it with `@maliang-deck/authoring`, validate the expanded deck with `@maliang-deck/schema`, and pass only the expanded Deck DSL to HTML/SVG/PDF/PPTX paths.
