"use client";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dockHeading";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ACTIVE_CLASS, NAV_INACTIVE_CLASS } from "@/data/navigationData";
import { useScrollSpy } from "@/hooks/useScrollSpy";

const NavBarDock = () => {
  const activeHash = useScrollSpy();

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
      <div className="flex items-end justify-center gap-4 px-4 sm:px-6 w-full">
        <div className="flex-none flex items-end justify-center pb-3">
          <Dock
            className="items-end gap-16 rounded-full"
            panelHeight={84}
            magnification={84}
            distance={80}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeHash === item.href;
              return (
                <DockItem
                  key={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "aspect-square rounded-full bg-secondary border border-background",
                    isActive && "bg-accent/50 border-primary ring-2 ring-primary/20",
                  )}
                  onClick={() => {
                    const target = window.location.pathname === "/" ? item.href : "/" + item.href;
                    window.location.href = target;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const target = window.location.pathname === "/" ? item.href : "/" + item.href;
                      window.location.href = target;
                    }
                  }}
                >
                  <DockLabel>{item.label}</DockLabel>
                  <DockIcon className={cn(isActive ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS)}>
                    <Icon className="h-full w-full" />
                  </DockIcon>
                </DockItem>
              );
            })}
          </Dock>
        </div>
      </div>
    </div>
  );
};

export default NavBarDock;
