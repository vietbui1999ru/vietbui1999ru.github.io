"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";
import { AnimatePresence, motion } from "framer-motion";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

export interface CarouselProps {
  items: React.ReactNode[];
  initialScroll?: number;
}

export interface Card {
  /** Image URL for the card thumbnail. Optional when `background` is provided. */
  src?: string;
  title: string;
  category: string;
  content: React.ReactNode;
  /** Custom background element (e.g. LavaLampBackground). Takes precedence over `src`. */
  background?: React.ReactNode;
}

export const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }: CarouselProps) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const snapCards = carouselRef.current.querySelectorAll<HTMLElement>(".snap-start");
      const target = snapCards[index + 1] ?? snapCards[index];
      if (target) {
        carouselRef.current.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
      }
      setCurrentIndex(index);
    }
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-contain scroll-smooth py-6 [scrollbar-width:none] md:py-10 snap-x snap-mandatory"
          onScroll={checkScrollability}
          ref={carouselRef}
        >
          <div
            className={cn(
              "absolute right-0 z-[1000] h-auto w-[5%] overflow-hidden bg-gradient-to-l",
            )}
          />

          <div
            className={cn(
              "flex flex-row justify-start gap-4 pl-3 sm:pl-4",
              "mx-auto w-full max-w-[var(--content-max)]",
            )}
          >
            {items.map((item, index) => (
              <motion.div
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: Math.min(0.2 * index, 0.6),
                    ease: "easeOut",
                  },
                }}
                className="rounded-3xl last:pr-[10%] md:last:pr-[33%] snap-start"
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                key={`card${index}`}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex w-full justify-center gap-2">
          <button
            type="button"
            className="relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            disabled={!canScrollLeft}
            onClick={scrollLeft}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="relative z-40 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            disabled={!canScrollRight}
            onClick={scrollRight}
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export interface CardProps {
  card: Card;
  index: number;
  layout?: boolean;
}

export const Card = ({ card, index, layout = false }: CardProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  const handleClose = useCallback(() => {
    setOpen(false);
    onCardClose(index);
  }, [index, onCardClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (open) document.body.style.overflow = prev;
    };
  }, [open, handleClose]);

  useOnClickOutside(containerRef as React.RefObject<HTMLElement>, handleClose);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto p-4">
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <Card3D
              active={open}
              maxTilt={8}
              className="relative z-[60] my-auto h-fit w-full max-w-[var(--content-max)] flex-shrink-0"
            >
              <motion.div
                animate={{ opacity: 1 }}
                className="rounded-3xl bg-card text-card-foreground p-4 font-sans md:p-10"
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, ease: "easeIn" },
                }}
                initial={{ opacity: 0 }}
                layoutId={layout ? `card-${card.title}` : undefined}
                ref={containerRef}
                transition={{
                  layout: { type: "spring", stiffness: 400, damping: 30, mass: 0.8 },
                  opacity: { duration: 0.2, ease: "easeOut" },
                }}
              >
                <button
                  type="button"
                  className="sticky top-4 right-0 ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary"
                  onClick={handleClose}
                >
                  <X className="h-6 w-6 text-primary-foreground" />
                </button>
                <motion.p
                  className="text-base font-medium text-foreground"
                  layoutId={layout ? `category-${card.title}` : undefined}
                >
                  {card.category}
                </motion.p>
                <motion.p
                  className="mt-4 text-2xl font-semibold text-foreground md:text-5xl"
                  layoutId={layout ? `title-${card.title}` : undefined}
                >
                  {card.title}
                </motion.p>
                <div className="py-10">{card.content}</div>
              </motion.div>
            </Card3D>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        className="relative z-10 flex h-52 w-44 flex-col items-start justify-start overflow-hidden rounded-3xl bg-card md:h-64 md:w-56"
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={() => setOpen(true)}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-full bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        <div className="relative z-40 p-4 md:p-6">
          <motion.p
            className="text-left font-sans text-xs font-medium text-white md:text-sm"
            layoutId={layout ? `category-${card.category}` : undefined}
          >
            {card.category}
          </motion.p>
          <motion.p
            className="mt-1 max-w-xs text-left font-sans text-sm font-semibold [text-wrap:balance] text-white md:text-lg"
            layoutId={layout ? `title-${card.title}` : undefined}
          >
            {card.title}
          </motion.p>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10">
          {card.background ? (
            card.background
          ) : card.src ? (
            <BlurImage alt={card.title} className="h-full w-full object-cover" src={card.src} />
          ) : null}
        </div>
      </motion.button>
    </>
  );
};

export interface BlurImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const BlurImage = ({
  height,
  width,
  src,
  className,
  alt,
  ...rest
}: BlurImageProps) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <img
      alt={alt ? alt : "Background of a beautiful view"}
      className={cn(
        "h-full w-full transition duration-300",
        isLoading ? "blur-sm" : "blur-0",
        className,
      )}
      decoding="async"
      height={height}
      loading="lazy"
      onLoad={() => setLoading(false)}
      src={src}
      width={width}
      {...rest}
    />
  );
};
