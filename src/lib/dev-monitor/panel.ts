// Panel UI for the dev monitor: a header with counters, labelled rows per section, and an
// event log. It fits phones: full width minus a gutter, above the mobile nav, collapsed at start.

export type Tone = "info" | "warn" | "error";
export interface LogRow {
  t: number;
  kind: string;
  text: string;
  level: Tone;
}
export interface Panel {
  set(key: string, value: string, tone?: Tone): void;
  log(row: LogRow): void;
  /** Counts one network request in the header, logged or not. */
  countRequest(): void;
  readonly open: boolean;
}

const CSS = `
.dm{position:fixed;right:8px;bottom:8px;z-index:2147483647;width:min(360px,calc(100vw - 16px));
max-height:min(70vh,560px);display:flex;flex-direction:column;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
color:#e8e8e8;background:#141414;border:1px solid #444;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.dm button{all:unset;cursor:pointer;min-width:32px;min-height:28px;display:inline-grid;place-items:center}
.dm-head{display:flex;align-items:center;gap:8px;padding:2px 4px 2px 10px;border-bottom:1px solid #333}
.dm-title{font-weight:700;flex:1}
.dm-badge{padding:0 6px;border-radius:9px;background:#333;font-variant-numeric:tabular-nums}
.dm-badge[data-tone=error]{background:#7f1d1d;color:#fecaca}
.dm-body{overflow:auto;padding:6px 10px}
.dm-sec{margin:0 0 6px}
.dm-sec>h4{margin:0 0 2px;font:inherit;color:#8a8a8a;text-transform:lowercase}
.dm-row{display:grid;grid-template-columns:9ch 1fr;gap:6px}
.dm-row>span:first-child{color:#9a9a9a}
.dm-row>span:last-child{font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.dm [data-tone=warn]{color:#fcd34d}.dm [data-tone=error]{color:#fca5a5}
.dm-log{border-top:1px solid #333;padding-top:4px}
.dm-ev{display:grid;grid-template-columns:6ch 6ch 1fr;gap:6px;padding:1px 0}
.dm-ev>time{color:#777}
.dm-ev>b{font-weight:400;color:#93c5fd}
.dm-ev>span{overflow-wrap:anywhere}
.dm[data-closed] .dm-body{display:none}
@media (max-width:767px){.dm{bottom:calc(84px + env(safe-area-inset-bottom));font-size:12px}}
`;

export function createPanel(sections: Record<string, [key: string, label: string][]>): Panel {
  const style = document.createElement("style");
  style.textContent = CSS;
  const root = el("div", "dm");
  root.dataset.devMonitor = "";
  const head = el("div", "dm-head");
  const errors = el("span", "dm-badge");
  const requests = el("span", "dm-badge");
  const toggle = el("button");
  toggle.setAttribute("aria-label", "toggle dev monitor");
  head.append(el("span", "dm-title", "dev monitor"), requests, errors, toggle);
  const body = el("div", "dm-body");
  const values = new Map<string, HTMLElement>();
  for (const [name, rows] of Object.entries(sections)) {
    const sec = el("div", "dm-sec");
    sec.append(el("h4", "", name));
    for (const [key, label] of rows) {
      const value = el("span", "", "-");
      values.set(key, value);
      const row = el("div", "dm-row");
      row.append(el("span", "", label), value);
      sec.append(row);
    }
    body.append(sec);
  }
  const log = el("div", "dm-log");
  body.append(log);
  root.append(head, body);
  document.head.append(style);
  document.body.append(root);

  let errorCount = 0;
  let requestCount = 0;
  const counters = () => {
    errors.textContent = `${errorCount} err`;
    errors.dataset.tone = errorCount ? "error" : "info";
    requests.textContent = `${requestCount} req`;
  };
  const setOpen = (open: boolean) => {
    root.toggleAttribute("data-closed", !open);
    toggle.textContent = open ? "−" : "+";
  };
  setOpen(!matchMedia("(max-width: 767px)").matches);
  counters();
  toggle.addEventListener("click", () => setOpen(root.hasAttribute("data-closed")));
  addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyM") setOpen(root.hasAttribute("data-closed"));
  });

  return {
    get open() {
      return !root.hasAttribute("data-closed");
    },
    set(key, value, tone = "info") {
      const target = values.get(key);
      if (!target || target.textContent === value) return;
      target.textContent = value;
      target.dataset.tone = tone;
    },
    countRequest() {
      requestCount++;
      counters();
    },
    log(row) {
      if (row.level === "error") errorCount++;
      counters();
      const ev = el("div", "dm-ev");
      ev.dataset.tone = row.level;
      ev.append(
        el("time", "", `${(row.t / 1000).toFixed(1)}s`),
        el("b", "", row.kind),
        el("span", "", row.text),
      );
      log.prepend(ev);
      while (log.childElementCount > 60) log.lastElementChild!.remove();
    },
  };
}

function el(tag: string, cls = "", text = ""): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}
