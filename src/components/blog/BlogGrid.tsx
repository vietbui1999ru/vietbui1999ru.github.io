"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { cn } from "@/lib/utils";

export type SerializedPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO string — Date can't cross Astro→React serialization boundary
  tags: string[];
  cover?: string;
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
          <Card3D key={post.slug} active maxTilt={8} className="h-full">
            <a
              href={`/blog/${post.slug}`}
              className="group flex flex-col h-full rounded-xl border bg-card/60 overflow-hidden shadow-sm
                hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted/40 flex-shrink-0">
                {post.cover
                  ? <img src={post.cover} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full bg-gradient-to-br from-muted/60 to-muted/20" />
                }
              </div>
              <div className="flex flex-col flex-1 p-5 gap-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Post</p>
              <h2 className="font-semibold leading-tight text-base md:text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                {post.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" />{formatDate(post.date)}
                </span>
                {post.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-neutral-100">
                    {tag}
                  </span>
                ))}
              </div>
              </div>
            </a>
          </Card3D>
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
