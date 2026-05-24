"use client";

import { Carousel, Card as CarouselCard, BlurImage } from "@/components/ui/CardsCarousel";
import type { Card } from "@/components/ui/CardsCarousel";
import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LavaLampBackground,
  type LavaLampBackgroundProps,
} from "@/components/ui/LavaLampBackground";
import { resolveIcon } from "@/lib/iconResolver";
import { useCallback, useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { SkillBadge } from "@/components/ui/SkillBadge";

export type ProjectCardData = {
  slug: string;
  title: string;
  summary: string;
  date: Date;
  featured: boolean;
  badges?: string[];
  cover?: string;
  images?: string[];
  links?: Array<{ icon: string; url: string }>;
  status: "active" | "shipped" | "archived";
  bodyHtml: string;
};

type ProjectsProps = {
  projects: ProjectCardData[];
};

function resolveImageUrl(image: string, slug: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `/assets/projects/${slug}/${image}`;
}

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

function ProjectImageGallery({ images, title }: { images: string[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-black/90">
      <button
        type="button"
        aria-label="Previous image"
        onClick={() => scroll("left")}
        className={cn(
          "absolute inset-y-0 left-0 z-10 flex items-center pl-3 transition-[filter,opacity]",
          canScrollLeft ? "cursor-pointer opacity-100" : "cursor-default opacity-50 blur-[2px]",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white">
          <ChevronLeft className="h-6 w-6" />
        </div>
      </button>
      <button
        type="button"
        aria-label="Next image"
        onClick={() => scroll("right")}
        className={cn(
          "absolute inset-y-0 right-0 z-10 flex items-center pr-3 transition-[filter,opacity]",
          canScrollRight ? "cursor-pointer opacity-100" : "cursor-default opacity-50 blur-[2px]",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white">
          <ChevronRight className="h-6 w-6" />
        </div>
      </button>
      <div
        ref={scrollRef}
        className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto px-3 sm:px-8 py-4"
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
  project: ProjectCardData,
  index: number,
  total: number,
): Card {
  const { fromColor, toColor } = gradientForIndex(index, total);

  const normalizedImages: string[] =
    project.images && project.images.length > 0
      ? project.images.map((img) => resolveImageUrl(img, project.slug))
      : project.cover
        ? [resolveImageUrl(project.cover, project.slug)]
        : [];

  // DOMPurify needs a browser DOM; skip on SSR (trusted vault content), sanitize on client.
  const sanitizedHtml = project.bodyHtml
    ? typeof window !== "undefined"
      ? DOMPurify.sanitize(project.bodyHtml)
      : project.bodyHtml
    : "";

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
        {sanitizedHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">{project.summary}</p>
        )}
        {project.badges && project.badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.badges.map((badge) => (
              <SkillBadge key={badge} skill={badge} size="sm" />
            ))}
          </div>
        )}
        {project.links && project.links.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {project.links.map((link, i) => {
              const Icon = resolveIcon(link.icon);
              return (
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
                  <Icon className="size-3.5" />
                  View
                </a>
              );
            })}
          </div>
        )}
      </>
    ),
  };
}

const Projects = ({ projects }: ProjectsProps) => {
  const total = projects.length;
  const carouselCards = projects.map((project, index) =>
    projectToCarouselCard(project, index, total),
  );

  return (
    <section id="projects" className="relative min-h-screen w-full">
      <div data-section-id="projects" aria-hidden="true" className="absolute inset-0 pointer-events-none" />
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloMyWorkEffect className="w-full" />
        </header>

        <Carousel
          items={carouselCards.map((card, index) => (
            <CarouselCard key={card.title} card={card} index={index} layout />
          ))}
        />

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
