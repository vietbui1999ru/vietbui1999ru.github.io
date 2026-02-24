# Obsidian Integration for Blog

This document describes how to connect your Obsidian vault notes to the Astro blog.

## Options

### 1. Vault CMS (Recommended)

[Vault CMS](https://vaultcms.org/) is a headless CMS for Astro powered by Obsidian and Git.

```bash
pnpm create vault-cms
```

- Write blog posts in Obsidian with live preview
- Automatic frontmatter standardization
- Image management
- Open the installation directory as an Obsidian vault

### 2. Symbolic Links

Link your Obsidian blog folder to `src/content/blog`:

```bash
# macOS/Linux
ln -s /path/to/obsidian-vault/blog src/content/blog
```

**Note:** May conflict with Obsidian Sync or cloud storage.

### 3. Manual Copy

Copy markdown files from your Obsidian vault to `src/content/blog/` when ready to publish.

### 4. GitHub Submodules

Use a submodule for the Obsidian vault to avoid sync conflicts:

```bash
git submodule add <vault-repo-url> src/content/obsidian-vault
```

Then configure Astro to read from the submodule path.

## Blog Schema

Posts in `src/content/blog/` should have frontmatter:

```yaml
---
title: "Post Title"
description: "Brief description"
date: 2025-02-24
draft: false
---
```

For MDX support, add `@astrojs/mdx` and use `**/*.mdx` in the content config.
