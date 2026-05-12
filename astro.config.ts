// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";
import { fileURLToPath } from "url";
import remarkCallout from "@r4ai/remark-callout";
import { remarkPreview } from "./src/lib/remark/preview";
import { remarkEmbeds } from "./src/lib/remark/embeds";
import { remarkWikilinks } from "./src/lib/remark/wikilinks";
import { createAssetAdapters } from "./src/lib/remark/adapters";
import { getVaultRoot } from "./src/lib/vault";
import { buildWikilinkIndex } from "./src/lib/build-wikilink-index";

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
  excalidrawCacheDir: path.resolve(__dirname, ".cache/excalidraw"),
});

const wikilinkIndex = buildWikilinkIndex(
  path.join(vaultRoot, "Blogs")
);

export default defineConfig({
  site,
  base,
  integrations: [react()],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: true,
    },
    remarkPlugins: [
      remarkCallout,
      remarkPreview,
      [remarkEmbeds, { attachmentsRoot: path.join(vaultRoot, "Attachments"), copyAsset, resolveExcalidraw }],
      [remarkWikilinks, {
        index: wikilinkIndex,
        onDead: (slug: string, file: string) =>
          console.warn(`[wikilinks] dead link: [[${slug}]] in ${file}`),
      }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  },
});
