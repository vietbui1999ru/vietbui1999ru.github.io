# Shared UI Primitives

- **Status:** Proposal — implementation not started
- **Date:** 2026-10-31
- **Related:** ADR 001 (Svelte islands), `2026-07-23-ui-lab.md` (density + IA goals)

## Problem

The Paper & Ink look is applied by copy-pasting long Tailwind class strings.
The same visual element exists in several drifting variants:

| Pattern | Copies | Drift |
| --- | --- | --- |
| Section header (index · h2 · rule · kicker) | 8 components | spacing `mb-6` vs `mb-8`, optional kicker |
| Chip / badge | 9 sites | `0.64rem` vs `0.68rem`, `border-ink` vs `border-journal-2`, `tracking-wide` vs `-wider`, with/without `bg-paper-raised` |
| Raised CTA (`gleam lift … shadow-hard`) | 7 sites | padding, inverse variant in contact |
| Mono uppercase `u-draw` link | 11 sites | external `target/rel/↗` hand-written each time |
| Back link | 8 pages | five different labels, one using legacy shadcn tokens |
| Page header (h1 block) | 4 pages, 3 styles | `/about`, `/gallery`, `/projects` have no h1 at all |
| Prose class string | 3 pages | blog and thoughts duplicated; project detail differs |
| Pastel by index (`PASTELS[i % 4]`) | 6 components | color carries no meaning |
| Container (`mx-auto max-w-[var(--content-max)] px-4 sm:px-6`) | ~12 sites | widths range from 76ch to 96rem with no scale |
| Site footer | home only | lives inside `PaperContact` |

The existing `primitives/Button.svelte` is only used by `/ui-lab`, and its
hover style (`-translate-y-0.5`) does not match the production `lift` motion.

## Goals

1. One source for each repeated element, so a visual change is one edit.
2. A small width and spacing scale instead of per-page magic numbers.
3. No visual regressions in the first pass: primitives reproduce today's
   look (picking the majority variant where copies drift); redesign comes after.
4. Primitives render statically from `.astro` pages (no `client:*` needed)
   and from Svelte islands.
5. Ink-ambient integration is preserved: `data-section-id` sentinels and
   `data-ink-obstacle` attributes must still reach the DOM.

## Non-goals

- Changing section order, nav numbering, or page content (separate work).
- Paper-stock palettes (UI-lab spec, later).
- Removing legacy shadcn tokens/React deps (separate cleanup).

## Layer 1 — tokens (`src/styles/global.css`, `@theme`)

Tailwind v4 turns `--container-*` into `max-w-*` and `--spacing-*` into
spacing utilities, so these become first-class classes.

```css
@theme inline {
  --container-reading: 76ch;  /* max-w-reading — articles, thoughts */
  --container-page: 96rem;    /* max-w-page — today's --content-max ceiling */
  --spacing-gutter: clamp(1rem, 0.6rem + 2vw, 1.5rem); /* px-gutter */
  --spacing-section: clamp(3rem, 2.25rem + 2.5vw, 4rem); /* py-section ≈ py-12 → py-16 */
}

@utility page-container {
  @apply mx-auto w-full max-w-page px-gutter;
}
```

`--content-max` (`clamp(288px, 94vw, 96rem)`) is retired: the 94vw term plus
`px-4` doubled the mobile gutter. `max-w-page` keeps the same 96rem ceiling;
whether that ceiling should shrink is a later design decision, now a one-line
token change.

## Layer 2 — CSS-only primitives

Kept as classes because they style many element types (`a`, `span`, `button`)
and are used in Markdown-adjacent Astro markup.

- **`.label-mono`** — `font-mono text-step--1 uppercase tracking-wider`, the
  journal label used in kickers, dates, meta rows (~30 sites).
- **Prose** — `src/design-system/prose.ts` exports one `PROSE` class string
  (the blog version, superset of the others). Pages add width separately
  (`max-w-reading` or `max-w-none`). Replaces the three inline copies.

## Layer 3 — Svelte primitives (`src/components/primitives/`)

All accept `...rest` and spread it onto the root element so `id`,
`data-ink-obstacle`, `aria-*` pass through.

