// Checks that each named block appears in the built HTML, in the order given.
// Usage: node tests/verify/block-order.mjs <index.html> <block-id>...
// Exits 1 when a block is missing or out of order.
import fs from "node:fs";

const [file, ...ids] = process.argv.slice(2);
if (!file || ids.length === 0) {
  console.error("usage: block-order.mjs <html-file> <block-id>...");
  process.exit(2);
}

const html = fs.readFileSync(file, "utf-8");
let previous = -1;
for (const id of ids) {
  const at = html.indexOf(`data-block="${id}"`);
  if (at === -1) {
    console.error(`missing block: ${id}`);
    process.exit(1);
  }
  if (at < previous) {
    console.error(`block out of order: ${id}`);
    process.exit(1);
  }
  previous = at;
}
console.log(`ok: ${ids.join(" > ")}`);
