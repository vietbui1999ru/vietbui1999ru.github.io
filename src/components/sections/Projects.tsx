"use client";

import {
  Carousel,
  Card as CarouselCard,
  BlurImage,
} from "@/components/ui/CardsCarousel";
import type { Card } from "@/components/ui/CardsCarousel";
import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { Github, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LavaLampBackground,
  type LavaLampBackgroundProps,
} from "@/components/ui/LavaLampBackground";
import { PROJECTS_ITEMS, PROJECTS_TITLE } from "@/data/projectsData";
import { useCallback, useEffect, useRef, useState } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function componentToHex(c: number) {
  const clamped = Math.max(0, Math.min(255, Math.round(c)));
  const hex = clamped.toString(16).padStart(2, "0");
  return hex;
}

function mixHexColors(a: string, b: string, t: number): string {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  if (!c1 || !c2) return a;
  const mix = (x: number, y: number) => x + (y - x) * t;
  const r = mix(c1.r, c2.r);
  const g = mix(c1.g, c2.g);
  const bCh = mix(c1.b, c2.b);
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(bCh)}`;
}

function gradientForIndex(
  index: number,
  total: number,
): Pick<LavaLampBackgroundProps, "fromColor" | "toColor"> {
  const baseStart = "#fff7e6";
  const baseEnd = "#ffb870";

  if (total <= 1) {
    return { fromColor: baseStart, toColor: baseEnd };
  }

  const t = index / (total - 1);

  // For each card, pick a slightly different point in the same warm range.
  const fromColor = mixHexColors(baseStart, baseEnd, t * 0.4);
  const toColor = mixHexColors(baseStart, baseEnd, 0.6 + t * 0.4);

  return { fromColor, toColor };
}

function ProjectImageGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [images.length, updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-black/90">
      <button
        type="button"
        aria-label="Previous image"
        onClick={() => scroll("left")}
        className={cn(
          "absolute inset-y-0 left-0 z-10 flex items-center pl-3 transition-[filter,opacity]",
          canScrollLeft
            ? "cursor-pointer opacity-100"
            : "cursor-default opacity-50 blur-[2px]",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
          <ChevronLeft className="h-6 w-6" />
        </div>
      </button>
      <button
        type="button"
        aria-label="Next image"
        onClick={() => scroll("right")}
        className={cn(
          "absolute inset-y-0 right-0 z-10 flex items-center pr-3 transition-[filter,opacity]",
          canScrollRight
            ? "cursor-pointer opacity-100"
            : "cursor-default opacity-50 blur-[2px]",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
          <ChevronRight className="h-6 w-6" />
        </div>
      </button>
      <div
        ref={scrollRef}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto px-8 py-4"
        onScroll={updateScrollState}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="relative h-[18rem] w-full flex-shrink-0 snap-center overflow-hidden rounded-xl bg-black"
          >
            <BlurImage
              src={src}
              alt={`${title} preview ${i + 1}`}
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function projectToCarouselCard(
  project: (typeof PROJECTS_ITEMS)[number],
  index: number,
  total: number,
): Card {
  const { fromColor, toColor } = gradientForIndex(index, total);
  const normalizedImages: string[] =
    project.images && project.images.length > 0
      ? project.images
      : project.image
        ? [project.image]
        : [];

  return {
    background: <LavaLampBackground fromColor={fromColor} toColor={toColor} />,
    title: project.title,
    category: project.badges?.[0] ?? "Project",
    content: (
      <>
        {normalizedImages.length === 1 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-black">
            <BlurImage
              src={normalizedImages[0] as string}
              alt={`${project.title} preview`}
              className="h-auto max-h-[18rem] w-full object-contain"
            />
          </div>
        )}
        {normalizedImages.length > 1 && (
          <ProjectImageGallery images={normalizedImages} title={project.title} />
        )}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {project.content}
        </p>
        {project.badges && project.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.badges.map((badge) => (
              <SkillBadge key={badge} skill={badge} size="sm" />
            ))}
          </div>
        )}
        {project.links && project.links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "inline-flex items-center gap-1.5",
                )}
              >
                <Github className="size-3.5" />
                View code
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        )}
      </>
    ),
  };
}

const Projects = () => {
  const total = PROJECTS_ITEMS.length;
  const carouselCards = PROJECTS_ITEMS.map((project, index) =>
    projectToCarouselCard(project, index, total),
  );

  return (
    <section id="projects" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloMyWorkEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {PROJECTS_TITLE}
          </p>
        </header>

        <Carousel
          items={carouselCards.map((card, index) => (
            <CarouselCard key={card.title} card={card} index={index} layout />
          ))}
        />
      </div>
    </section>
  );
};

export default Projects;
