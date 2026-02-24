/**
 * Gallery section content
 */

export const GALLERY_SECTION_TITLE = "Gallery";
export const GALLERY_SECTION_SUBTITLE = "Photos and visual projects.";

export type GalleryItem = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  href?: string;
};

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "1",
    title: "Placeholder 1",
    description: "Add images and metadata via YAML later.",
    image: undefined,
  },
  {
    id: "2",
    title: "Placeholder 2",
    description: "Gallery grid ready for content.",
    image: undefined,
  },
  {
    id: "3",
    title: "Placeholder 3",
    description: "Parse from config or CMS.",
    image: undefined,
  },
];
