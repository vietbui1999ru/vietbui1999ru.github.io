"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { Marquee } from "@/components/ui/marquee";
import skillsData from "@/data/skillsData.json";
import { cn } from "@/lib/utils";

type SkillGroup = {
  type: string;
  skills: { name: string; icon: string }[];
};

const groups = skillsData as SkillGroup[];

export function SkillsSection() {
  return (
    <div className="space-y-8">
      <SectionHeading title="Skills" className="mb-6" />

      <div className="space-y-8">
        {groups.map((group, index) => (
          <div key={group.type} className="space-y-3">
            <h3
              className={cn(
                "text-sm font-medium tracking-tight text-muted-foreground uppercase text-center",
              )}
            >
              {group.type}
            </h3>
            <Marquee
              reverse={index % 2 === 1}
              duration={35}
              className="mx-auto max-w-5xl py-1"
            >
              {group.skills.map((skill) => (
                <SkillBadge
                  key={skill.name}
                  skill={skill.name}
                  size="md"
                  className="whitespace-nowrap"
                />
              ))}
            </Marquee>
          </div>
        ))}
      </div>
    </div>
  );
}
