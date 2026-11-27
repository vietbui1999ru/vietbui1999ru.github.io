// Usage: node tests/verify/rail-hydrated.mjs <page.html> <block>...
// Passes when each named block server-renders the timeline rail with its marker.
// Since #38 the rail is not hydrated: a BaseLayout script drives it, so no Astro island is required.
import { readFileSync } from "node:fs";

const [file, ...blocks] = process.argv.slice(2);
if (!file || blocks.length === 0) {
  console.error("usage: rail-hydrated.mjs <page.html> <block>...");
  process.exit(2);
}

const html = readFileSync(file, "utf8");
let failed = false;
for (const block of blocks) {
  const start = html.indexOf(`data-block="${block}"`);
  if (start === -1) {
    console.error(`${block}: block not found`);
    failed = true;
    continue;
  }
  const next = html.indexOf("data-block=", start + 1);
  const section = html.slice(start, next === -1 ? undefined : next);
  const rail = section.indexOf("data-rail");
  const marker = section.indexOf("data-rail-marker");
  if (rail === -1 || marker === -1) {
    console.error(`${block}: no server-rendered rail (rail ${rail}, marker ${marker})`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
