import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

/** Injects /_preview under `astro dev` only, so no production build contains it. */
export function publishPreview(): AstroIntegration {
  return {
    name: "publish-preview",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") return;
        injectRoute({
          pattern: "/_preview",
          entrypoint: fileURLToPath(new URL("./preview.astro", import.meta.url)),
        });
      },
    },
  };
}
