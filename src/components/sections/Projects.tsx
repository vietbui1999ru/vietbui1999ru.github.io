"use client";

import { Carousel, Card as CarouselCard } from "@/components/ui/CardsCarousel";
import type { Card } from "@/components/ui/CardsCarousel";
import { AppleHelloMyWorkEffect } from "@/components/ui/apple-hello-effect";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { buttonVariants } from "@/components/ui/button";
import { Github, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTS_ITEMS, PROJECTS_TITLE } from "@/data/projectsData";

const projectImage = (title: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(title)}/400/600`;

function projectToCarouselCard(project: (typeof PROJECTS_ITEMS)[number]): Card {
  return {
    src: projectImage(project.title),
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
  const carouselCards = PROJECTS_ITEMS.map(projectToCarouselCard);

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
