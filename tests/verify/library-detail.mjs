// AC-9: library detail pages in a production build of the garden-vault fixture.
// Usage: node tests/verify/library-detail.mjs <outDir>/library
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: library-detail.mjs <outDir>/library");
  process.exit(2);
}
const page = (id) => {
  const file = path.join(dir, id, "index.html");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : null;
};
const failures = [];
const check = (ok, message) => ok || failures.push(message);

const active = page("book/placeholder-book-active");
check(active !== null, "missing page: book/placeholder-book-active");
if (active) {
  check(active.includes('data-library-detail="book"'), "active: no detail marker");
  check(active.includes("PLACEHOLDER author · 2001 · 8/10"), "active: meta line missing");
  check(active.includes("data-library-progress"), "active: progress bar missing");
  check(/<img[^>]+src="\/_astro\/[^"]+\.webp"[^>]*data-library-cover/.test(active), "active: resized cover missing");
  check(active.includes('href="/library/book/placeholder-book-done"'), "active: backlink from the done book missing");
}

const done = page("book/placeholder-book-done");
check(done !== null, "missing page: book/placeholder-book-done");
if (done) {
  check(!done.includes("data-library-progress"), "done: progress bar shown on a finished item");
  check(done.includes("FIXTURE-LIBRARY-WRITING"), "done: note body missing");
  check(done.includes("9/10"), "done: rating missing");
  check(done.includes('data-placeholder="book"'), "done: cover placeholder missing");
}

const game = page("game/placeholder-game-done");
check(game?.includes("Switch · 7/10") ?? false, "game: platform and rating missing from meta");

for (const hidden of ["book/placeholder-book-unpublished", "recipe/placeholder-recipe-draft-done", "film/placeholder-film-done"]) {
  check(page(hidden) === null, `hidden item has a page: ${hidden}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok: library detail pages");
