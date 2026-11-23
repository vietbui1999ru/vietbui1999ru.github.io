import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    svelte(),
    // .astro files are only imported by the block registry; the build renders them.
    // Stub them here so unit tests can load the registry without an Astro compiler.
    {
      name: "astro-component-stub",
      enforce: "pre",
      load(id) {
        if (id.endsWith(".astro")) return "export default function AstroStub() { return null; }";
      },
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    conditions: ["browser"],
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
});
