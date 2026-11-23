// Checks the built home page has one footer contact block with five links,
// and no separate contact or availability copy.
// Usage: node tests/verify/footer-links.mjs <index.html>
import fs from "node:fs";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("usage: footer-links.mjs <html-file>");
  process.exit(2);
}

const html = fs.readFileSync(file, "utf-8");
const navs = html.split('aria-label="Elsewhere"').length - 1;
if (navs !== 1) {
  console.error(`expected one "Elsewhere" contact block, found ${navs}`);
  process.exit(1);
}
const start = html.indexOf('aria-label="Elsewhere"');
const block = html.slice(start, html.indexOf("</nav>", start));
const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const expected = 5;
if (hrefs.length !== expected) {
  console.error(`expected ${expected} footer links, found ${hrefs.length}: ${hrefs.join(", ")}`);
  process.exit(1);
}
if (/open to new opportunities/i.test(html)) {
  console.error("availability copy is still rendered");
  process.exit(1);
}
console.log(`ok: ${hrefs.length} footer links (${hrefs.join(", ")})`);
