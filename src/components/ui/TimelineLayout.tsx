"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { Card3D } from "@/components/ui/Card3D";

export type TimelineStatus = "completed" | "in-progress" | "pending";

export interface TimelineItem {
  id: string | number;
  date?: string;
  title: string;
  /** Secondary line, e.g. company or school/location */
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  status?: TimelineStatus;
  color?: "primary" | "muted" | "accent";
  /** Optional call-to-action link at bottom of card */
  ctaHref?: string;
  ctaLabel?: string;
}

export interface TimelineLayoutProps {
  items: TimelineItem[];
  animate?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  connectorColor?: "primary" | "muted" | "accent";
  iconColor?: "primary" | "muted" | "accent";
}

export function TimelineLayout({
  items,
  animate = false,
  size = "md",
  className,
  connectorColor = "primary",
  iconColor = "primary",
}: TimelineLayoutProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "relative w-full max-w-2xl mx-auto flex flex-col gap-8",
        className,
      )}
    >
      {/* Center spine */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2",
          connectorColor === "primary" && "bg-primary/20",
          connectorColor === "muted" && "bg-muted/40",
          connectorColor === "accent" && "bg-accent/40",
        )}
        aria-hidden
        style={{ width: 2 }}
      />

      <ul className="space-y-10">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isRight = index % 2 === 1;

          const statusRing =
            item.status === "completed"
              ? "bg-primary"
              : item.status === "in-progress"
              ? "bg-yellow-400"
              : "bg-muted-foreground/30";

          // Heuristic: split description into bullets
          let bullets: string[] | null = null;
          if (item.description) {
            const byNewline = item.description
              .split(/\n+/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (byNewline.length > 1) {
              bullets = byNewline;
            } else {
              const bySentence = item.description
                .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
                .map((s) => s.trim())
                .filter(Boolean);
              if (bySentence.length > 1) bullets = bySentence;
            }
          }

          const content = (
            <Card3D active maxTilt={8} className="h-full">
              <div
                className={cn(
                  "rounded-xl border bg-card/60 p-4 shadow-sm transition-transform text-center h-full",
                  animate && "animate-in slide-in-from-bottom-2 duration-300",
                )}
              >
              <div className="mb-2 space-y-1">
                <h3 className="font-semibold leading-tight text-sm md:text-base">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-[11px] md:text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
                {item.date && (
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    {item.date}
                  </p>
                )}
              </div>

              {bullets ? (
                <ul className="mt-2 space-y-1 text-[11px] md:text-xs text-muted-foreground list-disc list-inside">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : item.description ? (
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              ) : null}

              {item.ctaHref && (
                <a
                  href={item.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1 text-[11px] text-primary hover:underline"
                >
                  {item.ctaLabel ?? "View details"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              </div>
            </Card3D>
          );

          return (
            <li key={item.id} className="relative">
              {/* icon + connector at center */}
              <div className="pointer-events-none absolute left-1/2 top-0 flex flex-col items-center -translate-x-1/2">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 bg-background shadow-sm",
                    iconColor === "primary" && "border-primary/70",
                    iconColor === "muted" && "border-muted-foreground/40",
                    iconColor === "accent" && "border-accent/70",
                    size === "sm" && "h-7 w-7",
                    size === "md" && "h-8 w-8",
                    size === "lg" && "h-10 w-10",
                  )}
                >
                  {item.icon ? (
                    <span
                      className={cn(
                        "flex items-center justify-center",
                        size === "sm" && "text-[10px]",
                        size === "md" && "text-xs",
                        size === "lg" && "text-sm",
                      )}
                    >
                      {item.icon}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "block rounded-full",
                        statusRing,
                        size === "sm" && "h-2 w-2",
                        size === "md" && "h-2.5 w-2.5",
                        size === "lg" && "h-3 w-3",
                      )}
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mt-1 flex-1",
                      connectorColor === "primary" && "bg-primary/40",
                      connectorColor === "muted" && "bg-muted-foreground/30",
                      connectorColor === "accent" && "bg-accent/40",
                    )}
                    style={{ width: 2 }}
                  />
                )}
              </div>

              {/* content: zig-zag on md+, centered stack on mobile */}
              <div className="md:flex md:w-full">
                {/* mobile: full width centered */}
                <div className="w-full md:hidden mt-3 px-6">{content}</div>

                {/* desktop: two-column zig-zag */}
                <div
                  className={cn(
                    "hidden md:flex w-full",
                    isRight && "md:flex-row-reverse",
                  )}
                >
                  <div
                    className={cn(
                      "w-1/2",
                      isRight ? "pl-10" : "pr-10",
                    )}
                  >
                    {content}
                  </div>
                  <div className="w-1/2" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
