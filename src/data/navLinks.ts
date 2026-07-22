/**
 * Framework-agnostic nav link list (no icon imports — safe for Svelte).
 * `navigationData.ts` keeps the lucide-icon version for legacy React nav
 * components during the transition (ADR 001).
 */

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "home", href: "#home" },
  { label: "about", href: "#about" },
  { label: "blog", href: "#blog" },
  { label: "projects", href: "#projects" },
  { label: "gallery", href: "#gallery" },
  { label: "experience", href: "#experience" },
  { label: "education", href: "#education" },
  { label: "contact", href: "#contact" },
];
