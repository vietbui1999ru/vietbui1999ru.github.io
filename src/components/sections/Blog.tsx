"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleHelloBlogEffect } from "@/components/ui/apple-hello-effect";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, FileText } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [sync]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by one card width (~320px) so 3 visible cards advance one at a time
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <section id="blog" className="relative min-h-screen w-full">
      <div data-section-id="blog" aria-hidden="true" className="absolute inset-0 pointer-events-none" />
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloBlogEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">{BLOG_SECTION_SUBTITLE}</p>
        </header>

        {/* Scroll strip — 3 cards visible, arrow nav */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {posts.map((post) => (
              <Card
                key={post.slug}
                className="group snap-start flex-shrink-0 w-[calc(33.333%-14px)] min-w-[260px] overflow-hidden flex flex-col hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <div className="aspect-video w-full flex items-center justify-center bg-muted/50">
                  <FileText className="size-10 text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors" />
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="size-3" />
                    {formatDate(post.date)}
                  </CardDescription>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.tags.slice(0, 3).map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.description}</p>
                  <a
                    href={`/blog/${post.slug}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex min-h-[44px]")}
                  >
                    Read more
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Arrow nav — matches CardsCarousel style */}
          <div className="mt-4 flex w-full justify-center gap-2">
            <button
              type="button"
              disabled={!canLeft}
              onClick={() => scroll("left")}
              className="relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              disabled={!canRight}
              onClick={() => scroll("right")}
              className="relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/blog" className={cn(buttonVariants({ variant: "outline" }), "inline-flex min-h-[44px]")}>
            View all posts
          </a>
        </div>
      </div>
    </section>
  );
};

export default Blog;
