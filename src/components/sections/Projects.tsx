"use client";

import { Carousel, Card as CarouselCard } from "@/components/ui/CardsCarousel";
import type { Card } from "@/components/ui/CardsCarousel";
import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { LavaLampBackground } from "@/components/ui/LavaLampBackground";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS, PROJECTS_TITLE } from "@/data/projectsData";

// Warm amber palette — each card gets a slightly shifted point in the same range
const GRAD_START = "#fff7e6";
const GRAD_END = "#ffb870";

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function mixHex(a: string, b: string, t: number) {
  const c1 = hexToRgb(a); const c2 = hexToRgb(b);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${ch(lerp(c1.r, c2.r, t))}${ch(lerp(c1.g, c2.g, t))}${ch(lerp(c1.b, c2.b, t))}`;
}

function gradientForIndex(index: number, total: number) {
  const t = total <= 1 ? 0 : index / (total - 1);
  return { fromColor: mixHex(GRAD_START, GRAD_END, t * 0.4), toColor: mixHex(GRAD_START, GRAD_END, 0.6 + t * 0.4) };
}

function projectToCarouselCard(project: (typeof PROJECTS_ITEMS)[number], index: number, total: number): Card {
  const { fromColor, toColor } = gradientForIndex(index, total);
  return {
    background: <LavaLampBackground fromColor={fromColor} toColor={toColor} />,
    title: project.title,
    category: project.badges?.[0] ?? "Project",
    content: (
      <>
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
  const carouselCards = PROJECTS_ITEMS.map((p, i) => projectToCarouselCard(p, i, total));

  return (
    <section id="projects" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 space-y-4 text-center">
          <AppleHelloMyWorkEffect
            className="mx-auto"
            svgClassName="mx-auto h-24 w-auto text-foreground"
          />
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
