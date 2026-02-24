"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ABOUT_CURRENT_ROLE,
  ABOUT_HOBBIES,
  ABOUT_INTERESTS,
  ABOUT_PARAGRAPHS,
  ABOUT_TAGLINE,
} from "@/data/aboutData";
import { Briefcase, Gamepad2, Sparkles } from "lucide-react";
import { AboutCard } from "./AboutCard";
import { AboutParagraphReveal } from "./AboutParagraphReveal";
import { AboutSectionHeading } from "./AboutSectionHeading";

const ABOUT_REVEAL_CONFIG = {
  scrollOffsetStart: 0,
  scrollOffsetEnd: 1,
  slideOffset: 40,
  staggerPerWord: 0.03,
  revealSpan: 0.12,
  gradient: "linear-gradient(90deg, #ffffff, #ffffff)",
} as const;

const About = () => {
  return (
    <section id="about" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <AboutSectionHeading
          title="About Me"
          subtitle={ABOUT_TAGLINE}
          className="mb-12"
        />

        <div className="space-y-10 mb-12">
          {ABOUT_PARAGRAPHS.map((text, i) => (
            <AboutParagraphReveal
              key={i}
              text={text}
              direction={i % 2 === 0 ? "ltr" : "rtl"}
              gradient={ABOUT_REVEAL_CONFIG.gradient}
              scrollOffsetStart={ABOUT_REVEAL_CONFIG.scrollOffsetStart}
              scrollOffsetEnd={ABOUT_REVEAL_CONFIG.scrollOffsetEnd}
              slideOffset={ABOUT_REVEAL_CONFIG.slideOffset}
              staggerPerWord={ABOUT_REVEAL_CONFIG.staggerPerWord}
              revealSpan={ABOUT_REVEAL_CONFIG.revealSpan}
            />
          ))}
        </div>

        <Separator className="my-10" />

        <AboutCard
          title={ABOUT_CURRENT_ROLE.title}
          description={`${ABOUT_CURRENT_ROLE.org} · ${ABOUT_CURRENT_ROLE.location}`}
          icon={<Briefcase className="size-5" />}
          className="mb-8"
        />

        <AboutCard
          title="Interests & focus"
          icon={<Sparkles className="size-5" />}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2">
            {ABOUT_INTERESTS.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </AboutCard>

        <AboutCard
          title="When I'm not coding"
          icon={<Gamepad2 className="size-5" />}
        >
          <div className="flex flex-wrap gap-2">
            {ABOUT_HOBBIES.map((hobby) => (
              <Badge key={hobby} variant="outline">
                {hobby}
              </Badge>
            ))}
          </div>
        </AboutCard>
      </div>
    </section>
  );
};

export default About;
