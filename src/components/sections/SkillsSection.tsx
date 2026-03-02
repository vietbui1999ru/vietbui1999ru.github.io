"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkillBadge } from "@/components/ui/SkillBadge";
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
      <SectionHeading title="Skills" className="text-left mb-6" />

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.type} className="space-y-3">
            <h3
              className={cn("text-sm font-medium tracking-tight text-muted-foreground uppercase")}
            >
              {group.type}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <SkillBadge key={skill.name} skill={skill.name} size="md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
