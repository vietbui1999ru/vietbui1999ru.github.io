# UI Lab Expansion and Portfolio Density Implementation Plan

> **Status:** Approved plan for later implementation. Do not execute as part
> of the planning session.

**Goal:** Expand the development-only UI Lab into a configurable collection and
palette workbench, then promote approved patterns into a shorter multi-page portfolio
with filterable projects/blogs/skills, project details, wider articles, and a balanced
about/toolbox experience.

**Architecture:** Astro remains responsible for routes, content collections, static
rendering, and live-vault adapters. Svelte owns reusable interactive components,
collection state, modal enhancement, and lab controls. Deterministic fixtures
and live data share normalized view models. Lab experiments remain isolated
until a human
promotion gate is passed.

**Tech stack:** Astro 5, Svelte 5, Tailwind CSS 4, Zod 4, Vitest, Svelte Testing
Library, user-event, axe, and Playwright.

## Delivery strategy

Implement this work as separate reviewable changes. Do not combine the lab framework,
content-schema migration, and production page restructure into one commit or pull
request.

Recommended delivery units:

1. Lab state model and inspector shell.
2. Project collection layouts and data controls.
3. Rustic palette and density experiments.
4. Project details, media, and canonical routes.
5. Landing-page and route restructure.
6. Blog width and about/toolbox promotion.
7. Browser, accessibility, and stable visual gates.

Before every commit, stage explicit paths only and run the repository approval
workflow. The worktree contains unrelated and pre-existing changes; never use broad
`git add -A` or `git add -u`.

## Planned file map

### Lab foundation

- Modify: `src/components/ui-lab/UiLab.svelte`
- Create: `src/components/ui-lab/LabInspector.svelte`
- Create: `src/components/ui-lab/LabPreviewFrame.svelte`
- Create: `src/components/ui-lab/controls/*.svelte`
- Create: `src/design-system/collection.ts`
- Create: `src/design-system/palettes.ts`
- Create: `src/lib/ui-lab-state.ts`
- Create: `tests/ui-lab/state.test.ts`

### Fixtures and collection patterns

- Replace or extend: `src/fixtures/uiLab.ts`
- Create: `src/fixtures/projects.ts`
- Create: `src/fixtures/blogs.ts`
- Create: `src/fixtures/skills.ts`
- Modify: `src/components/patterns/ProjectCard.svelte`
- Create: `src/components/patterns/ProjectCollection.svelte`
- Create: `src/components/patterns/ProjectTable.svelte`
- Create: `src/components/patterns/ProjectRow.svelte`
- Create: `src/components/patterns/CollectionToolbar.svelte`
- Create: `src/lib/collection-controls.ts`
- Modify: `src/pages/ui-lab.astro`

### Palette and texture system

- Modify: `src/styles/global.css`
- Modify: `src/design-system/palettes.ts`
- Create: `src/components/ui-lab/PalettePreview.svelte`
- Create: `tests/design-system/palettes.test.ts`

### Project detail and media

- Modify: `src/content/schemas.ts`
- Modify: `src/data/projectData.ts`
- Create: `src/components/primitives/Modal.svelte`
- Create: `src/components/patterns/ProjectDetail.svelte`
- Create: `src/components/patterns/ProjectMedia.svelte`
- Create: `src/pages/projects/[slug].astro`
- Modify: `src/pages/projects.astro`
- Modify: `src/components/svelte/PaperProjects.svelte`
- Modify: `tests/content/schemas.test.ts`

### Production information architecture

- Modify: `src/pages/index.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/gallery.astro`
- Modify: `src/data/navLinks.ts`
- Modify: `src/components/svelte/PaperNav.svelte`
- Modify: `src/components/svelte/PaperMobileNav.svelte`
- Modify: `src/components/svelte/PaperAbout.svelte`
- Modify: `src/components/svelte/PaperBlog.svelte`
- Modify: `src/components/svelte/PaperGallery.svelte`
- Modify: `src/components/svelte/PaperExperience.svelte`
- Modify: `src/components/svelte/PaperEducation.svelte`

### Blog and toolbox promotion

