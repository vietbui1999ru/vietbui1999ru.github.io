"use client";

import GradientText from "@/components/ui/GradientText";
import TypingText from "@/components/ui/TypingText";
import { Magnetic } from "@/components/ui/magnetic";
import { useState } from "react";
import { SiGithub, SiGitlab } from "@icons-pack/react-simple-icons";
import {
  INTRO_GRADIENT,
  INTRO_INITIAL_DELAY,
  INTRO_LINE1,
  HOME_TAGLINE,
  INTRO_TYPING_SPEED,
  VIET_GRADIENT,
} from "@/data/homeData";

const GITLAB_PROFILE_URL = "https://gitlab.com/vietbui1999ru";

const Home = () => {
  const [githubGradientAngle, setGithubGradientAngle] = useState(220);
  const [gitlabGradientAngle, setGitlabGradientAngle] = useState(220);

  return (
    <div id="home" className="relative min-h-screen w-full">
      {/* Viewport-filling gradient overlay. Sits ABOVE the r3f canvas
          (z-index 0 > canvas -10) and BELOW hero text (z-index 10). Covers
          the strip that BaseLayout's <main pt-24 pb-20> would otherwise
          leave uncolored, so the r3f Singularity never peeks through
          brighter than the home gradient. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-gradient-to-b from-background to-surface/40 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div
        data-section-id="home"
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      />

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-3xl">
          <TypingText
            text={[INTRO_LINE1]}
            loop={false}
            as="span"
            className="font-medium text-center text-foreground drop-shadow-md"
            style={{ fontSize: "clamp(2.25rem, 8vw, 4.5rem)" }}
            typingSpeed={INTRO_TYPING_SPEED}
            pauseDuration={0}
            initialDelay={INTRO_INITIAL_DELAY}
            showCursor={false}
            highlightWords={["Viet"]}
            HighlightComponent={GradientText}
            highlightComponentProps={{
              gradient: VIET_GRADIENT,
              neon: true,
            }}
            DefaultSegmentComponent={GradientText}
            defaultSegmentProps={{
              gradient: INTRO_GRADIENT,
              neon: true,
            }}
          />
          <p className="text-2xl md:text-3xl text-muted-foreground">
            {HOME_TAGLINE}
          </p>
          <div className="mt-4 flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={18}>
                  <a
                    href="https://github.com/vietbui1999ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium shadow-md backdrop-blur transition hover:border-white/30 hover:bg-white/5"
                    aria-label="View Viet Bui's GitHub profile"
                    onMouseMove={(event) => {
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      const relativeX =
                        (event.clientX - bounds.left) /
                        Math.max(bounds.width, 1);
                      const clampedX = Math.min(Math.max(relativeX, 0), 1);
                      const angle = 180 + clampedX * 180;
                      setGithubGradientAngle(angle);
                    }}
                    onMouseLeave={() => setGithubGradientAngle(220)}
                  >
                    <SiGithub className="h-5 w-5 text-slate-100" />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(${githubGradientAngle}deg, #f5f5f5, #d4d4d8, #a1a1aa)`,
                      }}
                    >
                      My GitHub profile
                    </span>
                  </a>
                </Magnetic>
                <Magnetic strength={18}>
                  <a
                    href={GITLAB_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium shadow-md backdrop-blur transition hover:border-white/30 hover:bg-white/5"
                    aria-label="View Viet Bui's GitLab profile"
                    onMouseMove={(event) => {
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      const relativeX =
                        (event.clientX - bounds.left) /
                        Math.max(bounds.width, 1);
                      const clampedX = Math.min(Math.max(relativeX, 0), 1);
                      const angle = 180 + clampedX * 180;
                      setGitlabGradientAngle(angle);
                    }}
                    onMouseLeave={() => setGitlabGradientAngle(220)}
                  >
                    <SiGitlab className="h-5 w-5 text-[#FC6D26]" />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(${gitlabGradientAngle}deg, #fff7ed, #fdba74, #fb923c)`,
                      }}
                    >
                      My GitLab profile
                    </span>
                  </a>
                </Magnetic>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 shadow-sm backdrop-blur-sm"
                aria-label="Open to new opportunities and challenges"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
                </span>
                <span className="whitespace-nowrap">
                  open to new opportunities &amp; challenges
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
