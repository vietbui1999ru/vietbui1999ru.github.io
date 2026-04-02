/**
 * Gallery section content
 * Data loaded from gallery.json for easy editing
 */

import achievementLocal from "@/assets/images/gallery/achievement.png";
import galleryJson from "./gallery.json";

/** Legacy public/ paths → bundled src URLs (add entries when moving more local images). */
const LOCAL_GALLERY_IMAGE_MAP: Record<string, string> = {
  "/images/achievement.jpg": achievementLocal.src,
};

export const GALLERY_SECTION_TITLE = galleryJson.title;
export const GALLERY_SECTION_SUBTITLE = galleryJson.subtitle;

export type GalleryItem = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  href?: string;
};

export const GALLERY_ITEMS: GalleryItem[] = (galleryJson.items as GalleryItem[]).map(
  (item) => ({
    ...item,
    image:
      item.image != null
        ? (LOCAL_GALLERY_IMAGE_MAP[item.image] ?? item.image)
        : undefined,
  }),
);