- Modify: `src/pages/blog/[...slug].astro`
- Modify: `src/components/svelte/PaperBlogArchive.svelte`
- Create: `src/components/patterns/SkillCollection.svelte`
- Create: `src/components/patterns/SkillGroup.svelte`
- Modify: `src/data/aboutData.ts`
- Modify: `src/data/skillsData.json`

### Verification

- Modify: `package.json`
- Modify: lockfile
- Create: `tests/ui-lab/*.test.ts`
- Create: `tests/components/*.svelte.test.ts`
- Create: `tests/e2e/ui-lab.spec.ts`
- Create: `tests/e2e/projects.spec.ts`
- Create: `tests/e2e/navigation.spec.ts`

Exact filenames may be consolidated during implementation if a component
would have only one trivial consumer. Preserve the boundaries in the
specification even if the
physical file count changes.

## Phase 0: Baseline and official documentation

- [ ] Record the current test, type-check, lint, formatting, and build results.
- [ ] Record generated page count and verify portfolio routes do not reference
      Three.js, r3f, or Leva chunks.
- [ ] Capture review-only screenshots of `/`, `/projects`, `/blog`, one article,
      `/ui-lab`, and mobile equivalents.
- [ ] Use the Svelte documentation workflow before editing Svelte code:
  - list documentation sections;
  - retrieve sections for props, snippets, bindings, context, testing, transitions,
    attachments, accessibility, and TypeScript;
  - retain only sections relevant to each delivery unit.
- [ ] Confirm current Vitest DOM setup and determine the smallest additions required
      for Svelte Testing Library.

**Gate:** Baseline failures are documented as pre-existing before implementation.

## Phase 1: Define serializable experiment state

### Task 1.1: Collection experiment contracts

- [ ] Add typed enums/unions for view mode, width preset, column mode, density,
      alignment, decoration, content visibility, icon position, and overflow mode.
- [ ] Define `CollectionExperimentState` with explicit defaults.
- [ ] Keep types framework independent; no DOM or Svelte imports.
- [ ] Add preset states for grid, table, rows, compact, and showcase.

### Task 1.2: URL serialization

- [ ] Implement parse and serialize functions for supported query parameters.
- [ ] Ignore unknown values and fall back safely.
- [ ] Keep arrays stable and deterministic for tag filters and visible fields.
- [ ] Add Reset and Copy review URL behavior.
- [ ] Allow local storage to remember the last state without overriding a supplied
      URL configuration.

### Task 1.3: Unit tests

- [ ] Test default, round-trip, malformed, partial, and legacy states.
- [ ] Test that serialization order is deterministic.
- [ ] Test that reset removes lab-only parameters.

**Verification:** Unit tests, TypeScript, lint, and formatting pass.

**Review gate:** Approve the state vocabulary before building controls around it.

## Phase 2: Refactor the UI Lab shell

### Task 2.1: Inspector tabs

- [ ] Extract the inspector from `UiLab.svelte`.
- [ ] Add Data, Layout, Density, Style, Content, and Behavior tabs.
- [ ] Use native controls with visible labels and fieldsets.
- [ ] Preserve keyboard navigation and a logical focus order.
- [ ] Keep the desktop split and mobile stacked layouts.

### Task 2.2: Preview frame

- [ ] Add narrow, tablet, desktop, and fluid preview widths.
- [ ] Add an optional resizable canvas without coupling component behavior to the
      browser viewport.
- [ ] Label the active viewport dimensions.
- [ ] Do not place the preview in an iframe unless style isolation proves necessary.

### Task 2.3: State ownership

- [ ] Keep one top-level state owner in the lab.
- [ ] Pass controlled values and callbacks into inspector sections.
- [ ] Avoid cross-component global state until more than one route needs it.

**Verification:** Svelte autofixer reports zero issues/suggestions.
Keyboard-only tab and control operation works at desktop and mobile widths.

## Phase 3: Add deterministic collection fixtures and live adapters

### Task 3.1: Project fixtures

- [ ] Create at least four representative projects.
- [ ] Add long-title, tag-heavy, no-media, many-links, and archived cases.
- [ ] Use stable dates and local-safe links.

### Task 3.2: Blog and skill fixtures

- [ ] Add short and long blog records with varied tags and reading times.
- [ ] Add balanced and intentionally unbalanced skill categories.
- [ ] Include empty and single-item scenarios for every collection.

### Task 3.3: Live-vault mode

