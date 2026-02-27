"use client";

import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "@/components/ui/dockHeading";
import { cn } from "@/lib/utils";
import {
  User,
  HomeIcon,
  Trophy,
  NotebookPen,
  ServerCog,
  BriefcaseBusiness,
  GraduationCap,
  GalleryHorizontal,
  UserPen,
} from "lucide-react";
import { useEffect, useState } from "react";

const NavBarDock = () => {
  const [activeHash, setActiveHash] = useState("#home");

  useEffect(() => {
    const handleHashChange = () => setActiveHash(window.location.hash || "#home");
    const handleScroll = () => {
      const sections = [
        "home",
        "about",
        "projects",
        "experience",
        "education",
        "blog",
        "gallery",
        "achievements",
        "contact",
      ];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveHash(`#${sections[i]}`);
            return;
          }
        }
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const data = [
    { title: "Home", icon: <HomeIcon className="h-full w-full" />, href: "#home" },
    { title: "About Me", icon: <User className="h-full w-full" />, href: "#about" },
    { title: "Projects", icon: <ServerCog className="h-full w-full" />, href: "#projects" },
    { title: "Professional Experience", icon: <BriefcaseBusiness className="h-full w-full" />, href: "#experience" },
    { title: "Education", icon: <GraduationCap className="h-full w-full" />, href: "#education" },
    { title: "Blog", icon: <NotebookPen className="h-full w-full" />, href: "#blog" },
    { title: "Gallery", icon: <GalleryHorizontal className="h-full w-full" />, href: "#gallery" },
    { title: "Achievements", icon: <Trophy className="h-full w-full" />, href: "#achievements" },
    { title: "Contact", icon: <UserPen className="h-full w-full" />, href: "#contact" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6 w-full">
        <div className="flex-1 min-w-0" aria-hidden />
        <div className="flex-none flex items-end justify-center pb-3">
          <Dock className="items-end gap-12 rounded-full">
            {data.map((item, idx) => (
              <a href={item.href} key={idx}>
                <DockItem
                  className={cn(
                    "aspect-square rounded-full bg-secondary border border-background",
                    activeHash === item.href &&
                      "bg-accent/50 border-primary ring-2 ring-primary/20"
                  )}
                >
                  <DockLabel>{item.title}</DockLabel>
                  <DockIcon
                    className={cn(
                      activeHash === item.href
                        ? "text-[#D92D48] dark:text-[#FA689A]"
                        : "text-[#384664] dark:text-[#C0B6DD]"
                    )}
                  >
                    {item.icon}
                  </DockIcon>
                </DockItem>
              </a>
            ))}
          </Dock>
        </div>
        <div className="flex-1 min-w-0" aria-hidden />
      </div>
    </div>
  );
};

export default NavBarDock;
