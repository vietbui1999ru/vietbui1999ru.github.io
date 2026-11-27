import { RAIL_MOTION, atRest, bounceRatio, stepRail } from "./rail-motion";
import { checkpointStates, markerOffset, type RailMode } from "./timeline-rail";

// Wires every server-rendered timeline rail in `root`. A frame loop moves the marker with
// the spring in rail-motion.ts and writes its position to `--rail-y`; CSS draws the marker
// and the line from it. The loop runs only while the marker is moving.
// data-rail-target and data-rail-bounce expose the target and bounce ratio for the dev monitor.

/** Pointer idle this long (ms) counts as stopped. */
const STOP_MS = 80;

export function installTimelineRails(root: ParentNode) {
  for (const rail of root.querySelectorAll<HTMLElement>("[data-rail]")) installRail(rail);
}

function installRail(rail: HTMLElement) {
  const checkpoints = [...rail.querySelectorAll<HTMLElement>("[data-checkpoint]")];
  const body = { pos: 0, vel: 0 };
  let mode: RailMode = "scroll";
  let pointerY = 0;
  let lastMove = { t: 0, y: 0 };
  let strokeSpeed = 0;
  let frame = 0;
  let last = 0;

  const draw = (rect: DOMRect) => {
    rail.style.setProperty("--rail-y", `${body.pos.toFixed(1)}px`);
    const offsets = checkpoints.map((cp) => {
      const r = cp.getBoundingClientRect();
      return r.top + r.height / 2 - rect.top;
    });
    checkpointStates(offsets, body.pos).forEach((s, i) => (checkpoints[i].dataset.state = s));
  };

  const tick = (now: number) => {
    const rect = rail.getBoundingClientRect();
    const target = markerOffset({ mode, pointerY, viewportHeight: window.innerHeight }, rect);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const moving = mode === "pointer" && now - lastMove.t < STOP_MS;
    // Moving: chase with no overshoot. Stopped: bounce by the speed of the last stroke.
    const bounce = moving ? 0 : bounceRatio(strokeSpeed);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      Object.assign(body, { pos: target, vel: 0 });
    else stepRail(body, target, rect.height, dt, bounce, RAIL_MOTION);
    rail.dataset.railTarget = target.toFixed(0);
    rail.dataset.railBounce = bounce.toFixed(2);
    if (atRest(body, target) && !moving) {
      Object.assign(body, { pos: target, vel: 0 });
      strokeSpeed = 0;
      frame = 0;
    } else frame = requestAnimationFrame(tick);
    draw(rect);
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