- [ ] Load projects and blogs in `ui-lab.astro` through Astro content collections.
- [ ] Normalize them using the same adapters used by production pages.
- [ ] Pass serializable data to the Svelte island.
- [ ] Keep fixtures as the default source.
- [ ] Ensure live mode never reads vault files from browser code.

**Verification:** Fixture and live records satisfy the same TypeScript contracts.
Production builds still redirect `/ui-lab` without rendering lab markup.

## Phase 4: Implement project collection views

### Task 4.1: Controlled `ProjectCard`

- [ ] Add explicit density, visible-field, media, accent, and height props.
- [ ] Preserve current production defaults exactly until promotion.
- [ ] Keep the `class` escape hatch but do not use it as the main lab API.
- [ ] Clamp summaries only when the selected variant requests it.

### Task 4.2: Grid and showcase

- [ ] Support one through four columns and CSS `auto-fit`.
- [ ] Support configurable minimum card width and independent row/column gaps.
- [ ] Support auto, fixed, and clamped card heights.
- [ ] Add visible, scroll, fade-and-View-all, and paginated overflow behaviors.
- [ ] For clipping, display hidden count and an explicit expansion action.

### Task 4.3: Table and row views

- [ ] Use semantic table headers and cells at supported widths.
- [ ] Provide sortable headers only when sorting is active.
- [ ] Collapse table records into labelled rows/cards on small screens.
- [ ] Add comfortable and compact row densities.
- [ ] Test title, status, date, tags, and link alignment.

### Task 4.4: Compact list

- [ ] Test ordered and unordered list markers.
- [ ] Support leading metadata, centered content, and trailing actions.
- [ ] Expose line height, indentation, marker style, and item separators.
- [ ] Keep actions reachable and labels understandable without icons.

**Verification:** All five views render normal and edge fixtures without horizontal
page overflow at supported preview widths.

**Review gate:** Human selects preferred project views, spacing ranges, and overflow
modes. Unselected experiments remain lab-only.

## Phase 5: Add search, filters, sorting, and temporary ordering

### Task 5.1: Pure collection utilities

- [ ] Implement non-mutating project, blog, and skill selectors.
- [ ] Add text normalization and case-insensitive tag matching.
- [ ] Add deterministic tie-breakers to every sort mode.
- [ ] Test empty queries, multiple tags, missing fields, and equal values.

### Task 5.2: Collection toolbar

- [ ] Add text search, removable filter chips, sort control, and view selector.
- [ ] Announce result counts after filters change.
- [ ] Keep controls usable at narrow widths without icon-only ambiguity.
- [ ] Reflect supported state in the review URL.

### Task 5.3: Accessible reordering

- [ ] Add visible drag handles in manual-order mode.
- [ ] Add keyboard Move up and Move down actions.
- [ ] Announce the moved item and new position.
- [ ] Scope manual order to the current lab session.
- [ ] Do not write order back to project content.

### Task 5.4: Author-controlled production order

- [ ] Decide whether production needs optional `order` frontmatter after lab review.
- [ ] If approved, extend the schema and migrate content separately.
- [ ] Preserve featured/date sorting when no explicit order exists.

**Verification:** Search, filters, sort, and reorder compose correctly and
never mutate the original fixture/live arrays.

## Phase 6: Add rustic palette and texture experiments

### Task 6.1: Palette contracts

- [ ] Define Soft Eggshell, Bone, Linen, Ledger, and Cotton token sets.
- [ ] Include paper, raised paper, ink, soft ink, rules, four accents, and texture
      strength.
- [ ] Keep the current production palette as a baseline preset.

### Task 6.2: CSS application

- [ ] Apply selected lab tokens through a scoped preview wrapper.
- [ ] Add reusable low-opacity noise/fiber texture.
- [ ] Ensure texture does not intercept pointer events or animate.
- [ ] Avoid changing global production defaults during experimentation.

### Task 6.3: Palette review matrix

- [ ] Render typography, lists, controls, cards, table rules, tags, links, and modal
      surfaces for every palette.
- [ ] Test each stock with normal and reduced texture.
- [ ] Run automated contrast checks and record exceptions for human review.
- [ ] Test print preview where practical.

**Review gate:** Select one production default, allowed accents, and texture strength.
Promotion occurs in a separate change.

