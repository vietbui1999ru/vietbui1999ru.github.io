# Astro Migration – Subagent Handoff

> **Purpose:** Structured handoff for dispatching code-writer, frontend-debug-tester, and code-reviewer in sequence to complete the Astro + shadcn migration.

**Date:** 2025-02-24  
**Branch:** `feature/astro-migration`  
**Worktree:** `.worktrees/astro-migration`

---

## Context

- **Source:** Next.js 16, React 19 portfolio at `vietbui1999ru.github.io`
- **Target:** Astro 5 + shadcn + Tailwind 4, single-page scroll layout
- **Design:** `docs/plans/2025-02-24-astro-shadcn-migration-design.md`
- **Plan:** `docs/plans/2025-02-24-astro-shadcn-migration-plan.md`

**Current worktree state:** Worktree exists but still contains Next.js (not yet scaffolded to Astro).

---

## Phase 1: Code-Writer

**Subagent:** `code-writer`  
**Invoke:** First

### Task

Execute the implementation plan (Tasks 1–23) in the worktree at:

```
WORKTREE: /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io/.worktrees/astro-migration
SOURCE:   /Users/vietquocbui/repos/VsCode/vietbui1999ru/Portfolio/vietbui1999ru.github.io/src
```

### Execution Order

| Task | Description |
|------|-------------|
| 1 | Branch exists; ensure `.worktrees/` in .gitignore; skip to Task 2 |
| 2 | Scaffold Astro from astro-shadcn-ui-template; replace Next.js; `pnpm dev` |
| 3–4 | Astro config (React, aliases); migrate `utils.ts`, `useOnClickOutside.ts` |
| 5–9 | SectionHeading, ColorfulText, GradientText, RotatingText, TypingText, dockHeading |
| 10–11 | NavBarDock (anchor links, no usePathname); Singularity shader |
| 12–14 | AnimatedModal, CardsCarousel, ThemeSwitch, ThemeProvider |
| 15–16 | BaseLayout.astro, global.css, index.astro; Home section |
| 17 | Migrate data files to `src/data/` |
| 18–20 | About, Projects, Experience, Education, Achievements, Contact, Gallery |
| 21–22 | Blog Content Collections, blog index/[slug], Blog section |
| 23 | Full build, preview, smoke test |
| 24 | (Optional) `docs/OBSIDIAN_INTEGRATION.md` |

### Astro Adaptations

- Add `"use client"` to React components; use `client:load` / `client:visible` in Astro
- Replace `Link` with `<a href="#home">` etc.
- Replace `usePathname` with `window.location.hash` or anchor links
- Fix imports to use `@/` aliases

### Expected Output

1. Summary of what was done and what remains
2. List of created/modified files in worktree
3. `pnpm build` and `pnpm preview` status
4. Any blockers
5. Handoff note for frontend-debug-tester

---

## Phase 2: Frontend-Debug-Tester

**Subagent:** `frontend-debug-tester`  
**Invoke:** After code-writer completes (or reports blockers)

### Task

Verify the migrated site in the worktree and fix runtime/build issues.

### Steps

1. **Open worktree** – Ensure worktree `.worktrees/astro-migration` is the active context
2. **Install deps** – `cd .worktrees/astro-migration && pnpm install`
3. **Run dev** – `pnpm dev`; verify dev server starts
4. **Run build** – `pnpm build`; fix any build errors
5. **Run preview** – `pnpm preview`; smoke test in browser
6. **Verify** – NavBarDock, Home (Singularity, TypingText, RotatingText), all sections, theme switch, blog links

### Expected Output

- Bug summary, root cause, fix, tests (if applicable)
- Verification that dev, build, and preview succeed
- Handoff note for code-reviewer

---

## Phase 3: Code-Reviewer

**Subagent:** `code-reviewer`  
**Invoke:** After frontend-debug-tester completes

### Task

Review the migrated codebase for quality, consistency, and adherence to the plan.

### Scope

- Code quality and consistency
- Adherence to design doc and implementation plan
- Component migration correctness (NavBarDock, Singularity, RotatingText, TypingText, etc.)
- Data file migration
- Blog Content Collections setup
- Any security or performance concerns

### Expected Output

- Code review report with high-priority issues
- Suggestions for improvements
- Confirmation or gaps vs. plan

---

## Coordination Notes

1. **Sequential order:** code-writer → frontend-debug-tester → code-reviewer
2. **Worktree path:** All work must be done in `.worktrees/astro-migration` (or equivalent absolute path)
3. **Source reference:** Components and data live in main repo `src/`; copy into worktree
4. **Model config:** If subagent invocation fails with "Model name is not valid: Sonnet", update the code-writer agent config or invoke via another mechanism

---

## Quick Reference: Subagent Types

- `code-writer` – Implementation
- `frontend-debug-tester` – Verification and bug fixes
- `code-reviewer` – Quality review
