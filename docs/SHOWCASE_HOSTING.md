# Showcase Hosting

The examples showcase is generated from deck DSL sources, not hand-edited HTML.

```bash
pnpm build
pnpm showcase:export
```

The static site is written to:

```text
examples/_showcase/site/
```

Open `examples/_showcase/site/index.html` locally, or publish that directory.

## Updating One Exported Deck

If you already exported or edited a deck HTML folder and only want to move that
folder into the showcase site, use:

```bash
pnpm showcase:update -- --slug animation-showcase --from /tmp/animation-showcase
```

The `--from` folder must contain `index.html`. The script copies it to:

```text
examples/_showcase/site/decks/<slug>/
```

Then it regenerates:

```text
examples/_showcase/site/index.html
examples/_showcase/site/showcase-manifest.json
```

For a new custom deck, provide metadata:

```bash
pnpm showcase:update -- \
  --slug custom-demo \
  --from ./out/custom-demo \
  --title "Custom Demo" \
  --description "A hand-curated static Maliang showcase." \
  --feature Demo \
  --feature HTML
```

To rebuild only the gallery page from the existing manifest:

```bash
pnpm showcase:update -- --rebuild-index
```

## GitHub Pages

Use the included `.github/workflows/showcase-pages.yml` workflow.

1. Push the workflow and source decks to GitHub.
2. In the repository settings, go to **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Run the `Showcase Pages` workflow, or push to the default branch.

GitHub’s Pages documentation says a site can publish from a branch or from a custom
GitHub Actions workflow, and the custom workflow path uploads static files as a
Pages artifact before deployment:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Notes

- `examples/_showcase/site/.nojekyll` is generated so GitHub Pages serves copied
  folders and assets directly.
- The exported decks are static HTML folders. Formula, 3D graph, and GIF-to-ASCII
  runtime features currently load KaTeX or Three.js from CDN when opened online.
- To publish manually, run `pnpm showcase:export` and upload the contents of
  `examples/_showcase/site/` to any static host.
