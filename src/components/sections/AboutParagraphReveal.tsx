"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";
import { TShapedEngineerTooltip } from "@/components/ui/t-shaped-engineer-tooltip";

function useViewportSlideScale(basePx: number): number {
  const [slidePx, setSlidePx] = React.useState(basePx);
  React.useEffect(() => {
    const update = () =>
      setSlidePx(
        Math.round((basePx / 800) * Math.min(window.innerWidth, 1920)),
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [basePx]);
  return slidePx;
}

const WORD_TOKEN_PATTERN = /\S+\s*/g;

export type RevealDirection = "ltr" | "rtl";

export type AboutParagraphRevealConfig = {
  scrollOffsetStart?: number;
  scrollOffsetEnd?: number;
  /** Viewport fraction (0–1) where progress = 1. E.g. 0.1 = reveal complete when element start is 10% from top. Overrides scrollOffsetEnd for container position when set. */
  containerEnd?: number;
  slideOffset?: number;
  staggerPerWord?: number;
  revealSpan?: number;
};

// To make all words/paragraphs reveal at ~30-40% of scroll, set scrollOffsetEnd to 0.6 (i.e., 60% down is already fully revealed)
const defaultConfig: Required<
  Omit<AboutParagraphRevealConfig, "containerEnd">
> & {
  containerEnd?: number;
} = {
  scrollOffsetStart: 0,
  scrollOffsetEnd: 0.2,
  slideOffset: 40,
  staggerPerWord: 0.1,
  revealSpan: 0.12,
};

type AboutParagraphRevealProps = AboutParagraphRevealConfig & {
  text: string;
  direction: RevealDirection;
  gradient?: string;
  className?: string;
  type?: "words" | "chars";
};

export function AboutParagraphReveal({
  text,
  direction,
  gradient = "linear-gradient(90deg, var(--primary), var(--accent))",
  className,
  type = "words",
  scrollOffsetStart = defaultConfig.scrollOffsetStart,
  scrollOffsetEnd = defaultConfig.scrollOffsetEnd,
  containerEnd,
  slideOffset = defaultConfig.slideOffset,
  staggerPerWord = defaultConfig.staggerPerWord,
  revealSpan = defaultConfig.revealSpan,
}: AboutParagraphRevealProps) {
  const ref = React.useRef<HTMLParagraphElement>(null);

  const slidePx = useViewportSlideScale(slideOffset);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset:
      containerEnd != null
        ? (["start end", `start ${containerEnd}`] as const)
        : ([
            `${scrollOffsetStart * 100}% end`,
            `${scrollOffsetEnd * 100}% start`,
          ] as const),
  });

  const tokens = React.useMemo(() => {
    if (type === "words") {
      return (text.match(WORD_TOKEN_PATTERN) ?? []) as string[];
    }
    return text.split("");
  }, [text, type]);

  return (
    <p
      ref={ref}
      className={cn("text-xl sm:text-2xl leading-relaxed font-mono", className)}
      style={{
        backgroundImage: gradient,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        backgroundSize: "100% 100%",
      }}
    >
      {tokens.map((token, i) => (
        <AboutParagraphRevealWord
          key={i}
          index={i}
          total={tokens.length}
          token={token}
          scrollYProgress={scrollYProgress}
          direction={direction}
          slideOffset={slidePx}
          staggerPerWord={staggerPerWord}
          revealSpan={revealSpan}
          type={type}
        />
      ))}
    </p>
  );
}

type AboutParagraphRevealWordProps = {
  index: number;
  total: number;
  token: string;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  direction: RevealDirection;
  slideOffset: number;
  staggerPerWord: number;
  revealSpan: number;
  type: "words" | "chars";
};

function AboutParagraphRevealWord({
  index,
  total,
  token,
  scrollYProgress,
  direction,
  slideOffset,
  staggerPerWord,
  revealSpan,
  type,
}: AboutParagraphRevealWordProps) {
  const contentIndex = direction === "rtl" ? total - 1 - index : index;
  const start = contentIndex * staggerPerWord;
  const end = start + revealSpan;

  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const xStart = direction === "rtl" ? slideOffset : -slideOffset;
  // This line creates a spring/animated value 'x' that animates the horizontal offset of the word/chunk
  // as the user scrolls. It transitions from xStart (either left or right by slideOffset px, depending on direction) to 0.
  // The animation progress is controlled by scrollYProgress, from 'start' to 'end' (the reveal window for this token).
  const x = useTransform(scrollYProgress, [start, end], [xStart, 0]);

  const isTShapedWord = type === "words" && token.trim() === "T-shaped";

  return (
    <motion.span
      style={{
        display: "inline-block",
        whiteSpace: type === "chars" ? "pre" : "normal",
        opacity,
        x,
      }}
    >
      {isTShapedWord ? (
        <TShapedEngineerTooltip>{token.trim()}</TShapedEngineerTooltip>
      ) : (
        token
      )}
      {type === "words" ? "\u00A0" : null}
    </motion.span>
  );
}
