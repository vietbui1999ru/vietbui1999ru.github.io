import { render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaperNav from "@/components/svelte/PaperNav.svelte";
import { resetSpawnState, setSpawnState } from "@/lib/ink-ambient/spawn-state";

let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced }));
});
afterEach(() => {
  resetSpawnState();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Each button has its own note (a polite live region) right after it.
const noteOf = (button: HTMLElement) => button.parentElement!.querySelector<HTMLElement>('[role="status"]')!;

const fullPens ={ predator: { count: 6, full: true }, prey: { count: 1, full: false } };

function setup() {
  render(PaperNav, { props: { pathname: "/" } });
  const spawned: string[] = [];
  const record = (e: Event) => spawned.push(e.type);
  window.addEventListener("ink-ambient-add-predator", record);
  window.addEventListener("ink-ambient-add-prey", record);
  return {
    spawned,
    pen: () => screen.getByRole("button", { name: /predator|pen limit/i }),
    pencil: () => screen.getByRole("button", { name: /prey|pencil limit/i }),
    stop: () => {
      window.removeEventListener("ink-ambient-add-predator", record);
      window.removeEventListener("ink-ambient-add-prey", record);
    },
  };
}

describe("pen and pencil buttons at the manual cap", () => {
  it("spawn normally under the cap", () => {
    const { spawned, pen, stop } = setup();
    expect(pen().getAttribute("aria-label")).toBe("Add a predator");
    expect(pen().getAttribute("aria-disabled")).toBeNull();
    pen().click();
    expect(spawned).toEqual(["ink-ambient-add-predator"]);
    stop();
  });

  it("look disabled at the cap, spawn nothing, shake and show a short note", () => {
    const { spawned, pen, pencil, stop } = setup();
    setSpawnState(fullPens);
    flushSync();
    expect(pen().getAttribute("aria-disabled")).toBe("true");
    expect(pen().getAttribute("aria-label")).toBe("Pen limit reached");
    expect(pencil().getAttribute("aria-disabled")).toBeNull();
    pen().click();
    flushSync();
    expect(spawned).toEqual([]);
    expect(pen().dataset.shake).toBe("");
    expect(noteOf(pen()).textContent).toContain("Pen limit reached");
    vi.advanceTimersByTime(1600);
    flushSync();
    expect(noteOf(pen()).textContent?.trim()).toBe("");
    expect(pen().dataset.shake).toBeUndefined();
    stop();
  });

  it("become active again when a hand-added object dies", () => {
    const { spawned, pen, stop } = setup();
    setSpawnState(fullPens);
    setSpawnState({ ...fullPens, predator: { count: 5, full: false } });
    flushSync();
    expect(pen().getAttribute("aria-disabled")).toBeNull();
    pen().click();
    expect(spawned).toEqual(["ink-ambient-add-predator"]);
    stop();
  });

  it("show the pencil note for the pencil button", () => {
    const { pencil, stop } = setup();
    setSpawnState({ predator: { count: 0, full: false }, prey: { count: 6, full: true } });
    flushSync();
    pencil().click();
    flushSync();
    expect(noteOf(pencil()).textContent).toContain("Pencil limit reached");
    stop();
  });

  it("do not shake under reduced motion", () => {
    reduced = true;
    const { pen, stop } = setup();
    setSpawnState(fullPens);
    flushSync();
    pen().click();
    flushSync();
    expect(pen().dataset.shake).toBeUndefined();
    expect(noteOf(pen()).textContent).toContain("Pen limit reached");
    stop();
  });
});
