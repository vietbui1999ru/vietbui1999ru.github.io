"use client";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dockHeading";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ACTIVE_CLASS, NAV_INACTIVE_CLASS } from "@/data/navigationData";
import { useScrollSpy } from "@/hooks/useScrollSpy";

const NavBarDock = () => {
  const activeHash = useScrollSpy();

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 w-full z-[9999999] bg-background">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6 w-full">
        <div className="flex-1 min-w-0" aria-hidden />
        <div className="flex-none flex items-end justify-center pb-3">
          <Dock
            className="items-end gap-16 rounded-full"
            panelHeight={84}
            magnification={84}
            distance={80}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <a href={item.href} key={item.href}>
                  <DockItem
                    className={cn(
                      "aspect-square rounded-full bg-secondary border border-background",
                      activeHash === item.href &&
                        "bg-accent/50 border-primary ring-2 ring-primary/20",
                    )}
                  >
                    <DockLabel>{item.label}</DockLabel>
                    <DockIcon
                      className={cn(
                        activeHash === item.href ? NAV_ACTIVE_CLASS : NAV_INACTIVE_CLASS,
                      )}
                    >
                      <Icon className="h-full w-full" />
                    </DockIcon>
                  </DockItem>
                </a>
              );
            })}
          </Dock>
        </div>
        <div className="flex-1 min-w-0" aria-hidden />
      </div>
    </div>
  );
};

export default NavBarDock;
