"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HandwritingTextProps {
  /**
   * SVG paths object imported from Figma
   * Example: import svgPaths from "../imports/svg-xxxxx"
   */
  paths: Record<string, string>;

  /**
   * IMPORTANT: Array of path keys IN THE CORRECT ORDER
   * Get this from the original Figma component or by inspecting the svg-xxxxx.ts file
   * Example: ["p2702c700", "p7acc00", "p51c100", ...]
   */
  pathOrder?: string[];

  /** SVG viewBox attribute (get this from the original Figma component) */
  viewBox: string;

  /** Color of the handwriting (default: white) */
  color?: string;

  /** Duration for each letter animation in seconds (default: 0.8) */
  duration?: number;

  /** Delay between each letter in seconds (default: 0.1) */
  stagger?: number;

  /** Stroke width during animation (default: 0.5) */
  strokeWidth?: number;

  /** Whether to auto-play on mount (default: true) */
  autoPlay?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export default function HandwritingText({
  paths,
  pathOrder,
  viewBox,
  color = "white",
  duration = 0.8,
  stagger = 0.1,
  strokeWidth = 0.5,
  autoPlay = true,
  className = "",
}: HandwritingTextProps) {
  const order = React.useMemo(
    () => (pathOrder ?? Object.keys(paths)).reverse(),
    [pathOrder, paths],
  );

  return (
    <div className={cn("relative", className)}>
      <svg
        className="w-full h-auto"
        fill="none"
        viewBox={viewBox}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
      >
        <g>
          {order.map((pathKey, index) => (
            <motion.path
              key={pathKey}
              d={paths[pathKey]}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{
                pathLength: autoPlay ? 0 : 1,
                opacity: autoPlay ? 0 : 1,
              }}
              animate={{
                pathLength: 1,
                opacity: 1,
                fill: color,
              }}
              transition={{
                pathLength: {
                  duration: duration,
                  delay: index * stagger,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: 0.3,
                  delay: index * stagger,
                },
                fill: {
                  duration: 0.3,
                  delay: index * stagger + duration * 0.75,
                },
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
