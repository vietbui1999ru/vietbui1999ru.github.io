import type { ProjectCardData } from "../data/projectData";
import { UI_LAB_PROJECT } from "./uiLab";

/** Project fixtures intentionally cover dense, sparse, and long-content states. */
export const UI_LAB_PROJECTS: ProjectCardData[] = [
  UI_LAB_PROJECT,
  {
    ...UI_LAB_PROJECT,
    slug: "magnetic-field",
    title: "Magnetic Field Observatory",
    summary:
      "A long summary fixture for checking card clamping, table cells, and narrow containers.",
    date: new Date("2025-11-02T00:00:00Z"),
    featured: false,
    badges: ["React", "Three.js", "Simulation", "WebGL"],
    status: "shipped",
    links: [{ icon: "github", url: "#projects" }],
  },
  {
    ...UI_LAB_PROJECT,
    slug: "vault-pipeline",
    title: "Obsidian Vault Content Pipeline",
    summary:
      "A no-media project for testing cards when the visual hierarchy must survive without a cover image.",
    date: new Date("2025-08-19T00:00:00Z"),
    featured: false,
    badges: ["Astro", "Markdown", "CMS"],
    status: "active",
    links: [],
  },
  {
    ...UI_LAB_PROJECT,
    slug: "short-title",
    title: "Ink",
    summary: "Short content.",
    date: new Date("2024-12-03T00:00:00Z"),
    featured: false,
    badges: ["CSS"],
    status: "archived",
  },
  {
    ...UI_LAB_PROJECT,
    slug: "tag-heavy",
    title: "Tag-Heavy Fixture With a Deliberately Long Project Title",
    summary:
      "A record with many tags to test wrapping, alignment, and content overflow in every collection view.",
    date: new Date("2024-03-12T00:00:00Z"),
    featured: false,
    badges: [
      "TypeScript",
      "Svelte",
      "Astro",
      "Testing",
      "Accessibility",
      "Design systems",
    ],
    status: "shipped",
  },
  {
    ...UI_LAB_PROJECT,
    slug: "empty-links",
    title: "Empty Links Case",
    summary: "A project with no links and a missing optional media field.",
    date: new Date("2023-06-10T00:00:00Z"),
    featured: false,
    badges: [],
    status: "archived",
    links: [],
  },
];
