import type { ProjectCardData } from "@/data/projectData";

export const PROJECT_SORT_KEYS = ["featured", "newest", "title", "status"] as const;
export type ProjectSortKey = (typeof PROJECT_SORT_KEYS)[number];

const STATUS_RANK: Record<ProjectCardData["status"], number> = {
  active: 0,
  shipped: 1,
  archived: 2,
};

const byNewest = (a: ProjectCardData, b: ProjectCardData) =>
  b.date.valueOf() - a.date.valueOf();

const COMPARATORS: Record<ProjectSortKey, (a: ProjectCardData, b: ProjectCardData) => number> = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || byNewest(a, b),
  newest: byNewest,
  title: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || byNewest(a, b),
};

/** Returns a sorted copy; featured first is the default. */
export function sortProjects(
  projects: ProjectCardData[],
  key: ProjectSortKey = "featured",
): ProjectCardData[] {
  return [...projects].sort(COMPARATORS[key]);
}
