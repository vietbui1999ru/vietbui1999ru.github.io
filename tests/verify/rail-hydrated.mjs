// Usage: node tests/verify/rail-hydrated.mjs <page.html> <block>...
// Passes when each named block holds an Astro island that renders the timeline rail.
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
  const island = section.indexOf("<astro-island");
  const rail = section.indexOf("data-rail");
  if (island === -1 || rail === -1 || rail < island) {
    console.error(`${block}: no hydrated rail (island ${island}, rail ${rail})`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
