"use client";

import SingularityShaders from "@/components/shaders/Singularity";
import GradientText from "@/components/ui/GradientText";
import TypingText from "@/components/ui/TypingText";
import { useEffect, useState } from "react";
import {
  INTRO_GRADIENT,
  INTRO_INITIAL_DELAY,
  INTRO_LINE1,
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

  useEffect(() => {
    const handleScroll = () => {
      const t = Math.min(1, window.scrollY / (window.innerHeight / 2));
      const v =
        SINGULARITY_SCROLL_MIN + (SINGULARITY_SCROLL_MAX - SINGULARITY_SCROLL_MIN) * (1 - t);
      const sizeMax = SINGULARITY_SCROLL_MAX * SINGULARITY_SIZE_RESIZE_FACTOR;
      const sizeV = SINGULARITY_SCROLL_MIN + (sizeMax - SINGULARITY_SCROLL_MIN) * (1 - t);
      setSingularitySpeed(v);
      setSingularityIntensity(v);
      setSingularitySize(sizeV);
      setSingularityWaveStrength(v);
      setSingularityColorShift(v);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div id="home" className="relative min-h-screen w-full">
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

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4">
        <p className="text-center">
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
        </p>
      </div>
    </div>
  );
};

export default Home;
