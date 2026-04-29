# Maliang Deck

Maliang Deck is a DSL-first slide production workflow for creating polished
business, technical, academic, and narrative decks from structured content. It
keeps a validated JSON deck DSL as the source of truth, then renders that same
deck into interactive HTML, PDF, and editable PPTX.

```text
JSON deck DSL -> HTML preview and runtime
JSON deck DSL -> SVG -> PDF export
JSON deck DSL -> SVG metadata -> DrawingML PPTX export
```

The goal is simple: focus on the message, structure, evidence, and design
intent. Do not hand-edit generated HTML, SVG, PDF, or PPTX as the canonical
deck. Change the DSL, validate it, assemble it, and rebuild the outputs.

## Why Maliang Deck

Most agent-generated slide workflows make the agent spend tokens directly on
raw HTML, SVG, XML, or PPTX internals. That can work for small decks, but it is
fragile when the deck needs validation, multiple export targets, animations,
speaker tools, and later revision.

Maliang Deck separates those concerns:

- content and layout are represented as typed deck DSL;
- workflow gates keep extraction, outline approval, deck planning, DSL
  generation, assembly, and export separate;
- renderers and exporters consume validated DSL instead of each other's output;
- HTML runtime features can be rich without making HTML the source of truth;
- PDF and PPTX exports remain predictable from the same deck model.

## Differentiation

### Compared With HTML-First Slide Skills

HTML-first slide skills are excellent for fast visual experiments and static web
decks. Maliang Deck is built for production workflows where the deck needs a
reviewable source model and multiple delivery formats.

- **Validatable workflow**: the deck is structured JSON DSL, so slides can be
  checked before export for schema errors, bounds issues, missing assets, and
  export-sensitive elements.
- **Richer renderer support**: HTML, SVG, PDF, and PPTX are generated from the
  same canonical deck instead of treating browser markup as the final source.
- **Animation and morphing engine**: DSL-declared animations, reveal steps,
  transitions, and morphing effects are handled by the runtime while static
  exporters degrade predictably.
- **Presentation tools**: laser mode, presenter mode, and whiteboard mode are
  built for live delivery, not just file generation.
- **Last-mile HTML editing**: editable HTML export and the dev server support
  small browser-side adjustments while preserving the DSL-first workflow.

### Compared With PPTX-Oriented Slide Skills

PPTX-oriented tools are useful when the only target is PowerPoint. Maliang Deck
keeps PPTX as a first-class output without giving up the browser runtime.

- **HTML runtime remains available**: decks can use richer interaction,
  animation, runtime FX, and WebGL/Three.js visualizations that are not natural
  in static PowerPoint.
- **Editable PPTX export**: the PPTX path uses DrawingML where supported, so
  text, shapes, charts, tables, formulas, notes, and animation targets can
  remain editable instead of becoming flat screenshots.
- **One source, multiple outputs**: the same DSL can drive live web
  presentation, PDF review, and PowerPoint handoff.

### Compared With Both

Maliang Deck reduces the amount of low-level markup an agent has to generate.
Agents describe slide structure, content, layout intent, chart data, tables,
formulas, assets, animation metadata, and runtime options in typed DSL. The
workflow then validates, assembles, renders, and exports the deck.

That means fewer brittle XML attributes, fewer enormous hand-written HTML
blocks, and a cleaner pre-export validation path before the deck reaches a
client, committee, classroom, or executive review.

## Features

- **DSL first**: JSON deck DSL is the durable source of truth.
- **Content focused**: gated workflow supports source extraction, normalized
  materials, outline approval, deck planning, slide DSL, assembly, and build.
- **No canonical HTML edits**: generated HTML is preview/export output, not the
  file you maintain by hand.
- **Rich customization**: typed elements, layouts, charts, tables, formulas,
  themes, CSS themes, custom FX, runtime extensions, Three.js/WebGL modules, and
  controlled `customHtml` escape hatches with export fallbacks.
- **Multiple exports**: interactive HTML, PDF, and editable PPTX.
- **Live presentation modes**: laser pointer, presenter mode, whiteboard, and
  editable mode for late-stage review.
- **Animation support**: click steps, timeline effects, slide transitions, shape
  morphing, component morphing, reduced-motion handling, and export diagnostics.
- **Agent-friendly workflow**: durable project artifacts make deck production
  easier to review, resume, split, and rebuild.

## Workflow Pipeline

For document-to-slide projects, Maliang Deck follows a gated workflow:

```text
init -> extract -> normalize -> outline -> approve-outline -> plan-deck -> generate-dsl -> assemble -> build
```

The important rule is that slide DSL is generated only after the outline is
approved. A typical project keeps these artifacts aligned:

- `project.json`
- `requirements.md`
- `planning/outline-approved.md`
- `planning/deck-plan.json`
- `dsl/slides/*.json`
- `dsl/deck.json`
- `render/`
- `exports/`

## Quick Start

### Prerequisites

- Node.js 18 or newer
- pnpm
- Python 3.10 or newer for PDF/PPTX export bridges
- Optional: Docling for local document extraction
- Optional: MinerU credentials for live MinerU extraction workflows

