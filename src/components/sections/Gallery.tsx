"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ImageIcon } from "lucide-react";
import {
  GALLERY_SECTION_TITLE,
  GALLERY_SECTION_SUBTITLE,
  GALLERY_ITEMS,
} from "@/data/galleryData";

const Gallery = () => {
  return (
    <section id="gallery" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          title={GALLERY_SECTION_TITLE}
          subtitle={GALLERY_SECTION_SUBTITLE}
          className="mb-12"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_ITEMS.map((item) => (
            <Card key={item.id} className="overflow-hidden group">
              <div className="aspect-square w-full overflow-hidden bg-muted/50 flex items-center justify-center">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title ?? item.id}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <ImageIcon className="size-16 text-muted-foreground/40" />
                )}
              </div>
              {(item.title || item.description) && (
                <CardHeader className="py-3">
                  {item.title && (
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  )}
                  {item.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
