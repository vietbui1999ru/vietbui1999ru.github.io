/**
 * Projects section content
 * Data loaded from projects.json for easy editing
 */

import projectsJson from "./projects.json";

export type ProjectItem = {
  /**
   * Single primary image URL for the card/modal.
   * For multiple screenshots, prefer the `images` array instead.
   */
  image?: string;
  /**
   * Optional list of additional screenshots for the project modal.
   * If present, this takes precedence over `image` for the gallery.
   */
  images?: string[];
  title: string;
  content: string;
  badges?: string[];
  links?: Array<{ icon: string; url: string }>;
};

export const PROJECTS_TITLE = projectsJson.title;
export const PROJECTS_ITEMS: ProjectItem[] =
  projectsJson.items as ProjectItem[];
