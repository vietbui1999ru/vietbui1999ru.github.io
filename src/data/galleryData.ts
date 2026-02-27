/**
 * Gallery section content
 * Data loaded from gallery.json for easy editing
 */

import galleryJson from "./gallery.json";

export const GALLERY_SECTION_TITLE = galleryJson.title;
export const GALLERY_SECTION_SUBTITLE = galleryJson.subtitle;

export type GalleryItem = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  href?: string;
};

export const GALLERY_ITEMS: GalleryItem[] = galleryJson.items as GalleryItem[];
