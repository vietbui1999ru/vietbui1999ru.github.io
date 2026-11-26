// @ts-check
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import remarkCallout from "@r4ai/remark-callout";
import remarkMath from "remark-math";
import { remarkTypst } from "./src/lib/remark/typst-plugin";
import { remarkMermaid } from "./src/lib/remark/mermaid-plugin";
import { remarkVideo } from "./src/lib/remark/video-plugin";
import { remarkStripComments } from "./src/lib/remark/strip-comments";
import rehypeKatex from "rehype-katex";
import { remarkPreview } from "./src/lib/remark/preview";
import { remarkEmbeds } from "./src/lib/remark/embeds";
import { remarkWikilinks, resolve } from "./src/lib/remark/wikilinks";
import { createAssetAdapters } from "./src/lib/remark/adapters";
import { getVaultRoot } from "./src/lib/vault";
import { buildSiteWikilinkIndex } from "./src/lib/build-wikilink-index";
import { publishPreview } from "./src/lib/publish/preview-route";
import { copyLibraryCovers } from "./src/lib/library-covers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const site = process.env.VERCEL
  ? process.env.VERCEL_ENV === "production"
    ? "https://vietbui1999ru.github.io"
    : `https://${process.env.VERCEL_URL}`
  : (process.env.SITE ?? "http://localhost:4321");
const base = process.env.BASE || "/";

const vaultRoot = getVaultRoot(__dirname);

const { copyAsset, resolveExcalidraw } = createAssetAdapters({
  attachmentsRoot: path.join(vaultRoot, "Attachments"),
  publicRoot: path.resolve(__dirname, "public"),
});

const wikilinkIndex = buildSiteWikilinkIndex(vaultRoot);

// Pre-copy gallery images at config-load time so they land in public/ before
// Astro does the public/ → dist/ copy (SSG page rendering is too late).
const GALLERY_IMAGE_RE = /^image:\s*"?([^"'\n][^\n]*?)"?\s*$/m;
const galleryDir = path.join(vaultRoot, "Gallery");
if (fs.existsSync(galleryDir)) {
  for (const file of fs.readdirSync(galleryDir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(galleryDir, file), "utf-8");
    const m = content.match(GALLERY_IMAGE_RE);
    if (!m) continue;
    const filename = m[1].trim();
    try {
      copyAsset(filename, "gallery");
    } catch {
      console.warn(`[gallery] image not found in Attachments: ${filename}`);
    }
  }
}

// Library covers go into src/ (gitignored) so astro:assets can resize them.
// Drafts and unpublished items keep their covers out of production builds.
copyLibraryCovers(vaultRoot, path.resolve(__dirname, "src/assets/library"), {
  dev: process.argv.includes("dev"),
});

export default defineConfig({
  site,
  base,
  integrations: [react(), svelte(), publishPreview()],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: true,
    },
    remarkPlugins: [
      remarkCallout,
      remarkMath,
      remarkStripComments,
      remarkTypst,
      remarkMermaid,
      remarkVideo,
      remarkPreview,
      [
        remarkEmbeds,
        {
          attachmentsRoot: path.join(vaultRoot, "Attachments"),
          copyAsset,
          resolveExcalidraw,
          resolveNote: (name: string) => {
            const t = resolve(wikilinkIndex, name);
            return t && t.url ? { url: t.url, title: t.title, preview: t.preview } : undefined;
          },
        },
      ],
      [
        remarkWikilinks,
        {
          index: wikilinkIndex,
          onDead: (slug: string, file: string) =>
            console.warn(`[wikilinks] dead link: [[${slug}]] in ${file}`),
        },
      ],
    ],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  },
});
