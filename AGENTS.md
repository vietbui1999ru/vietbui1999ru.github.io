# AGENTS.md

## Cursor Cloud specific instructions

This is a Hugo static site (personal portfolio) using the `hugo-profile` theme via git submodule.

### Prerequisites (installed by VM snapshot)

- **Hugo extended v0.152.2** at `~/.local/hugo/hugo` (added to PATH via `~/.bashrc`)
- Git submodule `themes/hugo-profile` must be initialized

### Running the dev server

```bash
hugo server --bind 0.0.0.0 --port 1313 --baseURL http://localhost:1313
```

The site is available at `http://localhost:1313/` with live reload enabled.

### Building

```bash
hugo --gc --minify
```

Output goes to `public/`.

### Key caveats

- The theme is a **git submodule** (`themes/hugo-profile`). If the `themes/hugo-profile/` directory is empty, run `git submodule update --init --recursive`.
- There is no package manager (no `package.json`, `go.mod`, etc.). Hugo is the only build tool.
- There are no automated tests or linting tools configured in this repo.
- The CI workflow (`.github/workflows/hugo.yml`) also installs Go, Node.js, and Dart Sass, but only Hugo extended is needed for local development.
- The `public/` directory contains pre-built output committed to the repo; `hugo --gc --minify` regenerates it.
- A deprecation warning about twitter/tweet shortcodes is expected and harmless.
