"use client";

import { BriefcaseBusiness } from "lucide-react";
import { AppleHelloExperienceEffect } from "@/components/ui/apple-hello-effect";
import { TimelineLayout, type TimelineItem } from "@/components/ui/TimelineLayout";
import { EXPERIENCE_ITEMS } from "@/data/experienceData";

const ExperienceTimeline = () => {
  const items: TimelineItem[] = [];

  EXPERIENCE_ITEMS.forEach((employer) => {
    employer.jobs.forEach((job, idx) => {
      items.push({
        id: `${employer.company}-${idx}`,
        date: job.date,
        title: job.name,
        subtitle: employer.company,
        description: job.content,
        icon: <BriefcaseBusiness className="h-3 w-3" />,
        status: job.date.toLowerCase().includes("present") ? "in-progress" : "completed",
      });
    });
  });

  return (
    <section id="experience" className="relative min-h-screen w-full">
      <div className="section-content">
        <header className="mb-12 space-y-4 text-center">
          <AppleHelloExperienceEffect
            className="mx-auto"
            svgClassName="mx-auto h-24 w-auto text-foreground"
          />
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
          className="min-h-[600px] w-full max-w-4xl mx-auto flex items-center justify-center"
        />
      </div>
    </section>
  );
};

export default ExperienceTimeline;
