import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyStoredPreferences, onPageLoad } from "@/lib/page-lifecycle";

const pageLoad = () => document.dispatchEvent(new Event("astro:page-load"));
const beforeSwap = () => document.dispatchEvent(new Event("astro:before-swap"));

describe("onPageLoad", () => {
  it("installs on each page load and cleans up before the next swap", () => {
    const cleanup = vi.fn();
    const install = vi.fn(() => cleanup);
    const stop = onPageLoad(install);
    pageLoad();
    expect(install).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
    beforeSwap();
    expect(cleanup).toHaveBeenCalledTimes(1);
    pageLoad();
    expect(install).toHaveBeenCalledTimes(2);
    stop();
  });

  it("runs each cleanup once, even with two swaps in a row", () => {
    const cleanup = vi.fn();
    const stop = onPageLoad(() => cleanup);
    pageLoad();
    beforeSwap();
    beforeSwap();
    expect(cleanup).toHaveBeenCalledTimes(1);
    stop();
  });

  it("accepts an install that returns nothing", () => {
    const install = vi.fn();
    const stop = onPageLoad(install);
    pageLoad();
    expect(() => beforeSwap()).not.toThrow();
    expect(install).toHaveBeenCalledTimes(1);
    stop();
  });

  it("stop removes the listeners and runs the pending cleanup", () => {
    const cleanup = vi.fn();
    const install = vi.fn(() => cleanup);
    const stop = onPageLoad(install);
    pageLoad();
    stop();
    expect(cleanup).toHaveBeenCalledTimes(1);
    pageLoad();
    expect(install).toHaveBeenCalledTimes(1);
  });
});

describe("theme", () => {
  const root = document.documentElement;
  beforeEach(() => {
    // localStorage is not defined in this test environment (sessionStorage is), so use a
    // small in-memory store with the same calls.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      clear: () => store.clear(),
    });
    root.className = "";
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    root.className = "";
  });

  it("applies the stored dark theme and the ink-off preference", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("ink-ambient", "off");
    applyStoredPreferences(root);
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("ink-ambient-disabled")).toBe(true);
  });

  it("removes both classes for a light theme with ink on", () => {
    root.classList.add("dark", "ink-ambient-disabled");
    localStorage.setItem("theme", "light");
    applyStoredPreferences(root);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.classList.contains("ink-ambient-disabled")).toBe(false);
  });

  it("follows the system preference when no theme is stored", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("dark") }));
    applyStoredPreferences(root);
    expect(root.classList.contains("dark")).toBe(true);
  });
});
