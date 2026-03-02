/**
 * Experience section content
 * Data loaded from experience.json for easy editing
 */

import experienceJson from "./experience.json";

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

export type ExperienceCompany = {
  company: string;
  companyUrl: string;
  jobs: ExperienceJob[];
};

export const EXPERIENCE_ITEMS: ExperienceCompany[] =
  experienceJson.items as ExperienceCompany[];
