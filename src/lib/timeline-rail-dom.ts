import {
  CHECKPOINT_SPIN,
  RAIL_MOTION,
  atRest,
  bounceRatio,
  spinAtRest,
  stepRail,
  stepSpin,
} from "./rail-motion";
import { checkpointStates, markerOffset, type RailMode } from "./timeline-rail";

// Wires every server-rendered timeline rail in `root`. A frame loop moves the marker with
// the spring in rail-motion.ts. Checkpoints near the marker spin with its speed (stepSpin)
// and pop when they change state.
//
// Cost per frame: one layout read (the rail top), then compositor-only writes. The marker
// moves with translate3d and the line segments with scaleY, so no frame restyles the entries
// or runs layout. Checkpoint offsets are cached and measured again only on resize. Writes
// happen only when a value changes. The loop runs only while the rail is on screen and the
// marker or a checkpoint is moving.
// data-rail-target and data-rail-bounce expose the target and bounce ratio for the dev monitor.

/** Pointer idle this long (ms) counts as stopped. */
const STOP_MS = 80;
/** Half the marker size, so the marker centre sits on the rail position. */
const MARKER_HALF = 6.5;
const POP: Keyframe[] = [{ scale: 1 }, { scale: 1.45, offset: 0.4 }, { scale: 1 }];
const POP_TIMING = { duration: 260, easing: "cubic-bezier(0.3, 1.6, 0.5, 1)" };

export function installTimelineRails(root: ParentNode) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  for (const rail of root.querySelectorAll<HTMLElement>("[data-rail]")) installRail(rail, reduce);
}

function installRail(rail: HTMLElement, reduce: MediaQueryList | undefined) {
  const marker = rail.querySelector<HTMLElement>("[data-rail-marker]");
  const passed = rail.querySelector<HTMLElement>('[data-rail-line="passed"]');
  const upcoming = rail.querySelector<HTMLElement>('[data-rail-line="upcoming"]');
  const checkpoints = [...rail.querySelectorAll<HTMLElement>("[data-checkpoint]")];
  const spins = checkpoints.map(() => ({ angle: 0, spin: 0 }));
  const drawnAngles = checkpoints.map(() => 0);
  const body = { pos: 0, vel: 0 };
  let offsets: number[] = [];
  let height = 0;
  let drawnPos = Number.NaN;
  let mode: RailMode = "scroll";
  let pointerY = 0;
  let lastMove = { t: 0, y: 0 };
  let strokeSpeed = 0;
  let frame = 0;
  let last = 0;
  let visible = true;

  /** Checkpoint centres relative to the rail top; layout only changes on resize. */
  const measure = () => {
    const rect = rail.getBoundingClientRect();
    const top = rect.top;
    height = rect.height;
    offsets = checkpoints.map((cp) => {
      const r = cp.getBoundingClientRect();
      return r.top + r.height / 2 - top;
    });
  };

  /** Writes the marker and checkpoints; returns true while any checkpoint still spins. */
  const draw = (dt: number, animate: boolean) => {
    if (body.pos !== drawnPos) {
      drawnPos = body.pos;
      const ratio = height > 0 ? body.pos / height : 0;
      if (marker)
        marker.style.transform = `translate3d(0, ${(body.pos - MARKER_HALF).toFixed(1)}px, 0)`;
      if (passed) passed.style.transform = `scaleY(${ratio.toFixed(4)})`;
      if (upcoming) upcoming.style.transform = `scaleY(${(1 - ratio).toFixed(4)})`;
    }
    let spinning = false;
    checkpointStates(offsets, body.pos).forEach((state, i) => {
      const cp = checkpoints[i];
      if (cp.dataset.state !== state) {
        // A change after the first draw plays the stamp-like pop.
        if (animate && cp.dataset.state) cp.animate?.(POP, POP_TIMING);
        cp.dataset.state = state;
      }
      if (!animate) return;
      const s = spins[i];
      if (
        spinAtRest(s) &&
        Math.abs(offsets[i] - body.pos) >= CHECKPOINT_SPIN.near &&
        body.vel === 0
      )
        return;
      stepSpin(s, offsets[i], body, dt);
      if (spinAtRest(s)) Object.assign(s, { angle: Math.round(s.angle / 90) * 90, spin: 0 });
      else spinning = true;
      const angle = Math.round((s.angle % 360) * 10) / 10;
      if (angle !== drawnAngles[i]) {
        drawnAngles[i] = angle;
        cp.style.rotate = `${angle}deg`;
      }
    });
    return spinning;
  };

  const target = (top: number) =>
    markerOffset({ mode, pointerY, viewportHeight: window.innerHeight }, { top, height });

  const tick = (now: number) => {
    // The only layout read of the frame, before any write.
    const goal = target(rail.getBoundingClientRect().top);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const moving = mode === "pointer" && now - lastMove.t < STOP_MS;
    // Moving: chase with no overshoot. Stopped: bounce by the speed of the last stroke.
    const bounce = moving ? 0 : bounceRatio(strokeSpeed);
    const reduced = !!reduce?.matches;
    if (reduced) Object.assign(body, { pos: goal, vel: 0 });
    else stepRail(body, goal, height, dt, bounce, RAIL_MOTION);
    rail.dataset.railTarget = goal.toFixed(0);
    rail.dataset.railBounce = bounce.toFixed(2);
    const settled = atRest(body, goal) && !moving;
    if (settled) Object.assign(body, { pos: goal, vel: 0 });
    const spinning = draw(dt, !reduced);
    if ((settled && !spinning) || !visible) {
      strokeSpeed = 0;
      frame = 0;
    } else frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (frame || !visible) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  rail.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const t = event.timeStamp;
    const dt = t - lastMove.t;
    // Recent speed in px/s, smoothed, so a stroke that slows down before it stops bounces
    // little. A pause longer than STOP_MS starts a new stroke.
    const v = dt > 0 ? (Math.abs(event.clientY - lastMove.y) / dt) * 1000 : 0;
    strokeSpeed = dt > STOP_MS ? v : 0.5 * v + 0.5 * strokeSpeed;
    lastMove = { t, y: event.clientY };
    mode = "pointer";
    pointerY = event.clientY;
    wake();
  });
  rail.addEventListener("pointerleave", () => {
    mode = "scroll";
    wake();
  });
  window.addEventListener("scroll", wake, { passive: true });
  const remeasure = () => {
    measure();
    drawnPos = Number.NaN;
    wake();
  };
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(remeasure).observe(rail);
  else window.addEventListener("resize", remeasure);
  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    }).observe(rail);
  }

  // Place the marker at its first target with no motion.
  measure();
  body.pos = target(rail.getBoundingClientRect().top);
  draw(0, false);
  rail.dataset.railReady = "";
}
