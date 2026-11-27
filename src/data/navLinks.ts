/**
 * Nav link list shared by the Svelte nav components (no icon imports).
 */

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "home", href: "/" },
  { label: "blog", href: "/blog" },
  { label: "thoughts", href: "/thoughts" },
  { label: "library", href: "/library" },
  { label: "projects", href: "/projects" },
  { label: "about", href: "/about" },
  { label: "playground", href: "/playground" },
];
