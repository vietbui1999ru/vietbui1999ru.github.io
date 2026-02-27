"use client";

import { Badge } from "@/components/ui/badge";
import { getSkillIconSlug } from "@/data/skillIcons";
import { cn } from "@/lib/utils";
import {
  SiAnsible,
  SiDocker,
  SiExpress,
  SiGithub,
  SiGithubactions,
  SiGitlab,
  SiGnubash,
  SiGo,
  SiGrafana,
  SiJavascript,
  SiMongodb,
  SiNextdotjs,
  SiNginx,
  SiNvidia,
  SiPrometheus,
  SiProxmox,
  SiPython,
  SiReact,
  SiTerraform,
  SiTypescript,
  SiWireguard,
  SiYaml,
} from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";

const SLUG_TO_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  ansible: SiAnsible,
  docker: SiDocker,
  express: SiExpress,
  github: SiGithub,
  githubactions: SiGithubactions,
  gitlab: SiGitlab,
  gnubash: SiGnubash,
  go: SiGo,
  grafana: SiGrafana,
  javascript: SiJavascript,
  mongodb: SiMongodb,
  nextdotjs: SiNextdotjs,
  nginx: SiNginx,
  nvidia: SiNvidia,
  prometheus: SiPrometheus,
  proxmox: SiProxmox,
  python: SiPython,
  react: SiReact,
  terraform: SiTerraform,
  typescript: SiTypescript,
  wireguard: SiWireguard,
  yaml: SiYaml,
};

export interface SkillBadgeProps {
  skill: string;
  url?: string;
  tooltip?: string;
  className?: string;
  size?: "sm" | "md";
}

export function SkillBadge({
  skill,
  url,
  tooltip,
  className,
  size = "sm",
}: SkillBadgeProps) {
  const slug = getSkillIconSlug(skill);
  const IconComponent = slug ? SLUG_TO_ICON[slug] : null;

  const content = (
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1.5 font-normal",
        size === "sm" && "text-xs py-0.5",
        size === "md" && "text-sm py-1",
        className
      )}
    >
      {IconComponent && (
        <IconComponent className={size === "sm" ? "size-3" : "size-4"} />
      )}
      {skill}
    </Badge>
  );

  const label = tooltip ?? skill;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        className="inline-flex"
      >
        {content}
      </a>
    );
  }

  return <span title={label}>{content}</span>;
}
