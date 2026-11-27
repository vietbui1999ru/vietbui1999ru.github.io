import { RAIL_MOTION, atRest, bounceRatio, stepRail } from "./rail-motion";
import { readingCheckpointStates, readingMarkerOffset } from "./reading-rail";

// Drives the reading rail in the sidebar TOC. The marker follows the scroll position with
// the spring in rail-motion.ts. While the page scrolls, it chases with no overshoot. When
// the scroll stops, it bounces by the speed of the last scroll.
//
// Heading tops, checkpoint offsets and the content bottom are cached and measured again
// on resize. GardenToc installs the rail again when its entries change (variant-change). Each frame reads only scrollY and writes only
// transforms. The loop runs only while the rail is on screen and the marker moves.

/** Scroll idle this long (ms) counts as stopped. */
const STOP_MS = 80;
/** The reading line sits this far down the viewport. */
const READING_LINE = 0.3;
/** Half the marker size, so the marker centre sits on the rail position. */
const MARKER_HALF = 6.5;
const POP: Keyframe[] = [{ scale: 1 }, { scale: 1.45, offset: 0.4 }, { scale: 1 }];
const POP_TIMING = { duration: 260, easing: "cubic-bezier(0.3, 1.6, 0.5, 1)" };

/** Wires the rail inside `nav`. Returns a function that removes every listener. */
export function installReadingRail(nav: HTMLElement): () => void {
  const rail = nav.querySelector<HTMLElement>("[data-reading-rail]");
  if (!rail) return () => {};
  const marker = rail.querySelector<HTMLElement>("[data-rail-marker]");
  const passed = rail.querySelector<HTMLElement>('[data-rail-line="passed"]');
  const upcoming = rail.querySelector<HTMLElement>('[data-rail-line="upcoming"]');
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const body = { pos: 0, vel: 0 };
  let checkpoints: HTMLElement[] = [];
  let offsets: number[] = [];
  let headingTops: number[] = [];
  let contentBottom = 0;
  let height = 0;
  let drawnPos = Number.NaN;
  let lastScroll = { t: 0, y: 0 };
  let scrollSpeed = 0;
  let frame = 0;
  let last = 0;
  let visible = true;

  const measure = () => {
    checkpoints = [...rail.querySelectorAll<HTMLElement>("[data-checkpoint]")];
    const top = rail.getBoundingClientRect().top;
    height = rail.getBoundingClientRect().height;
    offsets = checkpoints.map((cp) => {
      const r = cp.getBoundingClientRect();
      return r.top + r.height / 2 - top;
    });
    const y = window.scrollY;
    headingTops = checkpoints.map((cp) => {
      const heading = document.getElementById(cp.dataset.slug ?? "");
      return heading ? heading.getBoundingClientRect().top + y : 0;
    });
    const content = document.querySelector('[data-ink-obstacle="content"]');
    contentBottom = content
      ? content.getBoundingClientRect().bottom + y
      : document.documentElement.scrollHeight;
  };

  const target = () =>
    readingMarkerOffset({
      headingTops,
      checkpoints: offsets,
      readingLine: window.scrollY + window.innerHeight * READING_LINE,
      contentBottom,
      railHeight: height,
    });

  const draw = (animate: boolean) => {
    if (body.pos !== drawnPos) {
      drawnPos = body.pos;
      const ratio = height > 0 ? body.pos / height : 0;
      if (marker) marker.style.transform = `translate3d(0, ${(body.pos - MARKER_HALF).toFixed(1)}px, 0)`;
      if (passed) passed.style.transform = `scaleY(${ratio.toFixed(4)})`;
      if (upcoming) upcoming.style.transform = `scaleY(${(1 - ratio).toFixed(4)})`;
    }
    readingCheckpointStates(offsets, body.pos).forEach((state, i) => {
      const cp = checkpoints[i];
      if (cp.dataset.state === state) return;
      if (animate && cp.dataset.state) cp.animate?.(POP, POP_TIMING);
      cp.dataset.state = state;
    });
  };

  const tick = (now: number) => {
    const goal = target();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const moving = now - lastScroll.t < STOP_MS;
    const bounce = moving ? 0 : bounceRatio(scrollSpeed);
    const reduced = !!reduce?.matches;
    if (reduced) Object.assign(body, { pos: goal, vel: 0 });
    else stepRail(body, goal, height, dt, bounce, RAIL_MOTION);
    const settled = atRest(body, goal) && !moving;
    if (settled) Object.assign(body, { pos: goal, vel: 0 });
    draw(!reduced);
    if (settled || !visible) {
      scrollSpeed = 0;
      frame = 0;
    } else frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (frame || !visible) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    const t = performance.now();
    const y = window.scrollY;
    const dt = t - lastScroll.t;
    const v = dt > 0 ? (Math.abs(y - lastScroll.y) / dt) * 1000 : 0;
    scrollSpeed = dt > STOP_MS ? v : 0.5 * v + 0.5 * scrollSpeed;
    lastScroll = { t, y };
    wake();
  };
  const remeasure = () => {
    measure();
    drawnPos = Number.NaN;
    wake();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(remeasure) : null;
  const content = document.querySelector('[data-ink-obstacle="content"]');
  if (resize) {
    resize.observe(rail);
    if (content) resize.observe(content);
  } else window.addEventListener("resize", remeasure);
  const seen =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          wake();
        })
      : null;
  seen?.observe(rail);

  // Place the marker at its first target with no motion.
  measure();
  body.pos = target();
  draw(false);
  rail.dataset.railReady = "";

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", remeasure);
    resize?.disconnect();
    seen?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
}
