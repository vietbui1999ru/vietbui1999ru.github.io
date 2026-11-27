// AC-5: in a production build of the garden-vault fixture, /library shows tabs only
// for enabled categories with a published item, and hidden categories get no page.
// Usage: node tests/verify/library-tabs.mjs <outDir>/library/index.html
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("usage: library-tabs.mjs <library/index.html>");
  process.exit(2);
}
const html = fs.readFileSync(file, "utf-8");
const libraryDir = path.dirname(file);
const failures = [];

for (const type of ["book", "game"]) {
  if (!html.includes(`data-library-tab="${type}"`)) failures.push(`missing tab: ${type}`);
  if (!fs.existsSync(path.join(libraryDir, type, "index.html"))) failures.push(`missing page: ${type}`);
}
for (const type of ["film", "recipe"]) {
  if (html.includes(`data-library-tab="${type}"`)) failures.push(`hidden category has a tab: ${type}`);
  if (fs.existsSync(path.join(libraryDir, type))) failures.push(`hidden category has a page: ${type}`);
}
for (const title of ["PLACEHOLDER Book Unpublished", "PLACEHOLDER Recipe Draft"]) {
  if (html.includes(title)) failures.push(`unpublished or draft item shown: ${title}`);
}
if (!/<img[^>]+src="\/_astro\/[^"]+\.webp"[^>]*data-thumbnail/.test(html)) {
  failures.push("no resized webp thumbnail in the grid");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok: library tabs show only visible categories");
