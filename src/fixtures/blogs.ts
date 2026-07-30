export interface UiLabBlogFixture {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  readingTime: number;
}

export const UI_LAB_BLOGS: UiLabBlogFixture[] = [
  {
    slug: "designing-simulations",
    title: "Designing Interactive Simulations",
    description:
      "A normal-length article fixture for archive rows and filter controls.",
    date: new Date("2026-02-14T00:00:00Z"),
    tags: ["simulation", "design"],
    readingTime: 8,
  },
  {
    slug: "long-form-note",
    title: "A Long Form Note With a Title That Tests Archive Wrapping",
    description:
      "A deliberately long description used to test dense and comfortable blog listing modes.",
    date: new Date("2025-09-01T00:00:00Z"),
    tags: ["writing", "astro"],
    readingTime: 21,
  },
  {
    slug: "tiny-note",
    title: "Tiny Note",
    description: "Short.",
    date: new Date("2024-01-10T00:00:00Z"),
    tags: ["notes"],
    readingTime: 2,
  },
];
