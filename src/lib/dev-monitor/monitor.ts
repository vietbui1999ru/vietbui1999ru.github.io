import { describeElement, pushCapped, speed, statusClass, type Sample } from "./metrics";
import { createPanel, type Panel } from "./panel";

// Dev-only live monitor: mouse and timeline-rail motion, clicks, page timing, routes,
// network status and errors. BaseLayout loads it only under `astro dev`.
// Playwright reads window.__devMonitor: `trace` (one row per frame) and `events`.

export interface TraceRow {
  t: number;
  mouseY: number;
  /** Where the marker is heading (data-rail-target: the pointer or viewport centre), relative to the rail top. */
  targetY: number | null;
  /** Where the marker is drawn now, relative to the rail top. */
  markerY: number | null;
}
export interface MonitorEvent {
  t: number;
  kind: "click" | "route" | "net" | "error" | "load";
  text: string;
  level: "info" | "warn" | "error";
}
declare global {
  interface Window {
    __devMonitor?: { trace: TraceRow[]; events: MonitorEvent[] };
  }
}

export function installDevMonitor() {
  if (window.__devMonitor) return;
  const state = { trace: [] as TraceRow[], events: [] as MonitorEvent[] };
  window.__devMonitor = state;
  const panel = createPanel({
    pointer: [
      ["ptr", "position"],
      ["ptrSpeed", "speed"],
    ],
    rail: [
      ["railPos", "target"],
      ["railSpeed", "speed"],
      ["railLag", "lag"],
      ["railBounce", "bounce"],
    ],
    page: [["motion", "motion"]],
  });
  const add: Add = (kind, text, level = "info") => {
    const event = { t: Math.round(performance.now()), kind, text, level };
    pushCapped(state.events, event, 200);
    panel.log(event);
  };
  trackMotion(state.trace, panel);
  watchEvents(add, panel);
}

/** Each frame: pointer speed, and the rail under the pointer (or the first visible one). */
function trackMotion(trace: TraceRow[], panel: Panel) {
  const pointer: Sample[] = [];
  const marker: Sample[] = [];
  let pointerY = 0;
  let pointerType = "none";
  let maxLag = 0;
  addEventListener(
    "pointermove",
    (e) => {
      pointerY = e.clientY;
      pointerType = e.pointerType;
    },
    { passive: true },
  );

  const frame = () => {
    const t = performance.now();
    pushCapped(pointer, { t, y: pointerY }, 60);
    const rail = pickRail(pointerY);
    let targetY: number | null = null;
    let markerY: number | null = null;
    if (rail) {
      const top = rail.getBoundingClientRect().top;
      const m = rail.querySelector("[data-rail-marker]")?.getBoundingClientRect();
      targetY = rail.dataset.railTarget ? Number(rail.dataset.railTarget) : null;
      markerY = m && m.height ? Math.round(m.top + m.height / 2 - top) : null;
      if (markerY !== null) pushCapped(marker, { t, y: markerY }, 60);
    }
    pushCapped(trace, { t: Math.round(t), mouseY: Math.round(pointerY), targetY, markerY }, 3000);
    if (panel.open) {
      const lag = targetY !== null && markerY !== null ? markerY - targetY : null;
      if (lag !== null) maxLag = Math.max(maxLag, Math.abs(lag));
      panel.set("ptr", `y ${Math.round(pointerY)} (${pointerType})`);
      panel.set("ptrSpeed", `${Math.round(speed(pointer))} px/s`);
      if (!rail) panel.set("railPos", "no rail in view");
      else {
        const ready = rail.hasAttribute("data-rail-ready");
        panel.set(
          "railPos",
          `${targetY ?? "-"} \u2192 marker ${markerY ?? "hidden"}`,
          ready ? "info" : "warn",
        );
        panel.set("railSpeed", `${Math.round(speed(marker))} px/s`);
        panel.set("railLag", `${lag ?? "-"} px (max ${maxLag})`);
        panel.set("railBounce", rail.dataset.railBounce ?? "-");
      }
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.set("motion", reduced ? "REDUCED: spring off" : "full", reduced ? "warn" : "info");
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

type Add = (kind: MonitorEvent["kind"], text: string, level?: MonitorEvent["level"]) => void;
const LEVEL = {
  ok: "info",
  redirect: "warn",
  client: "error",
  server: "error",
  unknown: "info",
} as const;

const DEV_INTERNAL = /^\/(node_modules|@id|@vite|@fs|src)\/|[?&](v|astro|lang)=/;

function watchEvents(add: Add, panel: Panel) {
  document.addEventListener(
    "click",
    (e) => add("click", describeElement(e.target as Element)),
    true,
  );

  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (nav) {
    const status =
      (nav as PerformanceNavigationTiming & { responseStatus?: number }).responseStatus ?? 0;
    add(
      "load",
      `${status || "?"} ${location.pathname} ttfb ${Math.round(nav.responseStart)}ms`,
      LEVEL[statusClass(status)],
    );
    addEventListener("DOMContentLoaded", () =>
      add("load", `dom ready ${Math.round(performance.now())}ms`),
    );
    addEventListener("load", () => add("load", `load ${Math.round(performance.now())}ms`));
  }

  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      add("route", `${method} ${location.pathname}`);
    };
  }
  addEventListener("popstate", () => add("route", `popstate ${location.pathname}`));

  // Resource timing gives status for every request, prefetches included (Chromium 109+).
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceResourceTiming & {
      responseStatus?: number;
    })[]) {
      panel.countRequest();
      const status = entry.responseStatus ?? 0;
      const name = entry.name.replace(location.origin, "");
      const cls = statusClass(status);
      // Dev-server modules (Vite, the Astro toolbar) are noise unless they fail.
      if (cls === "ok" && DEV_INTERNAL.test(name)) continue;
      if (cls === "ok" && entry.duration < 300 && entry.initiatorType !== "link") continue;
      add(
        "net",
        `${status || "?"} ${entry.initiatorType} ${name} ${Math.round(entry.duration)}ms`,
        LEVEL[cls],
      );
    }
  }).observe({ type: "resource", buffered: true });

  addEventListener(
    "error",
    (e) => {
      const target = e.target as HTMLElement & { src?: string; href?: string };
      if (target && target !== (window as unknown)) {
        add(
          "error",
          `failed to load ${target.tagName?.toLowerCase()} ${target.src ?? target.href ?? ""}`,
          "error",
        );
      } else
        add(
          "error",
          `${e.message} at ${e.filename?.replace(location.origin, "")}:${e.lineno}`,
          "error",
        );
    },
    true,
  );
  addEventListener("unhandledrejection", (e) =>
    add("error", `unhandled rejection: ${String(e.reason)}`, "error"),
  );
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    consoleError(...args);
    add("error", `console.error ${args.map(String).join(" ").slice(0, 200)}`, "error");
  };
}

function pickRail(pointerY: number): HTMLElement | null {
  let visible: HTMLElement | null = null;
  for (const rail of document.querySelectorAll<HTMLElement>("[data-rail]")) {
    const r = rail.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    if (pointerY >= r.top && pointerY <= r.bottom) return rail;
    visible ??= rail;
  }
  return visible;
}
