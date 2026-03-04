"use client";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ACTIVE_CLASS } from "@/data/navigationData";
import { useScrollSpy } from "@/hooks/useScrollSpy";

const MobileBottomNav = () => {
  const activeHash = useScrollSpy();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/80 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeHash === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 basis-0 flex flex-col items-center justify-center gap-0.5 py-1 min-h-[40px] touch-manipulation transition-colors",
                isActive ? NAV_ACTIVE_CLASS : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-[9px] sm:text-[10px] leading-tight">
                {item.shortLabel}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
