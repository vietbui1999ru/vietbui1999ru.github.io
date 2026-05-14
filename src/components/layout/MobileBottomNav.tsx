"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ACTIVE_CLASS } from "@/data/navigationData";
import { useScrollSpy } from "@/hooks/useScrollSpy";

const MobileBottomNav = () => {
  const activeHash = useScrollSpy();
  const [pathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <nav
      aria-label="Site navigation"
      className="fixed bottom-0 left-0 right-0 z-[9999999] md:hidden border-t border-border bg-background/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex items-center overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1"
          style={{ touchAction: "pan-x" }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeHash === item.href;
            return (
              <a
                key={item.href}
                href={pathname === "/" ? item.href : "/" + item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 shrink-0 w-16 min-h-[44px] touch-manipulation transition-colors",
                  isActive ? NAV_ACTIVE_CLASS : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] leading-tight">{item.shortLabel}</span>
              </a>
            );
          })}
        </div>

        {/* Fading chevron — visible when more icons are off-screen to the right */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-0 top-0 bottom-0 flex items-center pr-1",
            "bg-gradient-to-l from-background/90 via-background/50 to-transparent w-10",
            "transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 ml-auto" />
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