## Phase 7: Add project media and detail routes

### Task 7.1: Extend the schema compatibly

- [ ] Add a typed media array with image, native video, YouTube, and Vimeo variants.
- [ ] Require alt text for images and titles for video/embed records.
- [ ] Validate provider IDs instead of arbitrary iframe HTML.
- [ ] Retain `cover` and `images` during migration.
- [ ] Add valid and invalid schema tests.

### Task 7.2: Canonical project route

- [ ] Add static paths for non-draft projects.
- [ ] Render vault Markdown through Astro on `/projects/[slug]`.
- [ ] Render the typed media gallery with lazy loading.
- [ ] Add metadata, canonical URL, links, and next/previous navigation.
- [ ] Verify direct navigation with JavaScript disabled.

### Task 7.3: Progressive modal enhancement

- [ ] Add an accessible Modal primitive.
- [ ] Use the same normalized project detail model as the canonical route.
- [ ] Pre-render trusted project detail content in Astro templates and clone
      it into the modal rather than introducing arbitrary browser HTML parsing.
- [ ] Restore trigger focus on close and support Escape.
- [ ] Make card titles real links so route fallback remains available.
- [ ] Consider a shareable `?project=<slug>` state only after basic behavior passes.

### Task 7.4: Modal media behavior

- [ ] Constrain images/video to the available viewport.
- [ ] Avoid nested scrolling where one clear modal scroll region is sufficient.
- [ ] Pause native video when the modal closes.
- [ ] Use privacy-enhanced embed URLs where supported.

**Verification:** Modal and canonical routes present equivalent core content.
axe and keyboard tests pass before production promotion.

## Phase 8: Restructure the portfolio into concise pages

### Task 8.1: Create dedicated pages

- [ ] Add `/about` with biography, toolbox, experience, and education.
- [ ] Add `/gallery` with the complete gallery.
- [ ] Keep `/projects` and `/blog` as complete collections.
- [ ] Update desktop and mobile navigation to use page routes rather than assuming
      landing-page anchors.

### Task 8.2: Trim the landing page

- [ ] Keep Hero.
- [ ] Replace full About with a concise teaser and `/about` link.
- [ ] Render only three or four selected projects.
- [ ] Render only three recent blog posts.
- [ ] Remove full Gallery, Experience, and Education from `/`.
- [ ] Keep a compact Contact/footer.

### Task 8.3: Density tokens

- [ ] Define compact, standard, and spacious section spacing tokens.
- [ ] Replace repeated unconditional `py-24` and `mb-12` values where promoted.
- [ ] Verify anchor offsets, sticky navigation, and mobile bottom navigation.
- [ ] Preserve the paper-first static rendering and zero simulation bundles.

**Review gate:** Compare the old and new landing pages at desktop and mobile sizes.
Do not remove old section routes/components until the new pages are accepted.

## Phase 9: Widen and rebalance blog layouts

### Task 9.1: Article grid

- [ ] Test prose measures from `68ch` through `76ch` in the lab.
- [ ] Promote the approved desktop measure, targeting approximately `72–76ch`.
- [ ] Widen the outer grid so the table of contents does not squeeze prose.
- [ ] Hide or relocate the table of contents when insufficient width exists.

### Task 9.2: Breakout content

- [ ] Add controlled wide treatment for code, tables, diagrams, and media.
- [ ] Prevent mobile horizontal page overflow.
- [ ] Keep captions and callouts aligned with the reading grid.
- [ ] Verify every blog variant uses the same width contract.

### Task 9.3: Archive controls

- [ ] Add tag filtering, search, and sorting to the blog archive.
- [ ] Keep date-first compact list as the default unless lab review selects another
      presentation.
- [ ] Encode filter state in the URL.

**Verification:** Representative long prose, code-heavy, image-heavy, and table-heavy
posts remain readable at mobile, tablet, and desktop widths.

## Phase 10: Reorganize About and toolbox

### Task 10.1: Content edit

- [ ] Replace the landing copy with one concise statement and a small fact list.
- [ ] Edit detailed biography for `/about` without duplicating the landing text.
- [ ] Review grammar and consistent terminology.

### Task 10.2: Skill taxonomy

- [ ] Split broad categories into Languages, Frontend, Backend, Data and ML,
      Infrastructure, and Tools.
