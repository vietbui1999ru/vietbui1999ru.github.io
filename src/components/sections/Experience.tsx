"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, ExternalLink } from "lucide-react";
import { EXPERIENCE_ITEMS } from "@/data/experienceData";

const Experience = () => {
  return (
    <section id="experience" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          title="Experience"
          subtitle="Where I've worked and what I've built."
          className="mb-12"
        />

        <div className="space-y-8">
          {EXPERIENCE_ITEMS.map((employer) => (
            <Card key={employer.company} className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      <a
                        href={employer.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
                      >
                        {employer.company}
                        <ExternalLink className="size-3.5" />
                      </a>
                    </CardTitle>
                    <CardDescription>{employer.companyUrl}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {employer.jobs.map((job) => (
                  <div key={job.name}>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">
                        {job.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {job.date}
                      </span>
                    </div>
                    {job.info?.content && (
                      <Badge variant="secondary" className="mb-2">
                        {job.info.content}
                      </Badge>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {job.content}
                    </p>
                    {job.featuredItems?.fontAwesomeIcons?.length ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.featuredItems.fontAwesomeIcons.map((item, i) => (
                          <a
                            key={i}
                            href={item.url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={item.tooltip}
                            className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <span className="sr-only">
                              {item.tooltip ?? item.icon}
                            </span>
                            <span className="text-xs font-medium">
                              {item.tooltip ?? "Tech"}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {employer.jobs.indexOf(job) < employer.jobs.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
