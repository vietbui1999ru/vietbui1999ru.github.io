// Navigation timing for the built site, as a reader on a phone would feel it.
//
// For each step, the script opens page A, waits until it is idle, hovers the link
// to page B for HOVER_MS (about the time a person takes before clicking), clicks,
// and times click -> DOM ready of B and click -> load of B. Headless Chromium
// records no paint timing, so DOM ready stands in for "the page can show". The
// network is slowed to a 4G phone, so prefetching can show its effect.
//
// Usage: node scripts/nav-bench.mjs <base-url> [runs]
//
// Playwright is not a repo dependency. To run it:
// 1. Install Playwright outside the repo: `npm install playwright` in a scratch folder.
// 2. Run `npx playwright install chromium-headless-shell` there.
// 3. Build the site, then serve the build folder.
// 4. Run this script with NODE_PATH set to the scratch folder's node_modules.
//
// Two things change the numbers a lot:
// - GitHub Pages redirects /path to /path/ (one round trip per click). Serve the
//   build without that redirect to see the site's own cost.
// - The KaTeX stylesheet comes from jsDelivr and blocks display until it loads.
//   A blocked or offline CDN adds its delay to every page.
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:4321";
const runs = Number(process.argv[3] ?? 5);
const HOVER_MS = 150;
const NETWORK = { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (2 * 1024 * 1024) / 8 };

// Each step: start page, the link to follow (CSS selector), and the expected path.
const STEPS = [
  ["/", 'nav.sticky a[href="/blog"]', "/blog"],
  ["/blog", 'main a[href^="/blog/"]', "/blog/"],
  ["/blog", 'nav.sticky a[href="/thoughts"]', "/thoughts"],
  ["/thoughts", 'nav.sticky a[href="/projects"]', "/projects"],
  ["/projects", 'nav.sticky a[href="/about"]', "/about"],
  ["/about", 'nav.sticky a[href="/"]', "/"],
];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

async function step(context, [from, selector, expected]) {
  // No page.route() here: request interception turns off the browser cache, and
  // with it prefetching, so every variant would measure the same.
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await page.goto(base + from, { waitUntil: "networkidle" });
  const link = page.locator(selector).first();
  await link.hover();
  await page.waitForTimeout(HOVER_MS);
  const clickedAt = Date.now();
  await link.click();
  const isTarget = (url) => url.pathname.startsWith(expected) && url.pathname !== from;
  await page.waitForURL(isTarget, { waitUntil: "domcontentloaded" });
  const readyMs = Date.now() - clickedAt;
  await page.waitForLoadState("load");
  const loadMs = Date.now() - clickedAt;
  // How long the HTML took to arrive, measured inside the new page (near 0 when prefetched).
  const responseMs = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return nav ? nav.responseEnd - nav.startTime : NaN;
  });
  await page.close();
  return { readyMs, loadMs, responseMs };
}

const browser = await chromium.launch();
console.log(`| step | click to DOM ready (ms) | click to load (ms) | HTML response (ms) |`);
console.log(`|---|---|---|---|`);
const totals = [];
for (const s of STEPS) {
  const results = [];
  for (let i = 0; i < runs; i += 1) {
    // A fresh context per run: an empty cache, like a first visit to that page.
    const context = await browser.newContext();
    results.push(await step(context, s));
    await context.close();
  }
  const ready = median(results.map((r) => r.readyMs));
  totals.push(ready);
  console.log(`| ${s[0]} -> ${s[2]} | ${ready.toFixed(0)} | ${median(results.map((r) => r.loadMs)).toFixed(0)} | ${median(results.map((r) => r.responseMs)).toFixed(0)} |`);
}
console.log(`\nmedian click to DOM ready over all steps: ${median(totals).toFixed(0)} ms (${runs} runs each)`);
await browser.close();
