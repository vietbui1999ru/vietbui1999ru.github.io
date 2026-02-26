# AGENTS.md

## Cursor Cloud specific instructions

This is an **Astro + React + shadcn/ui + Tailwind CSS** portfolio site.

### Running the dev server

```bash
pnpm dev --host 0.0.0.0
```

The site runs at `http://localhost:4321/` with HMR.

### Key commands

See `package.json` scripts:
- `pnpm dev` — dev server (port 4321)
- `pnpm build` — production build to `dist/`
- `pnpm lint` — runs `oxlint`
- `pnpm fmt` — runs `oxfmt`
- `pnpm check` — runs both lint + fmt

### Caveats

- The `pnpm.onlyBuiltDependencies` field in `package.json` allows build scripts for `esbuild`, `sharp`, and `msw`. Without this, `pnpm install` skips native addon compilation and the dev server/build will fail.
- The old Hugo theme submodule (`themes/hugo-profile/`) still exists in the repo but is not used by Astro. Lint warnings from files in `themes/` are from that legacy code.
- Oxlint reports ~75 warnings (mostly from vendor JS in `themes/`); 0 errors. This is expected.
- No automated test framework is configured in this repo.
