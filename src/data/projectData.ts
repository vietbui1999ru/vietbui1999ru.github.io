export type ProjectStatus = "active" | "shipped" | "archived";

export type ProjectMedia =
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "video"; src: string; title: string; caption?: string }
  | { kind: "youtube"; id: string; title: string; caption?: string }
  | { kind: "vimeo"; id: string; title: string; caption?: string };

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
  media?: ProjectMedia[];
  status: ProjectStatus;
  /** Build-rendered Markdown from the trusted owner-controlled vault. */
  bodyHtml: string;
}
