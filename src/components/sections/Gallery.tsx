"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppleHelloGalleryEffect } from "@/components/ui/apple-hello-effect";
import { Marquee3D, type Marquee3DImage } from "@/components/ui/Marquee3D";
import { GALLERY_SECTION_SUBTITLE, type GalleryItem } from "@/data/galleryData";
import { Card3D } from "@/components/ui/Card3D";
import { X, ExternalLink } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

interface GalleryProps {
  items: GalleryItem[];
}

const Gallery = ({ items }: GalleryProps) => {
  const [activeImage, setActiveImage] = useState<Marquee3DImage | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setColumns(w < 640 ? 2 : w < 1024 ? 3 : 4);
    };
    const onResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(update, 100);
    };
    update();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  useOnClickOutside(modalRef as React.RefObject<HTMLElement>, () => setActiveImage(null));
  useScrollLock(!!activeImage);

  useEffect(() => {
    if (!activeImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeImage]);

  const allTags = Array.from(new Set(items.flatMap((item) => item.tags ?? []))).sort();

  const filteredItems =
    activeTag === null ? items : items.filter((item) => item.tags?.includes(activeTag));

  const marqueeImages: Marquee3DImage[] = filteredItems
    .filter((item) => item.image)
    .map((item) => ({
      id: item.id,
      src: item.image!,
      alt: item.title ?? item.id,
      title: item.title,
      description: item.description,
      href: item.href,
    }));

  return (
    <section id="gallery" className="relative min-h-screen w-full">
      <div
        data-section-id="gallery"
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      />
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloGalleryEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            {GALLERY_SECTION_SUBTITLE}
          </p>
        </header>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                activeTag === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium transition-colors",
                  activeTag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {marqueeImages.length > 0 ? (
          <Marquee3D
            images={marqueeImages}
            columns={columns}
            tilt={55}
            className="min-h-[400px]"
            onImageClick={setActiveImage}
          />
        ) : (
          <p className="text-center text-muted-foreground py-16">
            No gallery items yet — add items to ~/repos/Obsidian/gallery/ and run sync-full.sh.
          </p>
        )}

        <AnimatePresence>
          {activeImage && (
            <motion.div
              key="gallery-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto p-4"
            >
              <div className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg" />
              <Card3D
                active={true}
                maxTilt={8}
                className="relative z-[60] my-auto h-fit w-full max-w-[var(--content-max)] flex-shrink-0 px-4"
              >
                <motion.div
                  ref={modalRef}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: { duration: 0.2 },
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="relative rounded-3xl bg-card p-6 pt-16 md:p-8 md:pt-16 border shadow-xl"
                >
                  <button
                    type="button"
                    className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    onClick={() => setActiveImage(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex items-center justify-center overflow-hidden rounded-2xl mb-4 bg-muted/30">
                    <img
                      src={activeImage.src}
                      alt={activeImage.alt ?? activeImage.id}
                      className="w-auto h-auto max-w-full max-h-[60vh] md:max-h-[70vh] object-contain"
                    />
                  </div>
                  {activeImage.title && (
                    <h3 className="text-xl font-semibold mb-1">{activeImage.title}</h3>
                  )}
                  {activeImage.description && (
                    <p className="text-sm text-muted-foreground mb-3">{activeImage.description}</p>
                  )}
                  {activeImage.href && (
                    <a
                      href={activeImage.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline min-h-[44px]"
                    >
                      View link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </motion.div>
              </Card3D>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Gallery;
