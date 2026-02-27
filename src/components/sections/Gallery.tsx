"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Marquee3D, type Marquee3DImage } from "@/components/ui/Marquee3D";
import {
  GALLERY_SECTION_TITLE,
  GALLERY_SECTION_SUBTITLE,
  GALLERY_ITEMS,
} from "@/data/galleryData";
import { Card3D } from "@/components/ui/Card3D";
import { X, ExternalLink } from "lucide-react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

const Gallery = () => {
  const [activeImage, setActiveImage] = useState<Marquee3DImage | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(modalRef as React.RefObject<HTMLElement>, () =>
    setActiveImage(null),
  );

  useEffect(() => {
    if (!activeImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveImage(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage]);

  const marqueeImages: Marquee3DImage[] = GALLERY_ITEMS.filter(
    (item) => item.image,
  ).map((item) => ({
    id: item.id,
    src: item.image!,
    alt: item.title ?? item.id,
    title: item.title,
    description: item.description,
    href: item.href,
  }));

  return (
    <section id="gallery" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          title={GALLERY_SECTION_TITLE}
          subtitle={GALLERY_SECTION_SUBTITLE}
          className="mb-12"
        />

        {marqueeImages.length > 0 ? (
          <Marquee3D
            images={marqueeImages}
            columns={4}
            tilt={55}
            className="min-h-[400px]"
            onImageClick={setActiveImage}
          />
        ) : (
          <p className="text-center text-muted-foreground py-16">
            Add images to galleryData.ts to see the 3D marquee.
          </p>
        )}

        <AnimatePresence>
          {activeImage && (
            <div className="fixed inset-0 z-50 h-screen overflow-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
              />
              <Card3D
                active={true}
                maxTilt={8}
                className="relative z-[60] mx-auto my-10 h-fit max-w-3xl px-4"
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
                  className="rounded-3xl bg-card p-6 md:p-8 border shadow-xl"
                >
                  <button
                    type="button"
                    className="sticky top-4 right-0 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4"
                    onClick={() => setActiveImage(null)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="overflow-hidden rounded-2xl mb-4">
                    <img
                      src={activeImage.src}
                      alt={activeImage.alt ?? activeImage.id}
                      className="w-full h-full max-h-[400px] object-cover"
                    />
                  </div>
                  {activeImage.title && (
                    <h3 className="text-xl font-semibold mb-1">
                      {activeImage.title}
                    </h3>
                  )}
                  {activeImage.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {activeImage.description}
                    </p>
                  )}
                  {activeImage.href && (
                    <a
                      href={activeImage.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </motion.div>
              </Card3D>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Gallery;
