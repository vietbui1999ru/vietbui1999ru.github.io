/**
 * Experience section content
 * Data loaded from experience.json for easy editing
 */

import experienceJson from "./experience.json";

export const EXPERIENCE_SECTION_SUBTITLE = "Where I've worked and what I've built.";

export type ExperienceTag = {
  name: string;
  url?: string;
  tooltip?: string;
};

export type ExperienceJob = {
  name: string;
  date: string;
  content: string;
  info?: { content: string };
  tags?: ExperienceTag[];
};

// jobs entries can be nested companies (recursive) — matches actual experience.json structure
export type ExperienceCompany = {
  company: string;
  companyUrl: string;
  jobs: Array<ExperienceJob | ExperienceCompany>;
};

export const EXPERIENCE_ITEMS: ExperienceCompany[] = experienceJson.items;
