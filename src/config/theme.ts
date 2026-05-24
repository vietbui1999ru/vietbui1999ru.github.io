/**
 * Theme configuration — colors and visual tokens for navigation and UI.
 * Imported at build time only; no runtime override.
 */

export interface ThemeConfig {
  nav: {
    /** Tailwind utility class applied to the active nav item */
    activeClass: string;
    /** Tailwind utility class applied to inactive nav items */
    inactiveClass: string;
  };
}

export const THEME: ThemeConfig = {
  nav: {
    activeClass: "text-[#D92D48] dark:text-[#FA689A]",
    inactiveClass: "text-[#384664] dark:text-[#C0B6DD]",
  },
};
