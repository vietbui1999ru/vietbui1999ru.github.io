import { fireEvent, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import InkPanel from "@/components/patterns/InkPanel.svelte";
import {
  CONFIG_EVENT,
  FRAME_BUDGET_MS,
  RANGE_CONTROLS,
  RESTART_EVENT,
  STATS_EVENT,
} from "@/lib/ink-ambient/panel-controls";
import { DEFAULT_SIM_CONFIG } from "@/lib/ink-ambient/sim-config";

// Records every panel event, and opens the panel (jsdom has no matchMedia, so it starts collapsed).
async function setup() {
  const events: Array<{ type: string; detail: unknown }> = [];
  const record = (event: Event) => events.push({ type: event.type, detail: (event as CustomEvent).detail });
  window.addEventListener(CONFIG_EVENT, record);
  window.addEventListener(RESTART_EVENT, record);
  cleanups.push(() => {
    window.removeEventListener(CONFIG_EVENT, record);
    window.removeEventListener(RESTART_EVENT, record);
  });
  const user = userEvent.setup();
  render(InkPanel);
  await user.click(screen.getByRole("button", { name: /controls/ }));
  return { events, user };
}

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));

describe("controls", () => {
  it("renders every control with a label and its current value", async () => {
    await setup();
    for (const control of RANGE_CONTROLS) {
      const input = screen.getByLabelText(new RegExp(control.label.replace(/[()]/g, "\\$&"))) as HTMLInputElement;
      expect(input.type).toBe("range");
      expect(Number(input.value)).toBeCloseTo(DEFAULT_SIM_CONFIG[control.key] as number);
      expect(input.closest("div")!.querySelector("[data-value]")!.textContent).toBe(String(Number((DEFAULT_SIM_CONFIG[control.key] as number).toFixed(2))));
    }
    expect(screen.getByLabelText(/object cap/)).toBeTruthy();
    expect(screen.getByLabelText(/^seed$/)).toBeTruthy();
  });

  it("each control dispatches its key", async () => {
    const { events } = await setup();
    for (const control of RANGE_CONTROLS) {
      const input = screen.getByLabelText(new RegExp(control.label.replace(/[()]/g, "\\$&")));
      await fireEvent.input(input, { target: { value: String(control.max) } });
      expect(events.at(-1)).toEqual({ type: CONFIG_EVENT, detail: { [control.key]: control.max } });
    }
    await fireEvent.input(screen.getByLabelText(/object cap/), { target: { value: "40" } });
    expect(events.at(-1)).toEqual({ type: CONFIG_EVENT, detail: { objectCap: 40 } });
  });
});

describe("restart and reset", () => {
  it("restart dispatches the seed", async () => {
    const { events, user } = await setup();
    await fireEvent.input(screen.getByLabelText(/^seed$/), { target: { value: "1234" } });
    await user.click(screen.getByRole("button", { name: "restart" }));
    expect(events.at(-1)).toEqual({ type: RESTART_EVENT, detail: { seed: 1234 } });
  });

  it("reset to defaults restores every control and dispatches the defaults", async () => {
    const { events, user } = await setup();
    const speed = screen.getByLabelText(/pen speed/) as HTMLInputElement;
    await fireEvent.input(speed, { target: { value: "3" } });
    await user.click(screen.getByRole("button", { name: "reset to defaults" }));
    expect(events.at(-1)).toEqual({ type: CONFIG_EVENT, detail: { ...DEFAULT_SIM_CONFIG } });
    expect(Number((screen.getByLabelText(/pen speed/) as HTMLInputElement).value)).toBe(1);
  });
});

describe("unlimited", () => {
  it("sets objectCap to Infinity and disables the number field", async () => {
    const { events, user } = await setup();
    await user.click(screen.getByRole("checkbox", { name: /unlimited/ }));
    expect(events.at(-1)).toEqual({ type: CONFIG_EVENT, detail: { objectCap: Infinity } });
    expect((screen.getByLabelText(/object cap/) as HTMLInputElement).disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /unlimited/ }));
    expect(events.at(-1)).toEqual({ type: CONFIG_EVENT, detail: { objectCap: null } });
  });
});

describe("frame budget", () => {
  it("warns only above FRAME_BUDGET_MS", async () => {
    await setup();
    const status = screen.getByRole("status");
    await fireEvent(window, new CustomEvent(STATS_EVENT, { detail: { objects: 30, stepMs: FRAME_BUDGET_MS - 2 } }));
    expect(status.textContent).toContain("30 objects");
    expect(status.textContent).not.toContain("slow");
    await fireEvent(window, new CustomEvent(STATS_EVENT, { detail: { objects: 400, stepMs: FRAME_BUDGET_MS + 4 } }));
    expect(status.textContent).toContain("slow");
  });
});
