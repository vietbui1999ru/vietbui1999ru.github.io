// Checks that built article pages render the reading rail in the sidebar TOC (#38).
// Usage: node tests/verify/reading-rail.mjs <outDir>
// Exits 1 when a page has no rail, fewer than 3 checkpoints, a checkpoint without a
// matching heading id, or (library) the rail is not below the cover.
import fs from "node:fs";
import path from "node:path";

const [outDir] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: reading-rail.mjs <outDir>");
  process.exit(2);
}

const pages = [
  { name: "blog post", file: "blog/fixture-post/index.html" },
  { name: "project", file: "projects/fixture-project/index.html" },
  { name: "library note", file: "library/book/placeholder-book-sample/index.html", belowCover: true },
];

let failed = false;
const fail = (message) => {
  console.error(message);
  failed = true;
};

for (const page of pages) {
  const file = path.join(outDir, page.file);
  if (!fs.existsSync(file)) {
    fail(`${page.name}: ${page.file} was not built`);
    continue;
  }
  const html = fs.readFileSync(file, "utf-8");
  const start = html.indexOf("data-reading-rail");
  if (start === -1) {
    fail(`${page.name}: no reading rail`);
    continue;
  }
  const rail = html.slice(start, html.indexOf("</nav>", start));
  const slugs = [...rail.matchAll(/data-slug="([^"]+)"/g)].map((m) => m[1]);
  if (slugs.length < 3) fail(`${page.name}: ${slugs.length} checkpoints, need at least 3`);
  const missing = slugs.filter((slug) => !html.includes(`id="${slug}"`));
  if (missing.length > 0) fail(`${page.name}: checkpoints without a heading: ${missing.join(", ")}`);
  if (page.belowCover) {
    const cover = html.indexOf("data-library-cover");
    const body = html.indexOf("data-library-body");
    if (cover === -1 || !(cover < start && start < body))
      fail(`${page.name}: the rail is not between the cover and the body`);
  }
  if (!failed) console.log(`ok: ${page.name} has a reading rail with ${slugs.length} checkpoints`);
}
process.exit(failed ? 1 : 0);
