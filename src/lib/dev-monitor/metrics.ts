// Pure helpers for the dev monitor, free of DOM code.

export interface Sample {
  /** Time in milliseconds (performance.now()). */
  t: number;
  /** Position in pixels. */
  y: number;
}

/** Speed in px/s between the newest sample and the oldest sample inside `windowMs`. */
export function speed(samples: Sample[], windowMs = 100): number {
  const last = samples.at(-1);
  if (!last) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i].t <= windowMs; i--)
    first = samples[i];
  const dt = last.t - first.t;
  return dt > 0 ? Math.abs(last.y - first.y) / (dt / 1000) : 0;
}

/** Appends `item` and drops the oldest entries beyond `max`. */
export function pushCapped<T>(list: T[], item: T, max: number): T[] {
  list.push(item);
  if (list.length > max) list.splice(0, list.length - max);
  return list;
}

export type StatusClass = "ok" | "redirect" | "client" | "server" | "unknown";

/** Groups an HTTP status: 0 (unknown or opaque) and anything outside 200-599 is "unknown". */
export function statusClass(status: number): StatusClass {
  if (status >= 200 && status < 300) return "ok";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client";
  if (status >= 500 && status < 600) return "server";
  return "unknown";
}

/** Short label for an element: tag, id, first class, and up to 24 characters of text. */
export function describeElement(el: Element | null): string {
  if (!el) return "?";
  const id = el.id ? `#${el.id}` : "";
  const cls = el.classList[0] ? `.${el.classList[0]}` : "";
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
  return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
}
