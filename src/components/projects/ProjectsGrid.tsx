"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS } from "@/data/projectsData";
import { ProjectCard } from "@/components/projects/ProjectCard";

function TagFilter({ tags, active, onToggle }: { tags: string[]; active: string | null; onToggle: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <button onClick={() => onToggle("")}
        className={cn("px-3 py-1 rounded-full text-sm font-medium transition-colors",
          active === null ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
        All
      </button>
      {tags.map((tag) => (
        <button key={tag} onClick={() => onToggle(tag)}
          className={cn("px-3 py-1 rounded-full text-sm font-medium transition-colors",
            active === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
          {tag}
        </button>
      ))}
    </div>
  );
}

export function ProjectsGrid() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(PROJECTS_ITEMS.flatMap((p) => p.tags ?? []))).sort();
  const filtered = activeTag ? PROJECTS_ITEMS.filter((p) => p.tags?.includes(activeTag)) : PROJECTS_ITEMS;
  const toggle = (tag: string) => setActiveTag((prev) => (tag === "" || prev === tag ? null : tag));

  return (
    <>
      {allTags.length > 0 && <TagFilter tags={allTags} active={activeTag} onToggle={toggle} />}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No projects tagged &ldquo;{activeTag}&rdquo;.
          </p>
        )}
      </div>
    </>
  );
}
