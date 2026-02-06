"use client";

import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "@/components/ui/dockHeading";

import cn from "clsx";

import {
  User,
  HomeIcon,
  Mail,
  Trophy,
  NotebookPen,
  ServerCog,
  BriefcaseBusiness,
  GraduationCap,
  GalleryHorizontal,
  UserPen,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitch from "@/components/ui/ThemeSwitch";

const NavBarDock = () => {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const data = [
    {
      title: "Home",
      icon: <HomeIcon className="h-full w-full" />,
      href: "#home",
    },
    {
      title: "About Me",
      icon: <User className="h-full w-full" />,
      href: "#about",
    },
    {
      title: "Projects",
      icon: <ServerCog className="h-full w-full" />,
      href: "#projects",
    },
    {
      title: "Professional Experience",
      icon: <BriefcaseBusiness className="h-full w-full" />,
      href: "#experience",
    },
    {
      title: "Education",
      icon: <GraduationCap className="h-full w-full" />,
      href: "#education",
    },
    {
      title: "Blog",
      icon: <NotebookPen className="h-full w-full" />,
      href: "#blog",
    },
    {
      title: "Gallery",
      icon: <GalleryHorizontal className="h-full w-full" />,
      href: "#gallery",
    },
    {
      title: "Achievements",
      icon: <Trophy className="h-full w-full" />,
      href: "#achievements",
    },
    {
      title: "Contact",
      icon: <UserPen className="h-full w-full" />,
      href: "#contact",
    },
  ];

  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
      {/* ThemeSwitch: own container, absolutely positioned — does not move with dock animations */}
      <div className="absolute top-5 right-0 pr-4 sm:pr-6 pt-0.5">
        <ThemeSwitch />
      </div>

      {/* Flex row: dock only (ThemeSwitch is out of flow); dock keeps all animations */}
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6 w-full">
        <div className="flex-1 min-w-0" aria-hidden />
        <div className="flex-none flex items-end justify-center pb-3">
          <Dock className="items-end gap-12 rounded-full">
            {data.map((item, idx) => (
              <Link href={item.href} key={idx}>
                <DockItem
                  className={cn(
                    "aspect-square rounded-full bg-secondary border border-background",
                    pathname === item.href &&
                      "bg-accent/50 border-primary ring-2 ring-primary/20",
                      
                  )}
                >
                  <DockLabel>{item.title}</DockLabel>
                  <DockIcon
                    className={cn(
                      pathname === item.href
                        ? "text-[#D92D48] dark:text-[#FA689A]"
                        : "text-[#384664] dark:text-[#C0B6DD]",
                    )}
                  >
                    {item.icon}
                  </DockIcon>
                </DockItem>
              </Link>
            ))}
          </Dock>
        </div>
        <div className="flex-1 min-w-0" aria-hidden />
      </div>
    </div>
  );
};

export default NavBarDock;
