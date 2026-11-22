import { render, screen } from "@testing-library/svelte";
import axe from "axe-core";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Button from "@/components/primitives/Button.svelte";
import Chip from "@/components/primitives/Chip.svelte";
import InkLink from "@/components/primitives/InkLink.svelte";
import PageHeader from "@/components/primitives/PageHeader.svelte";
import Section from "@/components/primitives/Section.svelte";
import SectionHeader from "@/components/primitives/SectionHeader.svelte";
import { PASTELS, toneFor } from "@/design-system/tone";

const text = (value: string) =>
  createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe("Chip", () => {
  it("renders a span without href", () => {
    render(Chip, { props: { children: text("svelte") } });
    expect(screen.getByText("svelte").parentElement?.tagName).toBe("SPAN");
  });

  it("renders an external link in a new tab with an arrow", () => {
    render(Chip, {
      props: { href: "https://example.com", children: text("docs") },
    });
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.textContent).toContain("↗");
  });

  it("applies pastel tone and caps", () => {
    render(Chip, { props: { tone: "butter", caps: true, children: text("gpa") } });
    const chip = screen.getByText("gpa").parentElement!;
    expect(chip.classList.contains("bg-pastel-butter")).toBe(true);
    expect(chip.classList.contains("uppercase")).toBe(true);
  });
});

describe("InkLink", () => {
  it("treats http links as external", () => {
    render(InkLink, { props: { href: "https://github.com", children: text("github") } });
    const link = screen.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.textContent).toContain("↗");
  });

  it("keeps mailto and internal links in the same tab", () => {
    render(InkLink, { props: { href: "mailto:a@b.c", children: text("email") } });
    expect(screen.getByRole("link").hasAttribute("target")).toBe(false);
  });

  it("renders back and forward arrows", () => {
    render(InkLink, { props: { href: "/blog", arrow: "back", children: text("blog") } });
    expect(screen.getByRole("link").textContent?.startsWith("←")).toBe(true);
  });
});

describe("Section", () => {
  it("emits the InkAmbient sentinel and forwards attributes", () => {
    const { container } = render(Section, {
      props: { id: "blog", "data-ink-obstacle": "content", children: text("body") },
    });
    const section = container.querySelector("section#blog")!;
    expect(section.getAttribute("data-ink-obstacle")).toBe("content");
    expect(section.querySelector('[data-section-id="blog"]')).not.toBeNull();
  });

  it("omits the sentinel when disabled", () => {
    const { container } = render(Section, {
      props: { id: "about", sentinel: false, children: text("body") },
    });
    expect(container.querySelector("[data-section-id]")).toBeNull();
  });
});

describe("SectionHeader", () => {
  it("renders the requested heading level and optional parts", () => {
    render(SectionHeader, { props: { title: "projects", as: "h1", index: "04", kicker: "selected work" } });
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("projects");
    expect(screen.getByText("04")).toBeTruthy();
    expect(screen.getByText("selected work")).toBeTruthy();
  });
});

describe("PageHeader", () => {
  it("renders an h1, description and back link without axe violations", async () => {
    const { container } = render(PageHeader, {
      props: { title: "about", description: "tagline", back: { href: "/", label: "home" } },
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("about");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/");
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});

describe("Button as link", () => {
  it("renders an anchor with the raised CTA styles", () => {
    render(Button, { props: { href: "/blog", variant: "raised", children: text("all posts") } });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/blog");
    expect(link.classList.contains("shadow-hard")).toBe(true);
    expect(link.classList.contains("lift")).toBe(true);
  });
});

describe("toneFor", () => {
  it("is stable and case-insensitive", () => {
    expect(toneFor("Languages")).toBe(toneFor("languages "));
    expect(PASTELS).toContain(toneFor("anything"));
  });
});
