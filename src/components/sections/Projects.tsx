"use client";

import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS, PROJECTS_TITLE } from "@/data/projectsData";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";

const Projects = () => {
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
    el.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  return (
    <section id="projects" className="relative min-h-screen w-full">
      <div data-section-id="projects" aria-hidden="true" className="absolute inset-0 pointer-events-none" />
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloMyWorkEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">{PROJECTS_TITLE}</p>
        </header>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {PROJECTS_ITEMS.map((project) => (
              <div key={project.title} className="snap-start flex-shrink-0 w-[calc(33.333%-14px)] min-w-[260px]">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>

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
          <a href="/projects" className={cn(buttonVariants({ variant: "outline" }), "inline-flex min-h-[44px]")}>
            View all projects
          </a>
        </div>
      </div>
    </section>
  );
};

export default Projects;
