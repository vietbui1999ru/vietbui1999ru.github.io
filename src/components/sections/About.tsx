"use client";

import { AppleHelloAboutMeEffect } from "@/components/ui/apple-hello-effect";
import { Separator } from "@/components/ui/separator";
import { ABOUT_PARAGRAPHS, ABOUT_TAGLINE } from "@/data/aboutData";
import { AboutParagraphReveal } from "./AboutParagraphReveal";
import { SkillsSection } from "./SkillsSection";

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
      <div className="section-content">
        <header className="mb-12 space-y-4 text-center">
          <AppleHelloAboutMeEffect
            className="mx-auto"
            svgClassName="mx-auto h-24 w-auto text-foreground"
          />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {ABOUT_TAGLINE}
          </p>
        </header>

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
        <SkillsSection />
      </div>
    </section>
  );
};

export default About;