Install JavaScript dependencies and build the workspace:

```bash
pnpm install
pnpm -r build
```

Install Python export dependencies:

```bash
pip install cairosvg pypdf python-pptx
```

If CairoSVG is not available in your environment, install the fallback renderer:

```bash
pip install svglib reportlab
```

Optional local document extraction:

```bash
pip install docling
```

### Validate And Preview A Deck

```bash
pnpm validate examples/dreamy-blur-physics/deck.json
pnpm serve examples/dreamy-blur-physics/deck.json
```

The preview server binds to `127.0.0.1` by default and prints a local URL.

### Export A Deck

```bash
pnpm export examples/dreamy-blur-physics/deck.json out.pdf --format pdf
pnpm export examples/dreamy-blur-physics/deck.json out.pptx --format pptx
pnpm export examples/dreamy-blur-physics/deck.json out-html --format html
```

For editable HTML export:

```bash
pnpm export examples/dreamy-blur-physics/deck.json out-html --format html --html-mode editable
```

### Run The Project Workflow

After building the CLI, project-based deck production can use the workflow
commands:

```bash
node packages/cli/dist/index.js workflow init my-deck --sources source.pdf --formats html,pdf,pptx
node packages/cli/dist/index.js workflow extract projects/my-deck
node packages/cli/dist/index.js workflow normalize projects/my-deck
node packages/cli/dist/index.js workflow outline projects/my-deck --mode agent
node packages/cli/dist/index.js workflow approve-outline projects/my-deck
node packages/cli/dist/index.js workflow plan-deck projects/my-deck --mode agent
node packages/cli/dist/index.js workflow generate-dsl projects/my-deck --mode agent --parallel
node packages/cli/dist/index.js workflow assemble projects/my-deck
node packages/cli/dist/index.js workflow build projects/my-deck --formats html,pdf,pptx
```

See the workflow guide before using this path for production decks.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Workflow](./docs/WORKFLOW.md)
- [Authoring](./docs/AUTHORING.md)
- [Configuration](./docs/CONFIGURATION.md)
- [Template Extraction](./docs/TEMPLATE-EXTRACTION.md)
- [Animation and Runtime Extensions](./assets/ANIMATIONS.md)
- [Agent Guidance](./docs/agent-guidance/README.md)
- [Project Status](./docs/PROJECT-STATUS.md)

## Repository Structure

```text
packages/
  schema/          typed deck DSL and validation
  renderer-html/   interactive HTML renderer
  renderer-svg/    static SVG renderer for PDF/PPTX paths
  exporter/        HTML/PDF/PPTX export orchestration
  workflow/        project workflow, extraction, planning, assembly, build
  cli/             command-line interface
  authoring/       compile-time authoring helpers
  text-measure/    font metrics, wrapping, and reflow helpers

assets/            themes, animations, FX, runtime extensions
runtime/           browser presentation runtime
python/            PDF and DrawingML PPTX export bridges
docs/              architecture, workflow, authoring, configuration
examples/          example decks
projects/          workflow project workspace
```

## Contributing

Contributions are welcome when they fit the DSL-first architecture. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for accepted contribution types, PR
expectations, and local checks.

## Security

To help keep users safe, please report security issues privately rather than in
public issues. See [SECURITY.md](./SECURITY.md) for the reporting process and
scope.

## License

Maliang Deck uses a dual-license model:

- open source under AGPL-3.0-or-later for the community path;
- commercial licenses for teams that need proprietary modifications, private
  redistribution, hosted-service terms, enterprise deployment, support, or
  custom feature development.

See [LICENSE](./LICENSE) for the full AGPL text,
[DUAL-LICENSE.md](./DUAL-LICENSE.md) for the licensing overview,
[COMMERCIAL.md](./COMMERCIAL.md) for commercial licensing paths, and
[TRADEMARKS.md](./TRADEMARKS.md) for brand-use rules.

## Sponsor And Support

Maliang Deck is built for serious deck production workflows. Paid technical
support is available for:

- custom slide workflows;
- private templates and design systems;
- custom renderers, FX, or Three.js visualizations;
- export improvements for PDF or PPTX;
- workflow integration with internal document systems;
- enterprise deployment and training.

For sponsorship or paid support, contact:

```text
your-email@example.com
```

## Acknowledgments

Maliang Deck benefits from ideas, references, and ecosystem work from many
open-source projects.

- [reveal.js](https://revealjs.com/) helped establish the modern browser-based
  presentation runtime pattern.
- [Three.js](https://threejs.org/) powers the broader ecosystem of browser 3D
  visualization that Maliang Deck builds on for interactive plots and models.
- [PPT Master](https://github.com/hugohe3/ppt-master) informed the DrawingML
  PPTX exporter direction and native-editable PowerPoint workflow goals.
- [KaTeX](https://katex.org/) provides a practical foundation for fast math
  rendering.
- [Zod](https://zod.dev/) supports the typed validation model used by the DSL.
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), and
  [Vitest](https://vitest.dev/) support the development toolchain.
