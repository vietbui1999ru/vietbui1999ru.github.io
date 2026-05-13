export const GALLERY_SECTION_SUBTITLE = "Photos and visual projects.";

export type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  /** Resolved public URL (e.g. /gallery-assets/image.jpg). Undefined if no image. */
  image?: string;
  href?: string;
  tags?: string[];
  order: number;
};
