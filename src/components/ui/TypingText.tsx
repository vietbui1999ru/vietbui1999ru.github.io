"use client";

import { gsap } from "gsap";
import {
  createElement,
  type ElementType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ColourfulText, {
  type ColourfulTextProps,
} from "@/components/ui/ColorfulText";

interface TypingTextProps {
  className?: string;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: string | React.ReactNode;
  cursorBlinkDuration?: number;
  cursorClassName?: string;
  text: string | string[];
  as?: ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  onSentenceComplete?: (sentence: string, index: number) => void;
  startOnVisible?: boolean;
  reverseMode?: boolean;
  /** Words to render with ColourfulText or HighlightComponent (exact match, case-sensitive). */
  highlightWords?: string[];
  /**
   * Props passed to ColourfulText for highlighted words (ignored if HighlightComponent is set).
   * @see ColourfulTextProps: interval, colors, animationDuration, staggerDelay, + any span props (className, etc.)
   */
  highlightProps?: Omit<ColourfulTextProps, "text">;
  /** Optional custom component for highlighted words (e.g. HighlightText). Receives { text: string } + highlightComponentProps. */
  HighlightComponent?: React.ComponentType<{ text: string }>;
  /** Props spread onto HighlightComponent when rendering highlighted words (e.g. className, transition, inView for HighlightText). */
  highlightComponentProps?: Record<string, unknown>;
  /** Optional component for non-highlighted segments (e.g. GradientText for neon line). Receives { text: string } + defaultSegmentProps. */
  DefaultSegmentComponent?: React.ComponentType<{ text: string }>;
  /** Props spread onto DefaultSegmentComponent when rendering non-highlighted segments. */
  defaultSegmentProps?: Record<string, unknown>;
}

const TypingText = ({
  text,
  as: Component = "div",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  highlightWords = [],
  highlightProps,
  HighlightComponent,
  highlightComponentProps,
  DefaultSegmentComponent,
  defaultSegmentProps,
  ...props
}: TypingTextProps & React.HTMLAttributes<HTMLElement>) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  const textArray = useMemo(
    () => (Array.isArray(text) ? text : [text]),
    [text],
  );

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) {
      return typingSpeed;
    }
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const getCurrentTextColor = () => {
    if (textColors.length === 0) {
      return "currentColor";
    }
    return textColors[currentTextIndex % textColors.length];
  };

  useEffect(() => {
    if (!(startOnVisible && containerRef.current)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (showCursor && cursorRef.current) {
      gsap.set(cursorRef.current, { opacity: 1 });
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }
  }, [showCursor, cursorBlinkDuration]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let timeout: NodeJS.Timeout;

    const currentText = textArray[currentTextIndex];
    const processedText = reverseMode
      ? currentText.split("").reverse().join("")
      : currentText;

    const executeTypingAnimation = () => {
      if (isDeleting) {
        if (displayedText === "") {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) {
            return;
          }

          if (onSentenceComplete) {
            onSentenceComplete(textArray[currentTextIndex], currentTextIndex);
          }

          setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          timeout = setTimeout(() => {
            /* intentional pause between sentences */
          }, pauseDuration);
        } else {
          timeout = setTimeout(() => {
            setDisplayedText((prev) => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else if (currentCharIndex < processedText.length) {
        timeout = setTimeout(
          () => {
            setDisplayedText((prev) => prev + processedText[currentCharIndex]);
            setCurrentCharIndex((prev) => prev + 1);
          },
          variableSpeed ? getRandomSpeed() : typingSpeed,
        );
      } else if (textArray.length > 1) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === "") {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }

    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete,
    getRandomSpeed,
  ]);

  const shouldHideCursor =
    hideCursorWhileTyping &&
    (currentCharIndex < textArray[currentTextIndex].length || isDeleting);

  const textContent = useMemo(() => {
    const baseColor = getCurrentTextColor();
    const segments = displayedText.split(/(\W+|\w+)/).filter(Boolean);
    const highlightSet = new Set(highlightWords);

    if (highlightWords.length === 0) {
      if (DefaultSegmentComponent) {
        return (
          <DefaultSegmentComponent
            text={displayedText}
            {...defaultSegmentProps}
          />
        );
      }
      return (
        <span className="inline" style={{ color: baseColor }}>
          {displayedText}
        </span>
      );
    }

    return (
      <span className="inline" style={{ color: baseColor }}>
        {segments.map((segment, i) =>
          highlightSet.has(segment) ? (
            HighlightComponent ? (
              <HighlightComponent
                key={`${i}-${segment}`}
                text={segment}
                {...highlightComponentProps}
              />
            ) : (
              <ColourfulText
                key={`${i}-${segment}`}
                text={segment}
                {...highlightProps}
              />
            )
          ) : DefaultSegmentComponent ? (
            <DefaultSegmentComponent
              key={`${i}-${segment}`}
              text={segment}
              {...defaultSegmentProps}
            />
          ) : (
            <span key={`${i}-${segment}`}>{segment}</span>
          ),
        )}
      </span>
    );
  }, [
    displayedText,
    highlightWords,
    highlightProps,
    HighlightComponent,
    highlightComponentProps,
    DefaultSegmentComponent,
    defaultSegmentProps,
    currentTextIndex,
    textColors,
  ]);

  return createElement(
    Component,
    {
      ref: containerRef,
      className: `inline-block whitespace-pre-wrap tracking-tight ${className}`,
      ...props,
    },
    textContent,
    showCursor && (
      <span
        className={`inline-block opacity-100 ${shouldHideCursor ? "hidden" : ""} ${cursorCharacter === "|"
            ? `h-5 w-[1px] translate-y-1 bg-foreground ${cursorClassName}`
            : `ml-1 ${cursorClassName}`
          }`}
        ref={cursorRef}
      >
        {cursorCharacter === "|" ? "" : cursorCharacter}
      </span>
    ),
  );
};

export default TypingText;
