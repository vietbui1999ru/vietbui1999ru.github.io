"use client";

import SingularityShaders from "@/app/home/components/shaders/Singularity";
import GradientText from "@/components/ui/GradientText";
import RotatingText from "@/components/ui/RotatingText";
import TypingText from "@/components/ui/TypingText";
import { useEffect, useState } from "react";
import {
  INTRO_GRADIENT,
  INTRO_INITIAL_DELAY,
  INTRO_LINE1,
  INTRO_LINE2,
  INTRO_ROTATING_DELAY_AFTER_TYPING,
  INTRO_ROTATING_DURATION,
  INTRO_ROTATING_WORDS,
  INTRO_TYPING_SPEED,
  SINGULARITY_SCROLL_MAX,
  SINGULARITY_SCROLL_MIN,
  SINGULARITY_SIZE_RESIZE_FACTOR,
  VIET_GRADIENT,
} from "./homeData";

const TYPING_DURATION_MS =
  INTRO_INITIAL_DELAY +
  INTRO_LINE1.length * INTRO_TYPING_SPEED +
  INTRO_LINE2.length * INTRO_TYPING_SPEED;

const Home = () => {
  const [showRotatingText, setShowRotatingText] = useState(false);
  const [singularitySpeed, setSingularitySpeed] = useState(1.0);
  const [singularityIntensity, setSingularityIntensity] = useState(1.0);
  const [singularitySize, setSingularitySize] = useState(1.0);
  const [singularityWaveStrength, setSingularityWaveStrength] = useState(1.0);
  const [singularityColorShift, setSingularityColorShift] = useState(1.0);

  useEffect(() => {
    const handleScroll = () => {
      const t = Math.min(1, window.scrollY / (window.innerHeight / 2));
      const v =
        SINGULARITY_SCROLL_MIN +
        (SINGULARITY_SCROLL_MAX - SINGULARITY_SCROLL_MIN) * (1 - t);
      const sizeMax = SINGULARITY_SCROLL_MAX * SINGULARITY_SIZE_RESIZE_FACTOR;
      const sizeV =
        SINGULARITY_SCROLL_MIN +
        (sizeMax - SINGULARITY_SCROLL_MIN) * (1 - t);
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
  useEffect(() => {
    const timer = setTimeout(
      () => setShowRotatingText(true),
      TYPING_DURATION_MS + INTRO_ROTATING_DELAY_AFTER_TYPING
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="home" className="relative min-h-screen w-full">
      {/* Shader as background — always mounted to avoid WebGL/shader recompile on scroll back */}
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

      <div className="relative z-10 flex flex-col min-h-screen items-center justify-center px-4">
        {/* Line 1: "Hello, my name is Viet" */}
        <TypingText
          text={[INTRO_LINE1]}
          loop={false}
          as="p"
          className="text-7xl font-medium text-center text-foreground drop-shadow-md md:text-7xl"
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
          <TypingText
            text={[INTRO_LINE2]}
            loop={false}
            as="span"
            className="text-7xl font-medium text-foreground drop-shadow-md md:text-7xl"
            typingSpeed={INTRO_TYPING_SPEED}
            pauseDuration={0}
            initialDelay={INTRO_INITIAL_DELAY + INTRO_LINE1.length * INTRO_TYPING_SPEED}
            showCursor
            cursorCharacter=""
            DefaultSegmentComponent={GradientText}
            defaultSegmentProps={{
              gradient: INTRO_GRADIENT,
              neon: true,
            }}
          />
        {/* Line 2: "I'm a" + rotating word, centered */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-1 text-center">
          {showRotatingText ? (
            <RotatingText
              text={[...INTRO_ROTATING_WORDS]}
              duration={INTRO_ROTATING_DURATION}
              containerClassName="inline-block"
              className="text-7xl font-medium text-foreground drop-shadow-md md:text-7xl"
              ItemComponent={GradientText}
              itemComponentProps={{
                gradient: VIET_GRADIENT,
                neon: true,
              }}
            />
          ) : (
            <span
              className="inline-block text-7xl font-medium text-foreground md:text-7xl"
              style={{ minWidth: "1.2em", height: "1.2em" }}
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
