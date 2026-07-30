import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
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
