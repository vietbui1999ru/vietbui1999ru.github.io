"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleHelloBlogEffect } from "@/components/ui/apple-hello-effect";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  draft?: boolean;
  tags?: string[];
};

type BlogProps = {
  posts: BlogPost[];
};

const BLOG_SECTION_SUBTITLE = "Recent posts and writing.";

const Blog = ({ posts }: BlogProps) => {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags ?? []))).sort();

  const filteredPosts =
    activeTag === null ? posts : posts.filter((p) => p.tags?.includes(activeTag));

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <section id="blog" className="relative min-h-screen w-full">
      <div
        data-section-id="blog"
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      />
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloBlogEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">{BLOG_SECTION_SUBTITLE}</p>
        </header>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            <button
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                activeTag === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                  activeTag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <Card key={post.slug} className="overflow-hidden flex flex-col">
                <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                  <FileText className="size-10 text-muted-foreground/50" />
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(post.date)}
                    </span>
                  </CardDescription>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {post.description}
                  </p>
                  <a
                    href={`/blog/${post.slug}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex")}
                  >
                    Read more
                  </a>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-12">
              No posts tagged &ldquo;{activeTag}&rdquo;.
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <a href="/blog" className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}>
            View all posts
          </a>
        </div>
      </div>
    </section>
  );
};

export default Blog;
