"use client";

import { GraduationCap } from "lucide-react";
import { AppleHelloEducationEffect } from "@/components/ui/apple-hello-effect";
import {
  TimelineLayout,
  type TimelineItem,
} from "@/components/ui/TimelineLayout";
import { EDUCATION_ITEMS } from "@/data/educationData";

const EducationTimeline = () => {
  const items: TimelineItem[] = EDUCATION_ITEMS.map((item, idx) => {
    const descriptionBase =
      item.content ??
      (item.columns ? item.columns.flat().join(". ") : "") ??
      "";

    const descriptionWithGpa =
      descriptionBase + (item.GPA ? `\nGPA: ${item.GPA}` : "");

    const columns =
      item.columns && item.columns.length > 0
        ? item.columns
        : item.content
          ? [
              item.content
                .split(/[.\n]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            ]
          : undefined;

    return {
      id: idx,
      date: item.date,
      title: item.title,
      subtitle: item.school.name,
      description: descriptionWithGpa,
      contentColumns: columns,
      icon: <GraduationCap className="h-3 w-3" />,
      status: item.date.toLowerCase().includes("present")
        ? "in-progress"
        : "completed",
      ctaHref:
        item.featuredLink?.enable && item.featuredLink.url
          ? item.featuredLink.url
          : item.school.url,
      ctaLabel: item.featuredLink?.name ?? "View program",
    };
  });

  return (
    <section id="education" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloEducationEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Academic background and continuous learning.
          </p>
        </header>

        <TimelineLayout
          animate
          size="md"
          connectorColor="accent"
          iconColor="accent"
          items={items}
          className="min-h-[500px] space-y-5 w-full max-w-7xl mx-auto flex items-center justify-center"
        />
      </div>
    </section>
  );
};

export default EducationTimeline;
