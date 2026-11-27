import { RAIL_MOTION, atRest, bounceRatio, stepRail } from "./rail-motion";
import { readingCheckpointStates, readingLine, readingMarkerOffset } from "./reading-rail";

// Drives the reading rail in the sidebar TOC with the spring in rail-motion.ts. The marker
// follows a reading line. In pointer mode (a mouse or pen over the page) the line is the
// document y under the pointer, so moving the pointer or scrolling moves the marker. In
// scroll mode it is readingLine (30% down the viewport, catching up at the scroll end).
// While the line moves, the marker chases with no overshoot. When it stops, the marker
// bounces by the speed of the last movement.
//
// Heading tops, checkpoint offsets and the content bottom are cached and measured again
// on resize. GardenToc installs the rail again when its entries change (variant-change).
// Each frame reads only scrollY and writes only transforms. The loop runs only while the
// rail is on screen and the marker moves.

/** Reading line idle this long (ms) counts as stopped. */
const STOP_MS = 80;
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
  let maxScroll = 0;
  let height = 0;
  let drawnPos = Number.NaN;
  let mode: "pointer" | "scroll" = "scroll";
  let pointerY = 0;
  let lastMove = { t: 0, y: 0 };
  let moveSpeed = 0;
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
    const content = document.querySelector('[data-ink-obstacle="content"]');
    // Look inside the content first, so a heading id repeated elsewhere on the page (such as
    // the old hidden variant storage, fixed in #47) never wins; a hidden copy measures as 0.
    const byId = new Map<string, Element>();
    for (const el of (content ?? document).querySelectorAll("[id]")) if (!byId.has(el.id)) byId.set(el.id, el);
    headingTops = checkpoints.map((cp) => {
      const slug = cp.dataset.slug ?? "";
      const heading = byId.get(slug) ?? document.getElementById(slug);
      return heading ? heading.getBoundingClientRect().top + y : 0;
    });
    contentBottom = content
      ? content.getBoundingClientRect().bottom + y
      : document.documentElement.scrollHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  };

  const line = () =>
    mode === "pointer"
      ? window.scrollY + pointerY
      : readingLine({ scrollY: window.scrollY, viewportHeight: window.innerHeight, maxScroll, contentBottom });
  const target = () =>
    readingMarkerOffset({ headingTops, checkpoints: offsets, readingLine: line(), railHeight: height });

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
    const moving = now - lastMove.t < STOP_MS;
    const bounce = moving ? 0 : bounceRatio(moveSpeed);
    const reduced = !!reduce?.matches;
    if (reduced) Object.assign(body, { pos: goal, vel: 0 });
    else stepRail(body, goal, height, dt, bounce, RAIL_MOTION);
    const settled = atRest(body, goal) && !moving;
    if (settled) Object.assign(body, { pos: goal, vel: 0 });
    draw(!reduced);
    if (settled || !visible) {
      moveSpeed = 0;
      frame = 0;
    } else frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (frame || !visible) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  // Speed of the reading line in px/s, smoothed, so a movement that slows down before it
  // stops bounces little. A pause longer than STOP_MS starts a new movement.
  const track = () => {
    const t = performance.now();
    const y = line();
    const dt = t - lastMove.t;
    const v = dt > 0 ? (Math.abs(y - lastMove.y) / dt) * 1000 : 0;
    moveSpeed = dt > STOP_MS ? v : 0.5 * v + 0.5 * moveSpeed;
    lastMove = { t, y };
    wake();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    mode = "pointer";
    pointerY = event.clientY;
    track();
  };
  const onPointerLeave = () => {
    mode = "scroll";
    track();
  };
  const remeasure = () => {
    measure();
    drawnPos = Number.NaN;
    wake();
  };

  window.addEventListener("scroll", track, { passive: true });
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
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
    window.removeEventListener("scroll", track);
    document.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    window.removeEventListener("resize", remeasure);
    resize?.disconnect();
    seen?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
}
