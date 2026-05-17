"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card3D } from "@/components/ui/Card3D";
import { AppleHelloBlogEffect } from "@/components/ui/apple-hello-effect";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  draft?: boolean;
  tags?: string[];
  cover?: string;
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
    el.scrollBy({ left: dir === "left" ? -el.clientWidth : el.clientWidth, behavior: "smooth" });
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
              <div key={post.slug} className="snap-start flex-shrink-0 w-[calc(33.333%-14px)] min-w-[260px] h-full">
                <Card3D active maxTilt={8} className="h-full">
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
                    <h3 className="font-semibold leading-tight text-base md:text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                      {post.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />{formatDate(post.date)}
                      </span>
                      {post.tags && post.tags.slice(0, 2).map((t) => (
                        <span key={t} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-neutral-100">
                          {t}
                        </span>
                      ))}
                    </div>
                    </div>
                  </a>
                </Card3D>
              </div>
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
