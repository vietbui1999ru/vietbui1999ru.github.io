# Svelte AI — agent instructions (index)

> Source: <https://svelte.dev/docs/ai/instructions> (official Svelte AGENTS.md prompt).
> This file is the home of the Svelte AI integration for this repo. Related
> links: [links.md](./links.md). Best practices digest:
> [best-practices.md](./best-practices.md).

You are able to use the Svelte MCP server, where you have access to
comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the
available tools effectively:

## Available Svelte MCP Tools

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a
structured list with titles, use_cases, and paths. When asked about Svelte or
SvelteKit topics, ALWAYS use this tool at the start of the chat to find
relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or
multiple sections. After calling the list-sections tool, you MUST analyze the
returned documentation sections (especially the use_cases field) and then use
the get-documentation tool to fetch ALL documentation sections that are
relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. You MUST use this
tool whenever writing Svelte code before sending it to the user. Keep calling
it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code. After completing
the code, ask the user if they want a playground link. Only call this tool
after user confirmation and NEVER if code was written to files in their
project.

## Fallback: `@sveltejs/mcp` CLI (no MCP server required)

In environments where the MCP server is not connected (e.g. Pi sessions),
the same three capabilities are available as a plain CLI via `npx`:

```bash
# 1. list documentation sections (same catalog as the MCP tool)
npx -y @sveltejs/mcp list-sections

# 2. fetch full docs for sections (match by title or path)
npx -y @sveltejs/mcp get-documentation 'svelte/$state,svelte/$derived'

# 3. autofix a Svelte file (run until zero issues/suggestions)
npx -y @sveltejs/mcp svelte-autofixer src/components/svelte/PaperNav.svelte
```

Notes:

- When passing inline code containing runes (`$state`, `$derived`, …),
  escape `$` as `\$` — passing a file path is usually easier.
- `--svelte-version 4|5` (default 5), `--async` for async-Svelte analysis.
- Autofixer prints `issues`, `suggestions`, and
  `require_another_tool_call_after_fixing` — loop until clean.

## Remote MCP server (for MCP-capable clients)

The hosted server lives at `https://mcp.svelte.dev/mcp`. Local stdio variant:
`npx -y @sveltejs/mcp`. One-shot project setup (official): `npx sv add mcp`.
