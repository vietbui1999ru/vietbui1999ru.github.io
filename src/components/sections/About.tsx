"use client";

import { AppleHelloAboutMeEffect } from "@/components/ui/apple-hello-effect";
import { Separator } from "@/components/ui/separator";
import { ABOUT_PARAGRAPHS, ABOUT_TAGLINE } from "@/data/aboutData";
import { AboutParagraphReveal } from "./AboutParagraphReveal";
import { SkillsSection } from "./SkillsSection";

const ABOUT_REVEAL_CONFIG = {
  // Reveal completes when paragraph top is 10% into the viewport (containerEnd: 0.1).
  containerEnd: 0.1,
  slideOffset: 20,
  // Smaller values make all words complete their reveal over less scroll,
  // so the full paragraph finishes earlier.
  staggerPerWord: 0.005,
  revealSpan: 0.2,
  // Use normal text color for the paragraph; skill/tooling highlights handle their own color.
  gradient: "linear-gradient(90deg, #ffffff, #ffffff)",
} as const;

const About = () => {
  return (
    <section id="about" className="relative min-h-[50vh] w-full">
      <div className="section-content max-w-10xl mx-auto">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloAboutMeEffect className="w-full" />
        </header>

        <div className="space-y-10 mb-12 mx-auto max-w-10xl w-full">
          {ABOUT_PARAGRAPHS.map((text, i) => (
            <AboutParagraphReveal
              key={i}
              text={text}
              direction={i % 2 === 0 ? "ltr" : "rtl"}
              gradient={ABOUT_REVEAL_CONFIG.gradient}
              containerEnd={ABOUT_REVEAL_CONFIG.containerEnd}
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
