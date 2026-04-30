# Deep Interview PRD

## Intent
Create a 30-minute English exam-review slide deck from five computer architecture Memory PDFs.

## Desired outcome
An information-dense, dark-format academic review deck for CS graduate students who already know cache and virtual memory and need exam preparation.

## In scope
- Cover all five Memory PDFs in `projects/`.
- Compress concepts into roughly 22-26 slides; final plan uses 24.
- Prioritize exam-high-yield concepts, formulas, comparison tables, address-field recipes, AMAT, write policy tradeoffs, cache optimizations, and virtual memory translation/page-fault mechanics.
- Include concise speaker notes.
- Export HTML preview and PPTX.

## Non-goals
- Do not include course homepage or instructor information.
- Do not reproduce the original lecture slides page by page.
- Do not spend space on overlong modern examples or low-frequency hardware details.
- Do not add many drill problems; keep only high-value worked examples/checkpoints.

## Decision boundaries
When content conflicts with the 30-minute duration, keep exam-frequency concepts and formulas in slides, move minor caveats to notes, and omit long cases.

## Acceptance criteria
- Deck DSL is generated from slide slices and assembled through the workflow.
- Slide count is within 22-26.
- Final deck uses all-English slide text and notes.
- HTML preview and PPTX build successfully.
- Important source screenshots are retained where they explain key structures.
