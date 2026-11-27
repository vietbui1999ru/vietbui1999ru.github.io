// Checks the built pages for the persistent ink canvas (#42).
// Usage: node tests/verify/ink-persist.mjs <outDir>
// Every page must enable the ClientRouter. Pages with the simulation must persist the ink
// island as "ink-ambient", except /playground, whose island must not persist.
import fs from "node:fs";
import path from "node:path";

const [outDir] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: ink-persist.mjs <outDir>");
  process.exit(2);
}

const ROUTER = 'name="astro-view-transitions-enabled"';
const PERSIST = 'data-astro-transition-persist="ink-ambient"';
const INK = /<astro-island[^>]*component-url="[^"]*InkAmbient[^"]*"[^>]*>/g;

const pages = [
  { file: "index.html", persist: true },
  { file: "blog/fixture-post/index.html", persist: true },
  { file: "projects/fixture-project/index.html", persist: true },
  { file: "library/book/placeholder-book-sample/index.html", persist: true },
  { file: "playground/index.html", persist: false },
];

let failed = false;
for (const page of pages) {
  const file = path.join(outDir, page.file);
  if (!fs.existsSync(file)) {
    console.error(`${page.file}: not built`);
    failed = true;
    continue;
  }
  const html = fs.readFileSync(file, "utf-8");
  const islands = html.match(INK) ?? [];
  const problems = [];
  if (!html.includes(ROUTER)) problems.push("no ClientRouter");
  if (islands.length !== 1) problems.push(`${islands.length} ink islands, expected 1`);
  else if (islands[0].includes(PERSIST) !== page.persist)
    problems.push(page.persist ? "ink island does not persist" : "ink island persists on the playground");
  if (problems.length > 0) {
    console.error(`${page.file}: ${problems.join("; ")}`);
    failed = true;
  } else console.log(`ok: ${page.file} (${page.persist ? "persists" : "own simulation"})`);
}
process.exit(failed ? 1 : 0);
