# Setting Up Obsidian Vault Notes for the Portfolio Blog

This guide explains how to propagate notes from your Obsidian vault into the blog section of this Astro portfolio. You can write posts in Obsidian and have them appear on your site.

---

## Overview

The portfolio blog uses **Astro Content Collections** and reads Markdown (`.md`) files from `src/content/blog/`. Each post needs frontmatter that matches the schema below. Obsidian notes can feed this folder via several methods.

---

## Required Frontmatter Schema

Every blog post must include this frontmatter:

```yaml
---
title: "Your Post Title"
description: "A brief description for SEO and previews (≤155 chars recommended)"
date: 2025-02-24
draft: false
---
```

| Field       | Type    | Required | Notes                                      |
|-------------|---------|----------|--------------------------------------------|
| `title`     | string  | Yes      | Shown in listings and post header          |
| `description` | string | Yes    | Used for meta description and card previews |
| `date`      | date    | Yes      | Format: `YYYY-MM-DD`                       |
| `draft`     | boolean | No       | Default `false`; set `true` to hide from site |

---

## Option 1: Vault CMS (Recommended)

[Vault CMS](https://vaultcms.org/) turns Obsidian into a headless CMS for Astro. You write in Obsidian and deploy to your site.

### Setup

1. **Create a Vault CMS project** (in a separate directory or as part of this repo):

   ```bash
   pnpm create vault-cms
   ```

2. **Open the project folder as an Obsidian vault**  
   Use *Open folder as vault* in Obsidian and select the Vault CMS directory.

3. **Configure the output path**  
   Point Vault CMS to this portfolio’s `src/content/blog/` (or a path that gets copied there during build).

4. **Write posts in Obsidian**  
   Use the CMS UI or create notes in the configured folder. Frontmatter is standardized automatically.

5. **Build and deploy**  
   Run your normal Astro build; Vault CMS syncs content before or during the build.

### Pros

- Live preview in Obsidian  
- Automatic frontmatter handling  
- Image management  
- Designed for Astro

### Cons

- Extra setup and tooling  
- Separate vault or project structure

---

## Option 2: Symbolic Link (Direct Sync)

Link your Obsidian blog folder directly to the Astro content folder so changes appear immediately.

### Setup

1. **Create a blog folder in your Obsidian vault** (if it doesn’t exist):

   ```
   MyVault/
   └── blog/
       ├── my-first-post.md
       └── another-post.md
   ```

2. **Remove or move the default content** in the Astro blog folder:

   ```bash
   # Backup existing content
   mv src/content/blog src/content/blog.backup

   # Create symlink (replace with your vault path)
   ln -s /path/to/your/obsidian-vault/blog src/content/blog
   ```

3. **Add `.gitignore` entry** (optional, if you don’t want to track the symlink target):

   ```
   # If symlink points outside repo
   src/content/blog/
   ```

4. **Ensure frontmatter**  
   Each note in the linked folder must have the required frontmatter.

### Pros

- No extra tools  
- Instant updates when you edit in Obsidian

### Cons

- May conflict with Obsidian Sync or cloud storage  
- Symlinks can be tricky on Windows  
- Need to keep frontmatter correct manually

---

## Option 3: Manual Copy

Copy notes from your vault into the blog folder when you want to publish.

### Setup

1. **Organize posts in Obsidian**  
   Use a folder like `Vault/blog/` or `Vault/published/`.

2. **Use an Obsidian template** for new posts:

   ```yaml
   ---
   title: "{{title}}"
   description: ""
   date: {{date:YYYY-MM-DD}}
   draft: false
   ---

   ## Content
   ```

3. **Copy to the portfolio** when ready:

   ```bash
   cp /path/to/vault/blog/my-post.md src/content/blog/
   ```

4. **Run the build**:

   ```bash
   pnpm build
   ```

### Pros

- Full control over what gets published  
- No sync or link complexity

### Cons

- Manual step for each post  
- Easy to forget to copy updates

---

## Option 4: Sync Script (Semi-Automated)

Use a script to copy or sync selected notes from your vault to the blog folder.

### Example script (`scripts/sync-blog-from-obsidian.sh`)

```bash
#!/bin/bash
# Sync blog posts from Obsidian vault to Astro content folder
VAULT_BLOG="/path/to/your/obsidian-vault/blog"
ASTRO_BLOG="src/content/blog"

mkdir -p "$ASTRO_BLOG"
rsync -av --include='*.md' --exclude='*' "$VAULT_BLOG/" "$ASTRO_BLOG/"
echo "Synced $(ls -1 "$ASTRO_BLOG"/*.md 2>/dev/null | wc -l) posts"
```

### Usage

1. Save the script and set `VAULT_BLOG` to your vault’s blog folder.
2. Run before building:

   ```bash
   chmod +x scripts/sync-blog-from-obsidian.sh
   ./scripts/sync-blog-from-obsidian.sh
   pnpm build
   ```

3. Optionally add to `package.json`:

   ```json
   "scripts": {
     "sync-blog": "./scripts/sync-blog-from-obsidian.sh",
     "build": "pnpm sync-blog && astro build"
   }
   ```

---

## Obsidian-Specific Tips

### Folder structure

A simple structure that maps well to the blog:

```
Vault/
└── blog/
    ├── 2025-02-24-my-first-post.md
    ├── 2025-02-20-another-post.md
    └── assets/           # Images (see below)
        └── post-image.png
```

### Templates

Create an Obsidian template (e.g. `Templates/Blog Post`) with:

```yaml
---
title: "{{title}}"
description: "{{description}}"
date: {{date:YYYY-MM-DD}}
draft: false
---

# {{title}}

Write your content here...
```

Use the *Templater* or *Templates* plugin to insert it for new posts.

### Images

- **Option A:** Store images in `src/content/blog/` (or a subfolder) and reference them with relative paths: `![alt](./image.png)`.
- **Option B:** Use `public/` for site-wide assets and reference as `/image.png`.
- **Option C:** With Vault CMS or a sync script, copy images from your vault’s asset folder into the blog folder.

### Wikilinks and Obsidian syntax

Obsidian uses `[[wikilinks]]` and `![[embed]]`. Astro’s default Markdown parser does not support these. Options:

1. **Use standard Markdown** in blog notes: `[text](path)` and `![alt](path)`.
2. **Add a remark/rehype plugin** to convert wikilinks to standard links during build.
3. **Use MDX** and custom components if you need more control.

---

## Verifying Setup

1. **Add a test post** to `src/content/blog/` with valid frontmatter.
2. **Run the dev server**:

   ```bash
   pnpm dev
   ```

3. **Check**:
   - Homepage blog section shows the post
   - `/blog` lists it
   - `/blog/your-post-slug` renders correctly

4. **Build**:

   ```bash
   pnpm build
   ```

---

## Troubleshooting

| Issue | Possible fix |
|-------|---------------|
| Post not appearing | Check frontmatter (title, description, date) and file extension `.md` |
| Wrong slug/URL | Astro derives slug from filename; use `my-post-name.md` for `/blog/my-post-name` |
| Images not loading | Ensure paths are relative to the post or use `/` for `public/` assets |
| Drafts showing | Set `draft: true` and filter drafts in your collection query |
| Symlink not working | Use absolute path; on Windows, enable Developer Mode for symlinks |

---

## Summary

| Method | Best for |
|--------|----------|
| **Vault CMS** | Full Obsidian-as-CMS workflow |
| **Symbolic link** | Simple, direct sync from one vault |
| **Manual copy** | Occasional posts, full control |
| **Sync script** | Automated copy without extra CMS |

Choose based on how often you publish and how much automation you want. For most users, **Vault CMS** or a **sync script** offers a good balance.
