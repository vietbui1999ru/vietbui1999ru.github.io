# Domain Docs

**Layout:** Single-context

| File | Purpose |
|------|---------|
| `CONTEXT.md` | Shared domain language between devs and agents |
| `docs/adr/`  | Architecture Decision Records |

## Agent instructions

- Read `CONTEXT.md` at start of any task involving domain concepts or naming decisions
- Check `docs/adr/` before making architectural choices
- New significant decisions → create ADR at `docs/adr/NNNN-short-title.md`

## ADR format

```markdown
# NNNN: Title

**Status:** Proposed | Accepted | Deprecated | Superseded by [NNNN]
**Date:** YYYY-MM-DD

## Context
What problem or question led to this decision?

## Decision
What was decided?

## Consequences
Positive, negative, or neutral implications.
```
