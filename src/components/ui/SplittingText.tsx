"use client";

import {
  type HTMLMotionProps,
  motion,
  type TargetAndTransition,
  type UseInViewOptions,
  useInView,
  type Variants,
} from "framer-motion";
import * as React from "react";

const WORD_TOKEN_PATTERN = /\S+\s*/g;

/** LTR = reveal in reading order (first→last), slide from page left. RTL = reveal from end→start, slide from page right. */
export type SplittingTextDirection = "ltr" | "rtl";

type DefaultSplittingTextProps = {
  motionVariants?: {
    initial?: Record<string, any>;
    animate?: Record<string, any>;
    transition?: Record<string, any>;
    stagger?: number;
  };
  /** LTR = left-to-right reading order; RTL = right-to-left (end of text → beginning). */
  direction?: SplittingTextDirection;
  /** Horizontal slide distance in px (hidden position). */
  slideOffset?: number;
  inView?: boolean;
  inViewMargin?: UseInViewOptions["margin"];
  inViewOnce?: boolean;
  delay?: number;
} & HTMLMotionProps<"div">;

type CharsOrWordsSplittingTextProps = DefaultSplittingTextProps & {
  type?: "chars" | "words";
  text: string;
};

type LinesSplittingTextProps = DefaultSplittingTextProps & {
  type: "lines";
  text: string[];
};

type SplittingTextProps =
  | CharsOrWordsSplittingTextProps
  | LinesSplittingTextProps;

const DEFAULT_SLIDE_OFFSET = 80;

export const SplittingText: React.FC<SplittingTextProps> = ({
  ref,
  text,
  type = "chars",
  motionVariants = {},
  direction = "ltr",
  slideOffset = DEFAULT_SLIDE_OFFSET,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  delay = 0,
  ...props
}) => {
  const items = React.useMemo<React.ReactNode[]>(() => {
    if (Array.isArray(text)) {
      return text.flatMap((line, i) => [
        <React.Fragment key={`line-${i}`}>{line}</React.Fragment>,
        i < text.length - 1 ? <br key={`br-${i}`} /> : null,
      ]);
    }

    if (type === "words") {
      const tokens = text.match(WORD_TOKEN_PATTERN) || [];
      return tokens.map((token, i) => (
        <React.Fragment key={i}>{token}</React.Fragment>
      ));
    }

    return text
      .split("")
      .map((char, i) => <React.Fragment key={i}>{char}</React.Fragment>);
  }, [text, type]);

  const stagger =
    motionVariants.stagger ??
    (type === "chars" ? 0.05 : type === "words" ? 0.2 : 0.3);
  const total = React.useMemo(() => {
    if (Array.isArray(text)) return text.length;
    if (type === "words") return (text.match(WORD_TOKEN_PATTERN) || []).length;
    return (text as string).length;
  }, [text, type]);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay / 1000,
        staggerChildren: 0,
        staggerDirection: 1,
      },
    },
  };

  const getItemVariants = (custom: {
    contentIndex: number;
    total: number;
    direction: SplittingTextDirection;
    slideOffset: number;
    stagger: number;
  }): Variants => {
    const xHidden =
      custom.direction === "rtl" ? custom.slideOffset : -custom.slideOffset;
    const childDelay =
      custom.direction === "rtl"
        ? (custom.total - 1 - custom.contentIndex) * custom.stagger
        : custom.contentIndex * custom.stagger;
    return {
      hidden: {
        x: xHidden,
        opacity: 0,
        ...(motionVariants.initial || {}),
      },
      visible: {
        x: 0,
        opacity: 1,
        ...(motionVariants.animate || {}),
        transition: {
          duration: 0.7,
          ease: "easeOut",
          delay: childDelay,
          ...(motionVariants.transition || {}),
        },
      },
    };
  };

  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(
    ref as any,
    () => localRef.current as HTMLDivElement,
  );

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;

  return (
    <motion.span
      animate={isInView ? "visible" : "hidden"}
      initial="hidden"
      ref={localRef}
      variants={containerVariants}
      {...(props as any)}
    >
      {items.map(
        (item, index) =>
          item && (
            <React.Fragment key={index}>
              <motion.span
                key={index}
                custom={{
                  contentIndex:
                    type === "lines" ? Math.floor(index / 2) : index,
                  total,
                  direction,
                  slideOffset,
                  stagger,
                }}
                style={{
                  display: "inline-block",
                  whiteSpace:
                    type === "chars"
                      ? "pre"
                      : Array.isArray(text)
                        ? "normal"
                        : "normal",
                }}
                variants={getItemVariants as unknown as Variants}
              >
                {item}
              </motion.span>
              {type === "words" && " "}
            </React.Fragment>
          ),
      )}
    </motion.span>
  );
};

export default SplittingText;
