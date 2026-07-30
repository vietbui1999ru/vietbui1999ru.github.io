import type { ProjectCardData } from "../data/projectData";

/** Stable, hand-authored data for visual and interaction review in the UI lab. */
export const UI_LAB_PROJECT: ProjectCardData = {
  slug: "ui-lab-fixture",
  title: "Paper UI Lab",
  summary:
    "A deterministic project record for checking cards, badges, links, and responsive layout states.",
  date: new Date("2026-01-15T00:00:00Z"),
  featured: true,
  badges: ["Svelte", "Astro", "Design systems"],
  status: "active",
  links: [
    { icon: "github", url: "#projects" },
    { icon: "globe", url: "#home" },
  ],
  bodyHtml: "",
};
