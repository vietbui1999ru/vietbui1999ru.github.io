import { render, screen } from "@testing-library/svelte";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import Button from "@/components/primitives/Button.svelte";

describe("Button primitive", () => {
  it("renders a semantic button with the requested variant and size", () => {
    render(Button, { props: { variant: "outline", size: "lg" } });
    const button = screen.getByRole("button");

    expect(button.classList.contains("bg-paper-raised")).toBe(true);
    expect(button.classList.contains("min-h-12")).toBe(true);
  });

  it("exposes disabled state to assistive technology and interaction code", () => {
    render(Button, { props: { disabled: true } });
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("has no axe violations in isolation", async () => {
    const { container } = render(Button, {
      props: { "aria-label": "Continue" },
    });
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
