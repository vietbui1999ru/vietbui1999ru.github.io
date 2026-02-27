"use client";

import { cn } from "@/lib/utils";
import type React from "react";

export interface Marquee3DImage {
  id: string;
  src: string;
  alt?: string;
  title?: string;
  description?: string;
  href?: string;
}

export interface Marquee3DProps {
  images: Marquee3DImage[];
  /** Number of columns (default 4) */
  columns?: number;
  /** Isometric tilt in degrees (default 55) */
  tilt?: number;
  className?: string;
  /** Called when an image tile is clicked */
  onImageClick?: (image: Marquee3DImage) => void;
}

export function Marquee3D({
  images,
  columns = 4,
  tilt = 55,
  className,
  onImageClick,
}: Marquee3DProps) {
  if (images.length === 0) return null;

  const imagesPerColumn = Math.ceil(images.length / columns);
  const columnGroups: Marquee3DImage[][] = [];

  for (let c = 0; c < columns; c++) {
    const start = c * imagesPerColumn;
    const end = Math.min(start + imagesPerColumn, images.length);
    const colImages: Marquee3DImage[] = [];
    for (let i = start; i < end; i++) {
      colImages.push(images[i]);
    }
    if (colImages.length > 0) {
      columnGroups.push(colImages);
    }
  }

  return (
    <div
      className={cn("relative w-full overflow-hidden py-16", className)}
      style={{ perspective: "1200px" }}
    >
      <div
        className="flex gap-6 md:gap-8 justify-center items-start"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt}deg)`,
        }}
      >
        {columnGroups.map((colImages, colIndex) => (
          <div
            key={colIndex}
            className="h-64 md:h-80 overflow-hidden shrink-0"
          >
            <div
              className="flex flex-col gap-4 shrink-0"
              style={{
                animation: `marquee3d-${
                  colIndex % 2 === 0 ? "down" : "up"
                } 20s linear infinite`,
              }}
            >
              {[...colImages, ...colImages].map((img, i) => (
                <div
                  key={`${img.id}-${i}`}
                  className="group relative overflow-hidden rounded-xl shrink-0 aspect-square w-32 md:w-40 lg:w-48 transition-transform duration-300 hover:scale-105 hover:z-10 cursor-pointer"
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => onImageClick?.(img)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onImageClick?.(img);
                    }
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt ?? img.id}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee3d-down {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marquee3d-up {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
