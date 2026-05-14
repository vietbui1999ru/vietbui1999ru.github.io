"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ACTIVE_CLASS } from "@/data/navigationData";
import { useScrollSpy } from "@/hooks/useScrollSpy";

const MobileBottomNav = () => {
  const activeHash = useScrollSpy();
  const [pathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

  return (
    <nav
      aria-label="Site navigation"
      className="fixed bottom-0 left-0 right-0 z-[9999999] md:hidden border-t border-border bg-background/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1">
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
    </nav>
  );
};

export default MobileBottomNav;
