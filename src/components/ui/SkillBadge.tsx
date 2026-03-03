"use client";

import { Badge } from "@/components/ui/badge";
import { getSkillIconSlug } from "@/data/skillIcons";
import { cn } from "@/lib/utils";
import {
  SiAnsible,
  SiApachespark,
  SiAstro,
  SiBun,
  SiClaude,
  SiCurl,
  SiCursor,
  SiDjango,
  SiDocker,
  SiDotnet,
  SiExpress,
  SiFastapi,
  SiFlask,
  SiGit,
  SiGithub,
  SiGithubactions,
  SiGooglecloud,
  SiGithubcopilot,
  SiGitlab,
  SiGnubash,
  SiGo,
  SiGrafana,
  SiHuggingface,
  SiJavascript,
  SiJupyter,
  SiKeras,
  SiKotlin,
  SiLatex,
  SiLua,
  SiMarkdown,
  SiMongodb,
  SiMysql,
  SiNeovim,
  SiNextdotjs,
  SiNginx,
  SiNodedotjs,
  SiNumpy,
  SiNvidia,
  SiObsidian,
  SiOcaml,
  SiOpencv,
  SiPandas,
  SiPostgresql,
  SiPrometheus,
  SiProxmox,
  SiPython,
  SiPytorch,
  SiR,
  SiReact,
  SiRedis,
  SiRuby,
  SiRust,
  SiScikitlearn,
  SiSqlite,
  SiTensorflow,
  SiTerraform,
  SiTypescript,
  SiVite,
  SiWireguard,
  SiYaml,
} from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";

/** Custom Rocq (theorem prover) icon — rooster head from official logo */
const RocqIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 149" fill="currentColor" {...props}>
    <path d="M144.5,97.85c-7.21-5.22-15.35-7.83-24.41-7.83-11.54,0-22.11,4.81-31.72,14.42l-41.82,41.82c-10.71-7.14-19.23-16.48-25.54-28.01-6.32-11.54-9.48-23.96-9.48-37.29,0-9.06,1.65-18.19,4.94-27.4h59.94v-8.65H14.42c-3.85-5.36-6.94-11.12-9.27-17.3h71.27v-8.65H2.47C1.1,13.6.27,7.97,0,2.06l90.22.21c14.28,0,27.43,3.54,39.45,10.61,12.01,7.07,21.56,16.62,28.63,28.63,7.07,12.02,10.61,25.17,10.61,39.45,0,13.32-3.09,25.75-9.27,37.29-2.88-8.38-7.93-15.17-15.14-20.39ZM136.06,61.28c1.71-1.72,2.57-3.81,2.57-6.28s-.86-4.56-2.57-6.28c-1.72-1.72-3.81-2.58-6.28-2.58s-4.57.86-6.28,2.58c-1.72,1.72-2.58,3.81-2.58,6.28s.86,4.57,2.58,6.28c1.71,1.72,3.81,2.58,6.28,2.58s4.56-.86,6.28-2.58Z" />
  </svg>
);

const SLUG_TO_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  ansible: SiAnsible,
  apachespark: SiApachespark,
  astro: SiAstro,
  bun: SiBun,
  claude: SiClaude,
  curl: SiCurl,
  cursor: SiCursor,
  django: SiDjango,
  docker: SiDocker,
  dotnet: SiDotnet,
  express: SiExpress,
  fastapi: SiFastapi,
  flask: SiFlask,
  git: SiGit,
  github: SiGithub,
  githubactions: SiGithubactions,
  githubcopilot: SiGithubcopilot,
  gitlab: SiGitlab,
  gnubash: SiGnubash,
  go: SiGo,
  googlecloud: SiGooglecloud,
  grafana: SiGrafana,
  huggingface: SiHuggingface,
  javascript: SiJavascript,
  jupyter: SiJupyter,
  keras: SiKeras,
  kotlin: SiKotlin,
  latex: SiLatex,
  lua: SiLua,
  markdown: SiMarkdown,
  mongodb: SiMongodb,
  mysql: SiMysql,
  neovim: SiNeovim,
  nextdotjs: SiNextdotjs,
  nginx: SiNginx,
  nodedotjs: SiNodedotjs,
  numpy: SiNumpy,
  nvidia: SiNvidia,
  obsidian: SiObsidian,
  ocaml: SiOcaml,
  opencv: SiOpencv,
  pandas: SiPandas,
  postgresql: SiPostgresql,
  prometheus: SiPrometheus,
  proxmox: SiProxmox,
  python: SiPython,
  pytorch: SiPytorch,
  r: SiR,
  react: SiReact,
  redis: SiRedis,
  rocq: RocqIcon,
  ruby: SiRuby,
  rust: SiRust,
  scikitlearn: SiScikitlearn,
  sqlite: SiSqlite,
  tensorflow: SiTensorflow,
  terraform: SiTerraform,
  typescript: SiTypescript,
  vite: SiVite,
  wireguard: SiWireguard,
  yaml: SiYaml,
};

const SLUG_TO_ICON_COLOR_CLASS: Record<string, string> = {
  astro: "text-orange-400",
  bun: "text-yellow-400",
  claude: "text-amber-400",
  cursor: "text-cyan-400",
  django: "text-emerald-500",
  docker: "text-sky-500",
  dotnet: "text-purple-500",
  express: "text-zinc-200",
  fastapi: "text-emerald-400",
  flask: "text-zinc-200",
  git: "text-orange-500",
  github: "text-zinc-200",
  githubactions: "text-sky-400",
  githubcopilot: "text-emerald-400",
  gitlab: "text-orange-500",
  gnubash: "text-green-500",
  go: "text-cyan-400",
  googlecloud: "text-sky-400",
  grafana: "text-orange-500",
  huggingface: "text-amber-400",
  javascript: "text-yellow-300",
  jupyter: "text-orange-400",
  keras: "text-red-400",
  kotlin: "text-indigo-400",
  latex: "text-emerald-400",
  lua: "text-sky-400",
  markdown: "text-zinc-200",
  mongodb: "text-emerald-500",
  mysql: "text-sky-500",
  neovim: "text-emerald-500",
  nextdotjs: "text-zinc-100",
  nginx: "text-emerald-500",
  nodedotjs: "text-emerald-500",
  numpy: "text-sky-400",
  nvidia: "text-lime-400",
  obsidian: "text-violet-500",
  ocaml: "text-orange-500",
  opencv: "text-sky-400",
  pandas: "text-sky-400",
  postgresql: "text-sky-500",
  prometheus: "text-orange-500",
  proxmox: "text-orange-500",
  python: "text-yellow-300",
  pytorch: "text-orange-500",
  r: "text-sky-400",
  react: "text-sky-400",
  redis: "text-red-500",
  rocq: "text-amber-500",
  ruby: "text-red-500",
  rust: "text-orange-500",
  scikitlearn: "text-amber-400",
  sqlite: "text-emerald-400",
  tensorflow: "text-orange-400",
  terraform: "text-purple-500",
  typescript: "text-sky-400",
  vite: "text-purple-400",
  wireguard: "text-red-500",
  yaml: "text-amber-300",
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
        className,
      )}
    >
      {IconComponent && (
        <IconComponent
          className={cn(
            size === "sm" ? "size-3" : "size-4",
            slug && SLUG_TO_ICON_COLOR_CLASS[slug],
          )}
        />
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
