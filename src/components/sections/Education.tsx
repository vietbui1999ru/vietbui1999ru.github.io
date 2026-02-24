"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonVariants } from "@/components/ui/button";
import { GraduationCap, Calendar, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { EDUCATION_ITEMS } from "@/data/educationData";

const Education = () => {
  return (
    <section id="education" className="relative min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          title="Education"
          subtitle="Academic background and continuous learning."
          className="mb-12"
        />

        <div className="space-y-6">
          {EDUCATION_ITEMS.map((item) => (
            <Card key={item.title} className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <a
                        href={item.school.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {item.school.name}
                        <ExternalLink className="size-3" />
                      </a>
                    </CardDescription>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Calendar className="size-3.5" />
                      {item.date}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                  {item.content}
                </div>
                {item.GPA && (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    GPA: {item.GPA}
                  </p>
                )}
                {item.featuredLink?.enable && item.featuredLink?.url && (
                  <a
                    href={item.featuredLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-4 inline-flex"
                    )}
                  >
                    {item.featuredLink.name ?? "View"}
                    <ExternalLink className="size-3.5 ml-1" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Education;
