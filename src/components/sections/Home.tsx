"use client";

import SingularityShaders from "@/components/shaders/Singularity";
import GradientText from "@/components/ui/GradientText";
import TypingText from "@/components/ui/TypingText";
import { Magnetic } from "@/components/ui/magnetic";
import { useEffect, useState } from "react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  INTRO_GRADIENT,
  INTRO_INITIAL_DELAY,
  INTRO_LINE1,
  HOME_TAGLINE,
  INTRO_TYPING_SPEED,
  SINGULARITY_SCROLL_MAX,
  SINGULARITY_SCROLL_MIN,
  SINGULARITY_SIZE_RESIZE_FACTOR,
  VIET_GRADIENT,
} from "@/data/homeData";

const Home = () => {
  const [singularitySpeed, setSingularitySpeed] = useState(1.0);
  const [singularityIntensity, setSingularityIntensity] = useState(1.0);
  const [singularitySize, setSingularitySize] = useState(1.0);
  const [singularityWaveStrength, setSingularityWaveStrength] = useState(1.0);
  const [singularityColorShift, setSingularityColorShift] = useState(1.0);
  const [githubGradientAngle, setGithubGradientAngle] = useState(220);

  const [isTouchOrMobile, setIsTouchOrMobile] = useState(false);

  useEffect(() => {
    const checkIsTouchOrMobile = () => {
      if (typeof window === "undefined") return;
      const isCoarsePointer =
        typeof window.matchMedia !== "undefined"
          ? window.matchMedia("(pointer: coarse)").matches
          : false;
      const isSmallViewport = window.innerWidth < 768;
      setIsTouchOrMobile(isCoarsePointer || isSmallViewport);
    };

    checkIsTouchOrMobile();
    window.addEventListener("resize", checkIsTouchOrMobile);
    window.addEventListener("orientationchange", checkIsTouchOrMobile);

    return () => {
      window.removeEventListener("resize", checkIsTouchOrMobile);
      window.removeEventListener("orientationchange", checkIsTouchOrMobile);
    };
  }, []);

  useEffect(() => {
    if (isTouchOrMobile) {
      setSingularitySpeed(0);
      setSingularityIntensity(0);
      setSingularitySize(0);
      setSingularityWaveStrength(0);
      setSingularityColorShift(0);
      return;
    }

    const handleScroll = () => {
      const t = Math.min(1, window.scrollY / (window.innerHeight / 2));
      const v =
        SINGULARITY_SCROLL_MIN +
        (SINGULARITY_SCROLL_MAX - SINGULARITY_SCROLL_MIN) * (1 - t);
      const sizeMax = SINGULARITY_SCROLL_MAX * SINGULARITY_SIZE_RESIZE_FACTOR;
      const sizeV =
        SINGULARITY_SCROLL_MIN + (sizeMax - SINGULARITY_SCROLL_MIN) * (1 - t);
      setSingularitySpeed(v);
      setSingularityIntensity(v);
      setSingularitySize(sizeV);
      setSingularityWaveStrength(v);
      setSingularityColorShift(v);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isTouchOrMobile]);
  return (
    <div
      id="home"
      className="relative min-h-screen w-full bg-gradient-to-b from-background to-surface/40"
    >
      {!isTouchOrMobile && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ opacity: singularitySize > 0.25 ? 1 : 0 }}
          aria-hidden={singularitySize <= 0.25}
        >
          <SingularityShaders
            className="singularity-shader h-full w-full"
            speed={singularitySpeed}
            intensity={singularityIntensity}
            size={singularitySize}
            waveStrength={singularityWaveStrength}
            colorShift={singularityColorShift}
          />
        </div>
      )}

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
            <Magnetic strength={18}>
              <a
                href="https://github.com/vietbui1999ru"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium shadow-md backdrop-blur transition hover:border-white/30 hover:bg-white/5"
                aria-label="View Viet Bui's GitHub profile"
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const relativeX =
                    (event.clientX - bounds.left) / Math.max(bounds.width, 1);
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
