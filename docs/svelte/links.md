# Svelte AI — link index

Official AI tooling docs: <https://svelte.dev/docs/ai/overview>

| Resource              | URL                                       | Notes                                                                                                        |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| AGENTS.md prompt      | <https://svelte.dev/docs/ai/instructions> | Copied into [AGENTS.md](./AGENTS.md)                                                                         |
| MCP server            | <https://svelte.dev/docs/ai/mcp>          | Remote: `https://mcp.svelte.dev/mcp`; local: `npx -y @sveltejs/mcp`                                          |
| CLI                   | <https://svelte.dev/docs/ai/cli>          | `list-sections`, `get-documentation`, `svelte-autofixer` via npx                                             |
| Prompts (svelte-task) | <https://svelte.dev/docs/ai/prompts>      | Recommended task prompt for MCP clients                                                                      |
| Skills                | <https://svelte.dev/docs/ai/skills>       | `svelte-code-writer`, `svelte-core-bestpractices`; releases: <https://github.com/sveltejs/ai-tools/releases> |
| Subagents             | <https://svelte.dev/docs/ai/subagent>     | Focused parallel agents (Claude Code / Codex / Copilot / OpenCode plugins)                                   |
| ai-tools repo         | <https://github.com/sveltejs/ai-tools>    | Source for MCP server, skills, plugins                                                                       |
| One-shot setup        | `npx sv add mcp`                          | Installs MCP config + AGENTS.md prompt automatically                                                         |

## Core Svelte docs (for get-documentation lookups)

- Svelte 5 docs: <https://svelte.dev/docs/svelte>
- SvelteKit docs: <https://svelte.dev/docs/kit> (reference only — this repo
  uses Astro + Svelte islands, not SvelteKit; see ADR 001)
- llms.txt endpoints: append `/llms.txt` to any docs/ai page