- [ ] Decide whether category and curated order require explicit fields in data.
- [ ] Avoid representing proficiency unless there is a meaningful, maintainable
      source for it.

### Task 10.3: Skill views

- [ ] Compare grouped list, compact matrix, and table-like index in the lab.
- [ ] Use consistent category label widths and row spacing.
- [ ] Make icons optional and consistently positioned.
- [ ] Assign accents by category or meaning rather than alternating every skill.
- [ ] Promote one default view to `/about` after human review.

**Verification:** Long categories wrap without isolated labels or visually unbalanced
empty columns at common widths.

## Phase 11: Testing and quality gates

### Task 11.1: Component test setup

- [ ] Add Svelte Testing Library and user-event only when Phase 2 begins.
- [ ] Test lab controls by role and accessible name, not implementation selectors.
- [ ] Test all collection semantics and modal focus behavior.

### Task 11.2: Accessibility

- [ ] Add axe coverage for lab inspector, project views, toolbar, overflow modes,
      modal, article layout, and toolbox.
- [ ] Manually verify keyboard operation and screen-reader announcements.
- [ ] Verify WCAG AA contrast for promoted palettes.
- [ ] Honor reduced-motion preferences.

### Task 11.3: Browser tests

- [ ] Add Playwright after component behavior stabilizes.
- [ ] Cover responsive view changes, filtering, URL restoration, reorder, modal
      open/close, canonical fallback, and multi-page navigation.
- [ ] Test production behavior separately from the development-only lab route.

### Task 11.4: Visual review

- [ ] Keep broad experiment snapshots review-only.
- [ ] Promote snapshots to CI blocking only for stable approved primitives and
      patterns.
- [ ] Document intentional palette and spacing changes when baselines update.

### Task 11.5: Full verification

- [ ] Run Svelte autofixer on every changed Svelte file until clean.
- [ ] Run proactive LSP diagnostics.
- [ ] Run unit/component tests.
- [ ] Run axe and Playwright suites when introduced.
- [ ] Run TypeScript, lint, and formatting checks.
- [ ] Run the Astro production build.
- [ ] Confirm `/ui-lab` production output redirects and contains no lab markup.
- [ ] Confirm portfolio/blog HTML does not reference Three.js, r3f, or Leva chunks.
- [ ] Run `git diff --check` and session diagnostics.

## Phase 12: Promotion and cleanup

- [ ] Promote only human-approved view modes, spacing ranges, palette, and content
      structures.
- [ ] Keep experimental presets in the lab when they remain useful for comparison.
- [ ] Remove controls that have no plausible future review value.
- [ ] Remove obsolete production sections only after their dedicated pages pass
      review.
- [ ] Audit dependencies after modal and legacy React cleanup are complete.
- [ ] Update the UI Lab specification, ADR if architectural decisions changed,
      `CONTEXT.md` if domain language changed, and the Obsidian design note.

## Rollback strategy

- Each delivery unit must be independently revertible.
- Preserve current production defaults while adding lab variants.
- Add new routes before removing content from `/`.
- Keep legacy project media fields until all vault records migrate.
- Keep card links functional even if modal enhancement is removed.
- Scope palette tokens to the lab until explicit production approval.
- Do not mix dead React cleanup with this redesign.

## Known risks

- Too many controls can make the lab itself difficult to use. Mitigate with tabbed
  controls, presets, and Reset.
- A generic collection abstraction can erase domain semantics. Share control logic,
  not project/blog/skill markup indiscriminately.
- Modal content can duplicate canonical-page behavior. Treat the route as the source
  of truth and modal as progressive enhancement.
- Wider prose can harm readability if promoted without testing actual articles.
- Texture can reduce contrast or create visual noise. Keep it subtle and measurable.
- Filtering and reorder animations can harm accessibility. Preserve stable focus,
  announcements, and reduced-motion behavior.
- URL state can become brittle. Version or tolerate older parameters and
  always use safe defaults.

## Completion definition

The initiative is complete when the approved specification acceptance
criteria pass, all selected experiments have explicit production or lab-only
dispositions, dedicated pages replace the long landing-page sections, project
details have route fallback, and the complete verification suite passes
without introducing simulation dependencies on portfolio routes.
