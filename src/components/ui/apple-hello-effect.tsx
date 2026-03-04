"use client";

import * as React from "react";
import { easeInOut, motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

import aboutMePaths from "@/imports/aboutme";
import contactMePaths from "@/imports/contactme";
import myBlogPaths from "@/imports/myblog";
import myEducationPaths from "@/imports/education";
import myGalleryPaths from "@/imports/mygallery";
import myWorkExperiencesPaths from "@/imports/workexperience";
import whatIveBeenWorkingOnPaths from "@/imports/myprojects";

type SvgPaths = Record<string, string>;

type HandwritingProps = {
  className?: string;
  svgClassName?: string;
  onAnimationComplete?: () => void;
  amount?: number;
  strokeWidth?: number;
  durationPerPathSec?: number;
  staggerSec?: number;
  fillDelaySec?: number;
};

type InViewHandwritingAnimationProps = HandwritingProps & {
  paths: SvgPaths;
  viewBox: string;
  label: string;
};

function InViewHandwritingAnimation({
  className,
  svgClassName,
  onAnimationComplete,
  amount = 0.6,
  strokeWidth = 0.5,
  durationPerPathSec = 0.8,
  staggerSec = 0.1,
  fillDelaySec = 0.6,
  paths,
  viewBox,
  label,
}: InViewHandwritingAnimationProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    amount,
    once: false,
    margin: "-10% 0px -10% 0px",
  });

  const [cycle, setCycle] = React.useState(0);
  React.useEffect(() => {
    if (inView) setCycle((c) => c + 1);
  }, [inView]);

  const entries = React.useMemo(() => Object.entries(paths).reverse(), [paths]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full max-w-xs sm:max-w-md md:max-w-2xl mx-auto flex justify-center",
        className,
      )}
      data-name={label}
    >
      <svg
        key={cycle}
        className={cn(
          "h-12 w-auto shrink-0 text-foreground sm:h-16 md:h-24",
          svgClassName,
        )}
        fill="none"
        viewBox={viewBox}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
        role="img"
        aria-label={label}
      >
        <g>
          {entries.map(([key, d], index) => {
            const show = inView;
            const transition = show
              ? {
                  pathLength: {
                    duration: durationPerPathSec,
                    delay: index * staggerSec,
                    ease: easeInOut,
                  },
                  opacity: { duration: 0.25, delay: index * staggerSec },
                  fill: {
                    duration: 0.25,
                    delay: index * staggerSec + fillDelaySec,
                  },
                }
              : {
                  pathLength: { duration: 0.12, delay: 0 },
                  opacity: { duration: 0.12, delay: 0 },
                  fill: { duration: 0.12, delay: 0 },
                };

            return (
              <motion.path
                key={key}
                d={d}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0, fill: "transparent" }}
                animate={
                  show
                    ? { pathLength: 1, opacity: 1, fill: "currentColor" }
                    : { pathLength: 0, opacity: 0, fill: "transparent" }
                }
                transition={transition}
                onAnimationComplete={
                  index === entries.length - 1 && inView
                    ? onAnimationComplete
                    : undefined
                }
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function AppleHelloMyWorkEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={whatIveBeenWorkingOnPaths}
      label="What I've been working on"
      viewBox="0 0 259 38"
    />
  );
}

function AppleHelloAboutMeEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={aboutMePaths}
      label="About me"
      viewBox="0 0 188 31"
    />
  );
}

function AppleHelloContactEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={contactMePaths}
      label="Contact"
      viewBox="0 0 235 29"
    />
  );
}

function AppleHelloBlogEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={myBlogPaths}
      label="Blog"
      viewBox="0 0 164 39"
    />
  );
}

function AppleHelloEducationEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={myEducationPaths}
      label="Education"
      viewBox="0 0 283 38"
    />
  );
}

function AppleHelloGalleryEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={myGalleryPaths}
      label="Gallery"
      viewBox="0 0 236 38"
    />
  );
}

function AppleHelloExperienceEffect(props: HandwritingProps) {
  return (
    <InViewHandwritingAnimation
      {...props}
      paths={myWorkExperiencesPaths}
      label="Experience"
      viewBox="0 0 427 38"
    />
  );
}

export {
  AppleHelloAboutMeEffect,
  AppleHelloMyWorkEffect,
  AppleHelloContactEffect,
  AppleHelloBlogEffect,
  AppleHelloEducationEffect,
  AppleHelloGalleryEffect,
  AppleHelloExperienceEffect,
};
