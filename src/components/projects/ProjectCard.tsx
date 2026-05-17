"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Github, ExternalLink } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { BlurImage } from "@/components/ui/CardsCarousel";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/data/projectsData";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

// ── image gallery (used inside the modal) ─────────────────────────────────────

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => { sync(); }, [images.length, sync]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", sync); ro.disconnect(); };
  }, [sync]);

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -ref.current.clientWidth : ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-black/90">
      {(["left", "right"] as const).map((dir) => (
        <button key={dir} type="button" aria-label={dir === "left" ? "Previous image" : "Next image"}
          onClick={() => scroll(dir)}
          className={cn(
            "absolute inset-y-0 z-10 flex items-center transition-[filter,opacity]",
            dir === "left" ? "left-0 pl-3" : "right-0 pr-3",
            (dir === "left" ? canLeft : canRight) ? "cursor-pointer opacity-100" : "cursor-default opacity-50 blur-[2px]",
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white">
            {dir === "left" ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
          </div>
        </button>
      ))}
      <div ref={ref} onScroll={sync}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-3 sm:px-8 py-4">
        {images.map((src, i) => (
          <div key={i} className="relative h-[18rem] w-full flex-shrink-0 snap-center overflow-hidden rounded-xl bg-black">
            <BlurImage src={src} alt={`${title} preview ${i + 1}`} className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── card + modal ───────────────────────────────────────────────────────────────

export interface ProjectCardProps {
  project: ProjectItem;
  /** Optional extra classes for the card trigger wrapper */
  className?: string;
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const images = project.images?.length ? project.images : project.image ? [project.image] : [];

  const handleClose = useCallback(() => setOpen(false), []);
  useScrollLock(open);
  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, handleClose);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  return (
    <>
      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div key={`proj-modal-${project.title}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto p-4"
          >
            <div className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg" />
            <Card3D active maxTilt={8} className="relative z-[60] my-auto h-fit w-full max-w-[var(--content-max)] flex-shrink-0">
              <motion.div ref={containerRef}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="rounded-3xl bg-card text-card-foreground p-4 md:p-10"
              >
                <button type="button" onClick={handleClose}
                  className="sticky top-4 right-0 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <X className="h-6 w-6 text-primary-foreground" />
                </button>
                <p className="text-base font-medium text-muted-foreground">{project.badges?.[0] ?? "Project"}</p>
                <p className="mt-4 text-2xl font-semibold md:text-5xl">{project.title}</p>
                <div className="py-10">
                  {images.length === 1 && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-black">
                      <BlurImage src={images[0]!} alt={`${project.title} preview`} className="h-auto max-h-[18rem] w-full object-contain" />
                    </div>
                  )}
                  {images.length > 1 && <ImageGallery images={images} title={project.title} />}
                  <p className="text-muted-foreground text-sm leading-relaxed">{project.content}</p>
                  {project.badges && project.badges.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {project.badges.map((b) => <SkillBadge key={b} skill={b} size="sm" />)}
                    </div>
                  )}
                  {project.links && project.links.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.links.filter((l) => l.url).map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex items-center gap-1.5")}>
                          <Github className="size-3.5" />View code<ExternalLink className="size-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </Card3D>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card trigger — Experience card style */}
      <button type="button" onClick={() => setOpen(true)} className={cn("w-full text-left h-full", className)}>
        <Card3D active maxTilt={8} className="h-full">
          <div className="rounded-xl border bg-card/60 p-5 shadow-sm h-full flex flex-col gap-3
            hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
              {project.badges?.[0] ?? "Project"}
            </p>
            <h3 className="font-semibold leading-tight text-base md:text-lg line-clamp-2">
              {project.title}
            </h3>
            {project.content && (
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                {project.content}
              </p>
            )}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                {project.tags.map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-neutral-100">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card3D>
      </button>
    </>
  );
}