### `Section.svelte`
```ts
{ id: string; sentinel?: boolean = true; spacing?: "section" | "none"; children }
```
Renders `<section id class="relative w-full py-section">`, the
`data-section-id` sentinel div (consumed by `InkAmbient.svelte`), and a
`page-container` wrapper. Removes ~5 lines from each of 8 sections.

### `SectionHeader.svelte`
```ts
{ title: string; index?: string; kicker?: string; as?: "h1" | "h2" = "h2" }
```
Index number is optional so the nav-numbering decision does not block this.
Standard margin `mb-8`.

### `PageHeader.svelte`
```ts
{ title: string; kicker?: string; description?: string;
  back?: { href: string; label: string }; meta?: Snippet; children?: Snippet }
```
Always an `<h1>`. Covers blog archive, blog post, thoughts, project detail,
and gives `/about`, `/gallery`, `/projects` a real page heading. Back link
labels become parent-specific: `← home`, `← blog`, `← projects`.

### `Chip.svelte`
```ts
{ tone?: "ink" | "muted" | "raised" | Pastel = "ink"; caps?: boolean;
  href?: string; title?: string; children }
```
`<svelte:element this={href ? "a" : "span"}>`. One size:
`px-2 py-0.5 font-mono text-[0.68rem] tracking-wide`. Covers tags, badges,
status, GPA, and archive tag rows. Filter-toggle buttons in the blog archive
stay buttons but reuse the tone classes via an exported `chipClass()`.

### `InkLink.svelte`
```ts
{ href: string; external?: boolean; arrow?: "→" | "←" | "↗" | false; tone?: "ink" | "muted" }
```
The `u-draw` mono link. `external` sets `target="_blank" rel="noopener noreferrer"`
and defaults the arrow to `↗`.

### `Button.svelte` (extend existing)
- Add `href` → renders `<a>`; otherwise `<button>`.
- Variants become `raised` (production CTA: `gleam lift bg-paper-raised shadow-hard`),
  `inverse` (contact email: `bg-ink text-paper`), `outline`, `ghost`.
  `solid` is renamed to `inverse`; only `/ui-lab` and `tests/components/Button.test.ts`
  use it today.
- Hover motion switches to the shared `.lift` utility.

### `SiteFooter.svelte`
Moved out of `PaperContact` into `BaseLayout.astro`, so every page ends the
same way. Contents unchanged: name · year, stack note; add the social
`InkLink`s so contact is reachable from any page.

## Layer 4 — helpers (`src/design-system/tone.ts`)

```ts
export type Pastel = "sage" | "dust" | "rose" | "butter";
export function toneFor(key: string): Pastel; // stable string hash → pastel
export const STATUS_TONE: Record<ProjectStatus, Pastel | "muted">;
```
Replaces the six `PASTELS[i % n]` arrays. Color then follows the thing
(skill category, tag, company) instead of list position, so the same tag is
the same color on every page.

## Migration order

Each step is independently shippable and visually neutral.

1. Tokens + `page-container` + `.label-mono` + `PROSE`. Swap containers and
   prose strings.
2. `Section` + `SectionHeader`. Migrate the 8 section components.
3. `Chip` + `toneFor`. Migrate chips; color assignment intentionally changes
   here (the one visible change — review in `/ui-lab`).
4. `InkLink` + `Button` extension. Migrate links and CTAs.
5. `PageHeader` + `SiteFooter`. Migrate pages; add missing h1s.

## Verification

- Each primitive gets a Vitest + Testing Library test (render, `rest`
  pass-through, `href` element switching, external link attributes).
- `svelte-autofixer` clean on every new/changed component (per `CLAUDE.md`).
- Before/after screenshots of `/`, `/about`, `/projects`, `/blog`, one post,
  `/thoughts`, `/gallery` at 390px and 1440px, light and dark.
- Ink ambient still reacts to section changes and obstacles on `/`.
- Add each primitive to `/ui-lab` so variants are reviewable in one place.

## Open decisions

1. Default page width: keep the 96rem ceiling for now, or adopt a narrower
   `max-w-page` (e.g. 72rem) in the same pass?
2. Keep section index numbers (`02`, `03`…) at all? `SectionHeader` supports
   both; the answer belongs to the nav/IA work.
3. Back-link wording: parent-specific (`← blog`) as proposed, or a uniform
   label?
