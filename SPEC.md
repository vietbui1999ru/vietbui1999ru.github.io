---
status: draft
branch: feat/read-hl
---
<!-- Owner approval in session, 2026-11-27: approve c0ea1048. -->

# SPEC: Pointer-driven reading highlight prototype (issue #39)

## Objective
Build a `/ui-lab` demo of a reading highlight for content text. As a mouse or pen pointer moves over a content block, the text before the pointer becomes full-contrast ink. Lines above the pointer are fully highlighted, and the current line is highlighted up to the pointer x position. Success: on the demo About entry, the title keeps its normal look and the content brightens progressively under the pointer. Context: issue #39. This is a prototype; the owner may drop the feature.

Owner decisions (2026-11-27):
- Leave: the highlight stays at the furthest point reached. Moving the pointer back or leaving the block does not undo it.
- Driver: the pointer only. Touch, reduced motion and browsers without the API get no effect.
- Dim level: light. Unread content text keeps its current color, `--color-journal-1` (contrast 4.97:1 on light paper, 7.2:1 on dark paper, WCAG AA). Read text becomes `--ink`.

Technique (from the issue):
- `document.caretPositionFromPoint` finds the text position under the pointer, with `document.caretRangeFromPoint` as the fallback.
- The CSS Custom Highlight API (`CSS.highlights`, `::highlight()`) paints the read part, so the DOM stays unchanged.

## Acceptance Criteria
- AC-1: A pure module `src/lib/reading-highlight.ts` holds the progress rules. A text position is a text node index in the block plus a character offset. `furthest(current, next)` returns the later position in document order; with no current position it returns `next`. `pointerTarget({ caret, below, end })` returns the caret position when the caret is inside the block, the block end when the pointer is below the block, and null otherwise.
  verify: `npx vitest run tests/lib/reading-highlight.test.ts -t "progress"`
- AC-2: A DOM module `src/lib/reading-highlight-dom.ts` exports `installReadingHighlight(root)`. It applies to each `[data-read-hl]` element inside `root`. On `pointermove` from a mouse or pen, it finds the caret, takes the AC-1 target, and keeps the furthest position per block. It sets one highlight named `read-progress` in `CSS.highlights`, with one range per block from the block start to its furthest position. Touch pointer events change nothing. Leaving the block keeps the highlight.
  verify: `npx vitest run tests/components/reading-highlight.test.ts -t "pointer"`
- AC-3: `installReadingHighlight` does nothing and returns a no-op cleanup when `prefers-reduced-motion: reduce` matches, when `CSS.highlights` is missing, or when neither caret function exists. In those cases it adds no listener and sets no highlight.
  verify: `npx vitest run tests/components/reading-highlight.test.ts -t "fallback"`
- AC-4: The cleanup that `installReadingHighlight` returns removes its listeners and deletes the `read-progress` highlight.
  verify: `npx vitest run tests/components/reading-highlight.test.ts -t "cleanup"`
- AC-5: `src/styles/global.css` styles `::highlight(read-progress)` with the ink color token only. It adds no hex or rgb literal for the highlight.
  verify: `rg -q "::highlight\(read-progress\)" src/styles/global.css && ! rg -A3 "::highlight\(read-progress\)" src/styles/global.css | rg -q "#[0-9a-fA-F]{3,8}\b|rgb\("`
- AC-6: A `/ui-lab` fixture `src/components/ui-lab/ReadingHighlightFixture.svelte` renders the first About entry from `src/data/experience.json`: its title, its date and its content. Only the content paragraph has `data-read-hl`, and it keeps the `text-journal-1` class. The fixture installs the highlight on mount and runs the cleanup on destroy. `src/pages/ui-lab.astro` renders the fixture.
  verify: `npx vitest run tests/components/reading-highlight.test.ts -t "fixture"`
- AC-7: Existing tests still pass.
  verify: `npx vitest run`
  baseline: pass
- AC-8: Lint passes.
  verify: `npx oxlint`
  baseline: pass
- AC-9: In a browser on `/ui-lab`, moving a mouse over the demo content brightens the text up to the pointer, in light and dark. The title does not change. Moving back up or leaving keeps the highlight. With reduced motion on, or with a touch device, the content keeps its normal look.
  verify: manual - browser check in Chromium and Firefox

## Boundaries
### Always
- Keep the progress rules in `src/lib/reading-highlight.ts`, free of DOM code.
- Keep the DOM unchanged: no wrapping spans around text.
- Run `svelte-autofixer` on every new or changed Svelte component (ask the owner to run it when the sandbox cannot reach svelte.dev).
- Run `~/dotfiles/scripts/spec check SPEC.md` and `~/dotfiles/scripts/floor-guard` before claiming done.
### Ask first
- New dependencies.
- Use of the highlight outside `/ui-lab`, for example on the About page.
- A scroll-driven mode.
### Never
- Edit a `verify:` line or a test to make a check pass.
- Write site copy. The demo shows existing About data only.
- Change the colors of headings, titles, labels or metadata.

## Open Questions
- Reset. Default: a page reload resets the progress; nothing is stored.
- Multiple blocks. Default: each block keeps its own progress, and all blocks share the one `read-progress` highlight.
- Unsupported browsers. Default: Firefox versions without `CSS.highlights` get no effect, and the text keeps its normal look.
