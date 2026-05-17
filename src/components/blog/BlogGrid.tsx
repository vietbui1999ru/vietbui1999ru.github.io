"use client";

import { useState } from "react";
import { Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type SerializedPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO string — Date can't cross Astro→React serialization boundary
  tags: string[];
};

type Props = { posts: SerializedPost[] };

const TagFilter = ({
  tags,
  active,
  onToggle,
}: {
  tags: string[];
  active: string | null;
  onToggle: (tag: string) => void;
}) => (
  <div className="flex flex-wrap gap-2 mb-8">
    <button
      onClick={() => onToggle("")}
      className={cn(
        "px-3 py-1 rounded-full text-sm font-medium transition-colors",
        active === null
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
    >
      All
    </button>
    {tags.map((tag) => (
      <button
        key={tag}
        onClick={() => onToggle(tag)}
        className={cn(
          "px-3 py-1 rounded-full text-sm font-medium transition-colors",
          active === tag
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
      >
        {tag}
      </button>
    ))}
  </div>
);

export function BlogGrid({ posts }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  const filtered = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;

  const toggle = (tag: string) => setActiveTag((prev) => (tag === "" || prev === tag ? null : tag));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <>
      {allTags.length > 0 && <TagFilter tags={allTags} active={activeTag} onToggle={toggle} />}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden"
          >
            <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
              <FileText className="size-10 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
            </div>
            <div className="flex flex-col flex-1 p-5 gap-3">
              <h2 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.description}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-auto pt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDate(post.date)}
                </span>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No posts tagged &ldquo;{activeTag}&rdquo;.
          </p>
        )}
      </div>
    </>
  );
}
