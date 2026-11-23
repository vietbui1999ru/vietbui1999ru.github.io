import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ProjectSortControl from "@/components/patterns/ProjectSortControl.svelte";
import { sortProjects } from "@/lib/project-sort";
import type { ProjectCardData } from "@/data/projectData";

const project = (
  slug: string,
  overrides: Partial<ProjectCardData> = {},
): ProjectCardData => ({
  slug,
  title: slug,
  summary: "",
  date: new Date("2026-01-01"),
  featured: false,
  status: "shipped",
  bodyHtml: "",
  ...overrides,
});

const projects = [
  project("beta", { date: new Date("2026-02-01"), status: "archived" }),
  project("alpha", { date: new Date("2025-06-01"), featured: true, status: "active" }),
  project("gamma", { date: new Date("2026-03-01"), status: "shipped" }),
];

const slugs = (list: ProjectCardData[]) => list.map((p) => p.slug);

describe("sortProjects", () => {
  it("puts featured first by default, then newest", () => {
    expect(slugs(sortProjects(projects))).toEqual(["alpha", "gamma", "beta"]);
  });

  it("sorts newest first", () => {
    expect(slugs(sortProjects(projects, "newest"))).toEqual(["gamma", "beta", "alpha"]);
  });

  it("sorts by title", () => {
    expect(slugs(sortProjects(projects, "title"))).toEqual(["alpha", "beta", "gamma"]);
  });

  it("sorts by status: active, shipped, archived", () => {
    expect(slugs(sortProjects(projects, "status"))).toEqual(["alpha", "gamma", "beta"]);
  });

  it("does not mutate the input", () => {
    const before = slugs(projects);
    sortProjects(projects, "title");
    expect(slugs(projects)).toEqual(before);
  });
});

describe("ProjectSortControl", () => {
  it("offers featured, newest, title and status", () => {
    render(ProjectSortControl, { props: { value: "featured", onChange: () => {} } });
    const options = screen.getAllByRole("option").map((o) => o.textContent?.trim());
    expect(options).toEqual(["featured", "newest", "title", "status"]);
  });

  it("reports the chosen sort key", async () => {
    const onChange = vi.fn();
    render(ProjectSortControl, { props: { value: "featured", onChange } });
    await fireEvent.change(screen.getByRole("combobox"), { target: { value: "title" } });
    expect(onChange).toHaveBeenCalledWith("title");
  });
});
