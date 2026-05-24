"use client";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

/**
 * Reusable section heading for any page section.
 */
export function SectionHeading({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: SectionHeadingProps) {
  return (
    <header className={cn("space-y-2 text-center", className)}>
      <h2
        className={cn(
          "text-fluid-heading font-semibold tracking-tight text-foreground",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={cn("text-fluid-subheading text-muted-foreground max-w-3xl mx-auto", subtitleClassName)}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
