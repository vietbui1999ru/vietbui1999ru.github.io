"use client";

import {
  type HTMLMotionProps,
  motion,
  type Transition,
  type UseInViewOptions,
  useInView,
} from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

type HighlightTextProps = HTMLMotionProps<"span"> & {
  text: string;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  inViewOnce?: boolean;
  transition?: Transition;
};

function HighlightText({
  ref,
  text,
  className,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  transition = { duration: 2, ease: "easeInOut" },
  ...props
}: HighlightTextProps) {
  const localRef = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(
    ref as any,
    () => localRef.current as HTMLSpanElement,
  );

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  return (
    <motion.span
      animate={isInView ? { backgroundSize: "100% 100%" } : undefined}
      className={cn(
        "relative inline-block px-2 py-1 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-500 dark:to-purple-500",
        className,
      )}
      data-slot="highlight-text"
      initial={{
        backgroundSize: "0% 100%",
      }}
      ref={localRef}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
      }}
      transition={transition}
      {...(props as any)}
    >
      {text}
    </motion.span>
  );
}

export { HighlightText, type HighlightTextProps };
export default HighlightText;
