# Template Extraction Dependency Review

Status: v1 implementation uses no new runtime dependencies.

The approved PRD listed parser/image/browser candidates (JSZip, fast-xml-parser, parse5/jsdom, PDF.js, pngjs, Playwright, sharp). For the first implementation, Maliang Deck avoids adding those packages and instead uses bounded deterministic parsers built on Node standard library primitives:

- PPTX: minimal ZIP central-directory reader plus XML token extraction. This is enough for deterministic fixtures and provenance without introducing ZIP/XML package risk.
- HTML: static string parsing for DOM-like text/style hints; scripts are stripped and no network/browser runtime is used.
- PDF: static header, MediaBox, encryption, and text-token scan; semantic confidence is intentionally low.
- PNG: signature/IHDR/PLTE scan only; no native image processing.

Rejected for v1:

- `sharp` and Playwright: heavyweight/native/browser execution surface not needed for deterministic extraction fixtures.
- PDF.js: valuable for richer future extraction, but not required for v1 lower-confidence PDF page/text hints.
- JSZip/fast-xml-parser/parse5/pngjs: good candidates for later hardening, but v1 can satisfy the workflow contract without increasing dependency footprint.

Directive: if future work adds parser, browser, PDF renderer, or native image packages, rerun dependency review and add security/resource-limit tests for that package.
