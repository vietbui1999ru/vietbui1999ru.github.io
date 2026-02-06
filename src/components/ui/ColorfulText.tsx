"use client";

import { motion } from "framer-motion";
import * as React from "react";

type ColourfulTextProps = Omit<React.ComponentProps<"span">, "children"> & {
  text: string;
  interval?: number;
  colors?: string[];
  animationDuration?: number;
  staggerDelay?: number;
};

const defaultColors = [
  "rgb(131, 179, 32)",
  "rgb(47, 195, 106)",
  "rgb(42, 169, 210)",
  "rgb(4, 112, 202)",
  "rgb(107, 10, 255)",
  "rgb(183, 0, 218)",
  "rgb(218, 0, 171)",
  "rgb(230, 64, 92)",
  "rgb(232, 98, 63)",
  "rgb(249, 129, 47)",
];

function ColourfulText({
  ref,
  text,
  interval = 5000,
  colors = defaultColors,
  animationDuration = 0.5,
  staggerDelay = 0.05,
  ...props
}: ColourfulTextProps) {
  const localRef = React.useRef<HTMLSpanElement>(null);
  React.useImperativeHandle(
    ref as any,
    () => localRef.current as HTMLSpanElement,
  );

  const [currentColors, setCurrentColors] = React.useState(colors);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      const shuffled = [...colors].sort(() => Math.random() - 0.5);
      setCurrentColors(shuffled);
      setCount((prev) => prev + 1);
    }, interval);

    return () => clearInterval(intervalId);
  }, [colors, interval]);

  const characters = React.useMemo(() => text.split(""), [text]);

  return (
    <span data-slot="colourful-text" ref={localRef} {...(props as any)}>
      {characters.map((char, index) => (
        <motion.span
          animate={{
            color: currentColors[index % currentColors.length],
            y: [0, -3, 0],
            scale: [1, 1.01, 1],
            filter: ["blur(0px)", "blur(5px)", "blur(0px)"],
            opacity: [1, 0.8, 1],
          }}
          className="inline-block whitespace-pre font-sans tracking-tight will-change-transform will-change-opacity will-change-filter"
          initial={{ y: 0 }}
          key={`${char}-${count}-${index}`}
          transition={{
            duration: animationDuration,
            delay: index * staggerDelay,
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export { ColourfulText, type ColourfulTextProps };
export default ColourfulText;
