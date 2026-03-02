"use client";

import { cn } from "@/lib/utils";
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
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { title: "Home", icon: HomeIcon, href: "#home" },
  { title: "About", icon: User, href: "#about" },
  { title: "Projects", icon: ServerCog, href: "#projects" },
  { title: "Work", icon: BriefcaseBusiness, href: "#experience" },
  { title: "Edu", icon: GraduationCap, href: "#education" },
  { title: "Blog", icon: NotebookPen, href: "#blog" },
  { title: "Gallery", icon: GalleryHorizontal, href: "#gallery" },
  { title: "Contact", icon: UserPen, href: "#contact" },
];

const SECTIONS = NAV_ITEMS.map((item) => item.href.slice(1));

const MobileBottomNav = () => {
  const [activeHash, setActiveHash] = useState("#home");

  useEffect(() => {
    const handleScroll = () => {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveHash(`#${SECTIONS[i]}`);
            return;
          }
        }
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999999] md:hidden border-t border-border bg-background/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeHash === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 min-w-[44px] min-h-[44px] touch-manipulation transition-colors",
                isActive
                  ? "text-[#D92D48] dark:text-[#FA689A]"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] leading-tight">{item.title}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
