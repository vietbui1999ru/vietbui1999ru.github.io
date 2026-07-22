export type ProjectStatus = "active" | "shipped" | "archived";

/** Framework-agnostic view model produced from the Astro projects collection. */
export interface ProjectCardData {
  slug: string;
  title: string;
  summary: string;
  date: Date;
  featured: boolean;
  badges?: string[];
  cover?: string;
  images?: string[];
  links?: Array<{ icon: string; url: string }>;
  status: ProjectStatus;
  /** Build-rendered Markdown from the trusted owner-controlled vault. */
  bodyHtml: string;
}
