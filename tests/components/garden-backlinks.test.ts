import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import GardenBacklinks from "@/components/garden/GardenBacklinks.svelte";

afterEach(() => {
  cleanup();
});

describe("GardenBacklinks", () => {
  it("renders nothing when no published page links here", () => {
    const { container } = render(GardenBacklinks, { props: { backlinks: [] } });
    expect(container.querySelector('[data-block="backlinks"]')).toBeNull();
    expect(screen.queryByText("linked from")).toBeNull();
  });

  it("lists each linking page under a 'linked from' heading", () => {
    render(GardenBacklinks, {
      props: {
        backlinks: [
          { url: "/blog/one", title: "First linking note" },
          { url: "/thoughts#two", title: "Second linking note" },
        ],
      },
    });
    expect(screen.getByText("linked from")).toBeTruthy();
    expect(screen.getByRole("link", { name: "First linking note" }).getAttribute("href")).toBe(
      "/blog/one",
    );
    expect(screen.getByRole("link", { name: "Second linking note" }).getAttribute("href")).toBe(
      "/thoughts#two",
    );
  });
});
