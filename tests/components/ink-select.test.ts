import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InkSelect from "@/components/primitives/InkSelect.svelte";

const options = [
  { value: "featured", label: "featured" },
  { value: "newest", label: "newest" },
  { value: "title", label: "title" },
  { value: "status", label: "status" },
];

function setup(value = "newest") {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(InkSelect, { props: { options, value, label: "sort", onChange } });
  const button = screen.getByRole("button", { name: /sort/ });
  const active = () => {
    const id = screen.getByRole("listbox").getAttribute("aria-activedescendant");
    return id ? document.getElementById(id)?.textContent?.trim() : undefined;
  };
  return { onChange, user, button, active };
}

describe("aria", () => {
  it("exposes a collapsed listbox button labelled by the label", () => {
    const { button } = setup();
    expect(button.getAttribute("aria-haspopup")).toBe("listbox");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.textContent).toContain("newest");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("renders a labelled listbox of options with the value selected", async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const listbox = screen.getByRole("listbox", { name: "sort" });
    expect(listbox).toBeTruthy();
    const items = screen.getAllByRole("option");
    expect(items).toHaveLength(4);
    const selected = items.filter((o) => o.getAttribute("aria-selected") === "true");
    expect(selected.map((o) => o.textContent?.trim())).toEqual(["newest"]);
  });
});

describe("open", () => {
  it("opens on click with the current value active", async () => {
    const { user, button, active } = setup();
    await user.click(button);
    expect(active()).toBe("newest");
  });

  it.each(["{Enter}", " ", "{ArrowDown}"])("opens from the focused button on %s", async (key) => {
    const { user, button, active } = setup("title");
    button.focus();
    await user.keyboard(key);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(active()).toBe("title");
  });
});

describe("keyboard", () => {
  it("moves the active option with arrows, Home and End", async () => {
    const { user, button, active } = setup();
    await user.click(button);
    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("title");
    await user.keyboard("{End}");
    expect(active()).toBe("status");
    await user.keyboard("{ArrowDown}");
    expect(active()).toBe("status");
    await user.keyboard("{Home}");
    expect(active()).toBe("featured");
    await user.keyboard("{ArrowUp}");
    expect(active()).toBe("featured");
  });

  it("moves the active option by type-ahead", async () => {
    const { user, button, active } = setup("featured");
    await user.click(button);
    await user.keyboard("st");
    expect(active()).toBe("status");
  });
});

describe("select", () => {
  it.each(["{Enter}", " "])("selects the active option with %s and returns focus", async (key) => {
    const { onChange, user, button } = setup();
    await user.click(button);
    await user.keyboard("{ArrowDown}");
    await user.keyboard(key);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("title");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("selects an option on click", async () => {
    const { onChange, user, button } = setup();
    await user.click(button);
    await user.click(screen.getByRole("option", { name: "status" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("status");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});

describe("close", () => {
  it("closes on Escape and returns focus without a change", async () => {
    const { onChange, user, button } = setup();
    await user.click(button);
    await user.keyboard("{ArrowDown}{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on Tab without a change", async () => {
    const { onChange, user, button } = setup();
    await user.click(button);
    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on a pointer press outside without a change", async () => {
    const { onChange, user, button } = setup();
    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
