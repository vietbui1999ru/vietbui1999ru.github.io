---
name: project_dead_code_findings
description: Dead code and modularity issues found in portfolio src/ during 2026-05-14 review. Reference for future cleanup reviews.
metadata:
  type: project
---

Dead code cluster found 2026-05-14:

- `src/components/MainNav.tsx` — fully dead, hardcoded shadcn template links, no consumers
- `src/components/MobileNav.tsx` — fully dead, hardcoded shadcn template links, no consumers
- `src/components/ui/apple-hello-text.tsx` — superseded by `apple-hello-effect.tsx`, no consumers
- `src/components/ui/helloEffectData.ts` — exports SVG data default, never imported anywhere
- `src/components/ui/FourierTextDrawer.tsx` + `src/lib/fourier.ts` — confirmed dead, no consumers
- `src/components/ui/combobox.tsx` — shadcn scaffold, 0 consumers
- `src/components/ui/field.tsx` — shadcn scaffold, 0 consumers
- `src/components/ui/alert-dialog.tsx` — shadcn scaffold, 0 consumers
- `src/components/ui/dropdown-menu.tsx` — shadcn scaffold, 0 consumers
- `src/components/ui/select.tsx` — shadcn scaffold, 0 consumers
- `src/components/ui/switch.tsx` — shadcn scaffold, 0 consumers

Dead constants in `src/data/homeData.ts` (exported, never consumed):
- `INTRO_ROTATING_WORDS`, `INTRO_ROTATING_DURATION`, `SINGULARITY_SCROLL_MIN`, `SINGULARITY_SCROLL_MAX`, `SINGULARITY_SIZE_RESIZE_FACTOR`, `INTRO_ROTATING_DELAY_AFTER_TYPING`

Dead constants in `src/data/aboutData.ts`:
- `ABOUT_TITLE`, `SKILLS_SECTION_TITLE`, `SkillType` (type)

Duplicate logic: `apple-hello-effect.tsx` lines 129–199 — 7 identical wrapper functions, each a single-prop-diff call to `InViewHandwritingAnimation`. Could be a data-driven factory.

**Why:** These are confirmed to exist as of this review date.
**How to apply:** Skip re-auditing these specific files in future reviews; focus on whether they've been cleaned up.
