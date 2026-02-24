// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const site = process.env.VERCEL
  ? process.env.VERCEL_ENV === "production"
    ? "https://vietbui1999ru.github.io"
    : `https://${process.env.VERCEL_URL}`
  : (process.env.SITE ?? "http://localhost:4321");
const base = process.env.BASE || "/";

// https://astro.build/config
export default defineConfig({
  site,
  base,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  },
});
