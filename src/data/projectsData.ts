/**
 * Projects section content
 * Data loaded from projects.json for easy editing
 */

import projectsJson from "./projects.json";

export type ProjectItem = {
  image?: string;
  images?: string[];
  title: string;
  content: string;
  tags?: string[];
  badges?: string[];
  links?: Array<{ icon: string; url: string }>;
};

export const PROJECTS_TITLE = projectsJson.title;
export const PROJECTS_ITEMS: ProjectItem[] = projectsJson.items as ProjectItem[];
