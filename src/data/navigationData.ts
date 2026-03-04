import {
  User,
  HomeIcon,
  NotebookPen,
  ServerCog,
  BriefcaseBusiness,
  GraduationCap,
  GalleryHorizontal,
  UserPen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  /** Full label shown on desktop dock tooltip */
  label: string;
  /** Abbreviated label for mobile bottom nav */
  shortLabel: string;
  icon: LucideIcon;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", shortLabel: "Home", icon: HomeIcon, href: "#home" },
  { label: "About Me", shortLabel: "About", icon: User, href: "#about" },
  { label: "Projects", shortLabel: "Projects", icon: ServerCog, href: "#projects" },
  { label: "Professional Experience", shortLabel: "Work", icon: BriefcaseBusiness, href: "#experience" },
  { label: "Education", shortLabel: "Edu", icon: GraduationCap, href: "#education" },
  { label: "Gallery", shortLabel: "Gallery", icon: GalleryHorizontal, href: "#gallery" },
  { label: "Blog", shortLabel: "Blog", icon: NotebookPen, href: "#blog" },
  { label: "Contact", shortLabel: "Contact", icon: UserPen, href: "#contact" },
];

export const SECTION_IDS = NAV_ITEMS.map((item) => item.href.slice(1));

/** Scroll offset (px) at which a section is considered "active" */
export const SCROLL_ACTIVE_THRESHOLD = 150;

/** Active nav highlight colors */
export const NAV_ACTIVE_CLASS = "text-[#D92D48] dark:text-[#FA689A]";
export const NAV_INACTIVE_CLASS = "text-[#384664] dark:text-[#C0B6DD]";
