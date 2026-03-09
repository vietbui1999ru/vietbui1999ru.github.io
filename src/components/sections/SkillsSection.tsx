"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SkillBadge } from "@/components/ui/SkillBadge";
import { Marquee } from "@/components/ui/marquee";
import skillsData from "@/data/skillsData.json";
import { cn } from "@/lib/utils";

type SkillGroup = {
  type: string;
  skills: { name: string; icon: string }[];
};

type ViewMode = "skills" | "resume";

const groups = skillsData as SkillGroup[];

const RESUME_PATH = "/resume.pdf";

function SkillsMarquee() {
  return (
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
  );
}

function ResumeViewer() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4">
      <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-lg">
        <object
          data={`${RESUME_PATH}#toolbar=1&navpanes=0&scrollbar=1`}
          type="application/pdf"
          className="h-[70vh] w-full sm:h-[75vh]"
        >
          <embed
            src={`${RESUME_PATH}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            className="h-[70vh] w-full sm:h-[75vh]"
          />
        </object>
      </div>
      <a
        href={RESUME_PATH}
        download
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Resume
      </a>
    </div>
  );
}

export function SkillsSection() {
  const [view, setView] = useState<ViewMode>("skills");

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <SectionHeading title="Skills & Resume" className="mb-0" />

        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setView("skills")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-medium transition-all",
              view === "skills"
                ? "bg-white/15 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Skills
          </button>
          <button
            type="button"
            onClick={() => setView("resume")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-medium transition-all",
              view === "resume"
                ? "bg-white/15 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Resume
          </button>
        </div>
      </div>

      {view === "skills" ? <SkillsMarquee /> : <ResumeViewer />}
    </div>
  );
}
