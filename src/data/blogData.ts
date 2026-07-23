/**
 * Blog section content — edit to change section heading and subtitle.
 */

export const BLOG_SECTION_TITLE = "Blog";
export const BLOG_SECTION_SUBTITLE = "Recent posts and writing.";

/** Serializable view model used by the hydrated blog archive filter. */
export interface SerializedPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  cover?: string;
}
