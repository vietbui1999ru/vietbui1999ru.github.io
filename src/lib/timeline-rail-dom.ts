import { RAIL_MOTION, atRest, bounceRatio, spinAtRest, stepRail, stepSpin } from "./rail-motion";
import { checkpointStates, markerOffset, type RailMode } from "./timeline-rail";

// Wires every server-rendered timeline rail in `root`. A frame loop moves the marker with
// the spring in rail-motion.ts and writes its position to `--rail-y`; CSS draws the marker
// and the line from it. Checkpoints near the marker spin with its speed (stepSpin) and pop
// when they change state. The loop runs only while the marker or a checkpoint is moving.
// data-rail-target and data-rail-bounce expose the target and bounce ratio for the dev monitor.

/** Pointer idle this long (ms) counts as stopped. */
const STOP_MS = 80;

export function installTimelineRails(root: ParentNode) {
  for (const rail of root.querySelectorAll<HTMLElement>("[data-rail]")) installRail(rail);
}

function installRail(rail: HTMLElement) {
  const checkpoints = [...rail.querySelectorAll<HTMLElement>("[data-checkpoint]")];
  const body = { pos: 0, vel: 0 };
  const spins = checkpoints.map(() => ({ angle: 0, spin: 0 }));
  let mode: RailMode = "scroll";
  let pointerY = 0;
  let lastMove = { t: 0, y: 0 };
  let strokeSpeed = 0;
  let frame = 0;
  let last = 0;

  /** Draws the marker and checkpoints; returns true while any checkpoint still spins. */
  const draw = (rect: DOMRect, dt = 0, reduced = true) => {
    rail.style.setProperty("--rail-y", `${body.pos.toFixed(1)}px`);
    const offsets = checkpoints.map((cp) => {
      const r = cp.getBoundingClientRect();
      return r.top + r.height / 2 - rect.top;
    });
    let spinning = false;
    checkpointStates(offsets, body.pos).forEach((state, i) => {
      const cp = checkpoints[i];
      // A state change after the first draw replays the pop animation (CSS, data-pop).
      if (!reduced && cp.dataset.state && cp.dataset.state !== state) {
        cp.removeAttribute("data-pop");
        void cp.offsetWidth;
        cp.dataset.pop = "";
      }
      cp.dataset.state = state;
      if (reduced) return;
      const s = stepSpin(spins[i], offsets[i], body, dt);
      if (spinAtRest(s)) Object.assign(s, { angle: Math.round(s.angle / 90) * 90, spin: 0 });
      else spinning = true;
      cp.style.rotate = `${(s.angle % 360).toFixed(1)}deg`;
    });
    return spinning;
  };

  const tick = (now: number) => {
    const rect = rail.getBoundingClientRect();
    const target = markerOffset({ mode, pointerY, viewportHeight: window.innerHeight }, rect);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const moving = mode === "pointer" && now - lastMove.t < STOP_MS;
    // Moving: chase with no overshoot. Stopped: bounce by the speed of the last stroke.
    const bounce = moving ? 0 : bounceRatio(strokeSpeed);
    const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) Object.assign(body, { pos: target, vel: 0 });
    else stepRail(body, target, rect.height, dt, bounce, RAIL_MOTION);
    rail.dataset.railTarget = target.toFixed(0);
    rail.dataset.railBounce = bounce.toFixed(2);
    const settled = atRest(body, target) && !moving;
    if (settled) Object.assign(body, { pos: target, vel: 0 });
    const spinning = draw(rect, dt, reduced);
    if (settled && !spinning) {
      strokeSpeed = 0;
      frame = 0;
    } else frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (frame) return;
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
  window.addEventListener("resize", wake);

  // Place the marker at its first target with no motion.
  const rect = rail.getBoundingClientRect();
  body.pos = markerOffset({ mode, pointerY, viewportHeight: window.innerHeight }, rect);
  draw(rect);
  rail.dataset.railReady = "";
}
