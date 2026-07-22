## Agent skills

### Issue tracker

GitHub Issues at github.com/vietbui1999ru/vietbui1999ru.github.io. See `docs/agents/issue-tracker.md`.

### Triage labels

Five labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at root + `docs/adr/` for decisions. See `docs/agents/domain.md`.

### Svelte MCP

The portfolio UI is migrating to Svelte islands (ADR 001). When writing or reviewing Svelte/SvelteKit code, follow `docs/svelte/AGENTS.md` (the repo's Svelte AI index):

1. `list-sections` — call FIRST to discover documentation sections (titles, `use_cases`, paths).
2. `get-documentation` — after analyzing `use_cases`, fetch ALL sections relevant to the task.
3. `svelte-autofixer` — MUST run on any Svelte code before presenting it; repeat until no issues or suggestions remain.
4. `playground-link` — only after explicit user confirmation; never for code written to project files.

If the Svelte MCP server is not connected in the current environment, use the CLI equivalent via `npx -y @sveltejs/mcp <list-sections|get-documentation|svelte-autofixer>` (see `docs/svelte/AGENTS.md` for exact commands). Best practices digest: `docs/svelte/best-practices.md`. Links: `docs/svelte/links.md`.
