// Mouse versus timeline-rail marker, from the dev monitor's per-frame trace.
//
// The script opens a page on `astro dev` and puts the mouse on a rail. It then runs two
// strokes of DISTANCE px and reads window.__devMonitor.trace for each:
// - fast: one jump (a flick); the marker should lag, overshoot and bounce back;
// - slow: SLOW_SPEED px/s, under the bounce threshold; the marker should not overshoot.
// For each stroke it prints the trace every 50 ms and a summary, timed from the mouse stop:
// - catch-up: time until the marker first comes within 2 px of the target;
// - overshoot: how far the marker passes the target;
// - settle: time until the marker stays within 2 px of the target.
//
// Usage: node scripts/rail-trace.mjs <dev-url> [path] [block]
// Example: node scripts/rail-trace.mjs http://localhost:4321 /about/ experience
//
// Playwright is not a repo dependency. Install it in a scratch folder, as the
// header of scripts/nav-bench.mjs describes, and set NODE_PATH to that folder.
import { createRequire } from "node:module";

// require() honours NODE_PATH; an ESM import does not.
const { chromium } = createRequire(import.meta.url)("playwright");

const [base = "http://localhost:4321", path = "/about/", block = "experience"] =
  process.argv.slice(2);
const DISTANCE = 280;
const SLOW_SPEED = 200;
const RECORD_MS = 1800;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(new URL(path, base).href, { waitUntil: "load" });
await page.waitForFunction(() => window.__devMonitor, null, { timeout: 10000 });
const rail = page.locator(`[data-block="${block}"] [data-rail]`).first();
await rail.evaluate((r) =>
  window.scrollTo(0, r.getBoundingClientRect().top + window.scrollY - 100),
);
await page.waitForTimeout(800);
const box = await rail.boundingBox();
const x = box.x + 40;
const top = box.y + 20;
const now = () => page.evaluate(() => performance.now());

async function stroke(name, move) {
  await page.mouse.move(x, top);
  await page.waitForTimeout(1500);
  const start = await now();
  await move();
  const stop = await now();
  await page.waitForTimeout(RECORD_MS);
  const rows = await page.evaluate(
    (t0) => window.__devMonitor.trace.filter((r) => r.t >= t0),
    start,
  );
  report(name, rows, stop);
}

function report(name, rows, stop) {
  const target = rows.at(-1)?.targetY;
  const from = rows[0]?.markerY;
  console.log(`\n== ${name}`);
  if (target == null || from == null) {
    console.log("no rail samples: is this the dev server, and is the rail on the page?");
    return;
  }
  const t0 = rows[0].t;
  let next = 0;
  console.log("t(ms)  mouseY  target  marker  lag");
  for (const r of rows) {
    if (r.t - t0 < next) continue;
    next += 50;
    const lag = r.markerY == null || r.targetY == null ? "-" : r.markerY - r.targetY;
    const cells = [r.t - t0, r.mouseY, r.targetY, r.markerY].map((v) => String(v).padStart(6));
    console.log(`${cells.join("  ")}  ${lag}`);
  }
  const dir = Math.sign(target - from);
  const after = rows.filter((r) => r.t >= stop);
  const near = after.find((r) => Math.abs(r.markerY - target) <= 2);
  const peak = Math.max(0, ...rows.map((r) => (r.markerY - target) * dir));
  const lastOff = after.findLast((r) => Math.abs(r.markerY - target) > 2);
  const ms = (r) => Math.round(r.t - stop);
  console.log(
    `move ${from} -> ${target} (${Math.abs(target - from)} px), mouse stopped at ${Math.round(stop - t0)} ms`,
  );
  console.log(`catch-up  ${near ? ms(near) : "never"} ms after the stop`);
  console.log(`overshoot ${peak} px (${Math.round((peak / Math.abs(target - from)) * 100)}%)`);
  console.log(`settle    ${lastOff ? ms(lastOff) : 0} ms after the stop`);
}

await stroke("fast (flick)", () => page.mouse.move(x, top + DISTANCE, { steps: 3 }));
await stroke(`slow (${SLOW_SPEED} px/s)`, async () => {
  const steps = Math.round((DISTANCE / SLOW_SPEED) * 60);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, top + (DISTANCE * i) / steps);
    await page.waitForTimeout(1000 / 60);
  }
});
await browser.close();
