# Hierarchical Configuration

Maliang Deck supports declarative JSON configuration for workflow defaults. The v1 configuration layer is intentionally local and deterministic: it does not execute JavaScript/MJS, does not fetch remote config, and does not introduce a separate visual-system model.

## Locations and precedence

Settings are resolved in this order; later layers override earlier layers:

| Priority | Source | Notes |
| --- | --- | --- |
| 1 | Built-in defaults | Current behavior: MinerU extraction, HTML/PDF/PPTX outputs, DrawingML PPTX engine. |
| 2 | `~/.maliang-deck/config.json` | User/global defaults reused across projects. |
| 3 | `maliang-deck.config.json` | Workspace or project-root defaults. |
| 4 | `project.json.config` | Portable workflow-project overrides. |
| 5 | `project.json` compatibility aliases | Existing `outputFormats`, `fonts`, `styleId`, and `styleVersion` fields. |
| 6 | Requirements/deck metadata | Only for supported fields such as output formats, style/theme, and canvas. |
| 7 | Explicit CLI flags | User-provided flags always win. Omitted CLI options do not override config. |

## Merge rules

- Objects deep-merge.
- Arrays replace instead of concatenate.
- Scalars from later sources replace earlier values.
- `undefined`/omitted fields do not delete earlier settings.
- Unsupported fields are rejected by schema validation.

## Supported v1 fields

```jsonc
{
  "extraction": {
    "provider": "mineru",
    "mineru": { "miner": "precise", "model": "vlm" },
    "docling": {
      "ocr": false,
      "tables": true,
      "tableMode": "fast",
      "artifactsPath": "./models/docling",
      "documentTimeoutSeconds": 120,
      "allowRemoteInput": false
    }
  },
  "outputs": { "formats": ["html", "pdf", "pptx"] },
  "export": {
    "pptxEngine": "drawingml",
    "overflowPolicy": "warn",
    "overflowTolerance": 0
  },
  "fonts": {
    "Inter": "./fonts/Inter-Regular.ttf"
  },
  "styleId": "consulting",
  "styleVersion": "0.1.0",
  "templatePackPaths": ["./templates/acme/template-pack.json"],
  "includeDraftTemplatePacks": false,
  "theme": "minimal-white",
  "canvas": { "width": 1280, "height": 720 },
  "tokens": {
    "palette": {
      "primary": "#0066FF",
      "secondary": "#F3F6FB",
      "accent": "#3399FF",
      "neutral": "#131927"
    },
    "typography": {
      "headingFont": "Inter, sans-serif",
      "bodyFont": "Inter, sans-serif",
      "monoFont": "JetBrains Mono, monospace",
      "scaleRatio": 1.25
    },
    "spacing": {
      "element": 14,
      "section": 48,
      "margin": { "top": 48, "right": 48, "bottom": 48, "left": 48 }
    }
  }
}
```

## Provider and output defaults

A global config can set personal defaults:

```json
{
  "extraction": { "provider": "docling" },
  "outputs": { "formats": ["html", "pptx"] },
  "export": { "pptxEngine": "pptxgenjs" }
}
```

A workflow project can override those defaults in `project.json`:

```jsonc
{
  "slug": "research-deck",
  "outputFormats": ["html", "pdf"],
  "config": {
    "extraction": { "provider": "mineru" },
    "export": { "pptxEngine": "drawingml" }
  }
}
```

In this example, the project uses MinerU and HTML/PDF even if the global config prefers Docling and PPTX.

## Fonts

Font precedence is preserved:

```text
explicit CLI fontMap > resolved project/config fonts > deck meta fonts > bundled fonts > heuristic fallback
```

Workflow build passes resolved config fonts as project-level fonts, not as CLI fonts.

## Templates and visual settings

Config references existing style/template primitives instead of defining a new visual-system model:

- `styleId` / `styleVersion` select registered styles.
- `templatePackPaths` registers local JSON template packs before style lookup.
- `tokens`, `canvas`, and `theme` provide bounded declarative overrides.

Template pack paths must be local JSON files. Remote URLs and executable `.js`/`.mjs`/`.cjs` paths are rejected in v1.
