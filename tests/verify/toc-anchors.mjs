// Checks a built page renders a TOC whose anchors all point at real headings.
// Usage: node tests/verify/toc-anchors.mjs <index.html> [minLinks=3]
// Exits 1 when the TOC is missing, too short, or a link has no matching id.
import fs from "node:fs";

const [file, minArg] = process.argv.slice(2);
const minLinks = Number(minArg ?? 3);
if (!file) {
  console.error("usage: toc-anchors.mjs <html-file> [minLinks]");
  process.exit(2);
}

const html = fs.readFileSync(file, "utf-8");
const tocStart = html.indexOf('data-block="toc"');
if (tocStart === -1) {
  console.error("no toc block rendered");
  process.exit(1);
}
// The TOC lists are the links that follow the marker, up to the next closing </nav> or </details>.
const rest = html.slice(tocStart);
const end = Math.min(
  ...["</nav>", "</details>"].map((t) => rest.indexOf(t)).filter((i) => i > 0),
);
const links = [...rest.slice(0, end).matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(links)];

if (unique.length < minLinks) {
  console.error(`toc has ${unique.length} links, need at least ${minLinks}`);
  process.exit(1);
}
const missing = unique.filter((slug) => !html.includes(`id="${slug}"`));
if (missing.length > 0) {
  console.error(`toc anchors without a heading: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`ok: ${unique.length} toc anchors match headings (${unique.join(", ")})`);
