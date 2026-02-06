"use client";

import { motion, type Transition } from "framer-motion";
import type * as React from "react";
import { cn } from "@/lib/utils";

type GradientTextProps = React.ComponentProps<"span"> & {
  text: string;
  /** Full CSS gradient (e.g. spectrum of colors). Ignored if `color` is set. */
  gradient?: string;
  /** Single color mode: uses a gradient from this color (solid look, still animates). */
  color?: string;
  neon?: boolean;
  transition?: Transition;
};

const DEFAULT_SPECTRUM =
  "linear-gradient(90deg, #3b82f6 0%, #a855f7 20%, #ec4899 50%, #a855f7 80%, #3b82f6 100%)";

function GradientText({
  text,
  className,
  gradient = DEFAULT_SPECTRUM,
  color,
  neon = false,
  transition = {
    duration: 3,
    repeat: Number.POSITIVE_INFINITY,
    ease: "linear",
  },
  ...props
}: GradientTextProps) {
  const gradientValue =
    color != null
      ? `linear-gradient(90deg, ${color} 0%, ${color} 100%)`
      : gradient;
  const baseStyle: React.CSSProperties = {
    backgroundImage: gradientValue,
  };

  return (
    <span
      className={cn("relative inline-block", className)}
      data-slot="gradient-text"
      {...(props as any)}
    >
      <motion.span
        animate={{ backgroundPositionX: ["0%", "200%"] }}
        className="m-0 text-transparent bg-clip-text bg-[length:200%_100%]"
        style={baseStyle}
        transition={transition}
      >
        {text}
      </motion.span>

      {neon && (
        <motion.span
          animate={{ backgroundPositionX: ["0%", "200%"] }}
          className="m-0 absolute top-0 left-0 text-transparent bg-clip-text blur-[8px] mix-blend-plus-lighter bg-[length:200%_100%]"
          style={baseStyle}
          transition={transition}
        >
          {text}
        </motion.span>
      )}
    </span>
  );
}

export { GradientText, type GradientTextProps };
export default GradientText;
