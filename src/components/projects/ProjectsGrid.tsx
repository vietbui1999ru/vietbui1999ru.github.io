"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Github, ExternalLink } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { LavaLampBackground, type LavaLampBackgroundProps } from "@/components/ui/LavaLampBackground";
import { BlurImage } from "@/components/ui/CardsCarousel";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS, type ProjectItem } from "@/data/projectsData";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useIsMobileOrTouch } from "@/hooks/useIsMobileOrTouch";

// ── color helpers (same palette as Projects.tsx) ──────────────────────────────

function hexToRgb(hex: string) {
  const c = hex.replace("#", "");
  if (c.length !== 6) return null;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return Number.isNaN(r + g + b) ? null : { r, g, b };
}
function toHex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}
function mixColors(a: string, b: string, t: number) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  if (!c1 || !c2) return a;
  return `#${toHex(c1.r + (c2.r - c1.r) * t)}${toHex(c1.g + (c2.g - c1.g) * t)}${toHex(c1.b + (c2.b - c1.b) * t)}`;
}
function gradientForIndex(i: number, n: number): Pick<LavaLampBackgroundProps, "fromColor" | "toColor"> {
  const s = "#fff7e6", e = "#ffb870";
  const t = n <= 1 ? 0 : i / (n - 1);
  return { fromColor: mixColors(s, e, t * 0.4), toColor: mixColors(s, e, 0.6 + t * 0.4) };
}

// ── image gallery (re-implemented, same as Projects.tsx) ─────────────────────

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
        <button key={dir} type="button" aria-label={`${dir === "left" ? "Previous" : "Next"} image`}
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

// ── single project grid card with built-in modal ──────────────────────────────

function ProjectGridCard({ project, index, total }: { project: ProjectItem; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobileOrTouch();

  const { fromColor, toColor } = gradientForIndex(index, total);
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

  const background = isMobile
    ? <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }} />
    : <LavaLampBackground fromColor={fromColor} toColor={toColor} />;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div key={`proj-modal-${project.title}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto p-4"
          >
            <div className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg" />
            <Card3D active={open} maxTilt={8}
              className="relative z-[60] my-auto h-fit w-full max-w-[var(--content-max)] flex-shrink-0">
              <motion.div ref={containerRef}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                layoutId={`proj-card-${project.title}`}
                transition={{ layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }, opacity: { duration: 0.2 } }}
                className="rounded-3xl bg-card text-card-foreground p-4 md:p-10"
              >
                <button type="button" onClick={handleClose}
                  className="sticky top-4 right-0 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <X className="h-6 w-6 text-primary-foreground" />
                </button>
                <p className="text-base font-medium text-foreground">{project.badges?.[0] ?? "Project"}</p>
                <p className="mt-4 text-2xl font-semibold text-foreground md:text-5xl">{project.title}</p>
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

      {/* Card trigger */}
      <motion.button type="button" onClick={() => setOpen(true)}
        layoutId={`proj-card-${project.title}`}
        className="group relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-card text-left"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/60 via-transparent to-black/30" />
        <div className="relative z-40 p-4 md:p-5">
          <p className="text-left font-sans text-xs font-medium text-white/80 md:text-sm">
            {project.badges?.[0] ?? "Project"}
          </p>
          <p className="mt-1 max-w-xs text-left font-sans text-sm font-semibold text-white [text-wrap:balance] md:text-base">
            {project.title}
          </p>
        </div>
        {project.tags && project.tags.length > 0 && (
          <div className="absolute bottom-3 left-3 z-40 flex flex-wrap gap-1">
            {project.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-black/50 text-white/90 backdrop-blur-sm">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-10">{background}</div>
      </motion.button>
    </>
  );
}

// ── tag filter bar ─────────────────────────────────────────────────────────────

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

// ── main export ───────────────────────────────────────────────────────────────

export function ProjectsGrid() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(PROJECTS_ITEMS.flatMap((p) => p.tags ?? []))).sort();
  const filtered = activeTag ? PROJECTS_ITEMS.filter((p) => p.tags?.includes(activeTag)) : PROJECTS_ITEMS;
  const toggle = (tag: string) => setActiveTag((prev) => (tag === "" || prev === tag ? null : tag));

  return (
    <>
      {allTags.length > 0 && <TagFilter tags={allTags} active={activeTag} onToggle={toggle} />}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
          <ProjectGridCard key={project.title} project={project} index={i} total={filtered.length} />
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
