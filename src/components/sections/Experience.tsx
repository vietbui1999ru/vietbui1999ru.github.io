"use client";

import { BriefcaseBusiness } from "lucide-react";
import { AppleHelloExperienceEffect } from "@/components/ui/apple-hello-effect";
import {
  TimelineLayout,
  type TimelineItem,
} from "@/components/ui/TimelineLayout";
import { EXPERIENCE_ITEMS, type ExperienceTag } from "@/data/experienceData";

type ExperienceJobLike = {
  name?: string;
  date?: string;
  content?: string;
  tags?: ExperienceTag[];
};

type ExperienceCompanyLike = {
  company?: string;
  jobs?: Array<ExperienceJobLike | ExperienceCompanyLike>;
};

function collectTimelineItems(
  companyLike: ExperienceCompanyLike,
  output: TimelineItem[],
) {
  const companyName = companyLike.company ?? "Unknown";
  const jobs = Array.isArray(companyLike.jobs) ? companyLike.jobs : [];

  jobs.forEach((entry, idx) => {
    // Support legacy/mixed JSON where nested companies can appear inside jobs.
    if ("jobs" in entry && Array.isArray(entry.jobs)) {
      collectTimelineItems(
        {
          company: entry.company ?? companyName,
          jobs: entry.jobs,
        },
        output,
      );
      return;
    }

    const title = entry.name?.trim();
    if (!title) return;

    const date = entry.date ?? "";
    const tags =
      Array.isArray(entry.tags) && entry.tags.length > 0
        ? entry.tags.map((t) => ({
            label: t.name,
            href: t.url,
            title: t.tooltip,
          }))
        : undefined;

    output.push({
      id: `${companyName}-${idx}-${title}`,
      date,
      title,
      subtitle: companyName,
      description: entry.content ?? "",
      tags,
      icon: <BriefcaseBusiness className="h-3 w-3" />,
      status: date.toLowerCase().includes("present")
        ? "in-progress"
        : "completed",
    });
  });
}

const ExperienceTimeline = () => {
  const items: TimelineItem[] = [];

  EXPERIENCE_ITEMS.forEach((employer) => {
    collectTimelineItems(employer, items);
  });

  return (
    <section id="experience" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 flex flex-col items-center gap-4 text-center">
          <AppleHelloExperienceEffect className="w-full" />
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Where I've worked and what I've built.
          </p>
        </header>

        <TimelineLayout
          animate
          size="md"
          connectorColor="primary"
          iconColor="primary"
          items={items}
          className="min-h-[600px] w-full max-w-7xl mx-auto flex items-center justify-center"
        />
      </div>
    </section>
  );
};

export default ExperienceTimeline;
