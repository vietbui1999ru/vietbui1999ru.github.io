import type { SkillType } from "./aboutData";
import { SKILLS_CATEGORIES } from "./aboutData";

const allSkills = SKILLS_CATEGORIES.flatMap((group) => group.skills);
const byName = new Map(allSkills.map((skill) => [skill.name, skill]));

const groups: Array<{ type: string; names: string[] }> = [
  {
    type: "Languages",
    names: [
      "TypeScript",
      "Python",
      "Go",
      "Rust",
      "Lean",
      "C#",
      "Rocq",
      "Ruby",
      "Bash",
      "R",
    ],
  },
  {
    type: "Frontend",
    names: ["React", "Svelte", "Astro", "Next.js", "Shadcn", "Vite"],
  },
  {
    type: "Backend",
    names: ["Express", "Django", "Flask", "FastAPI"],
  },
  {
    type: "Data",
    names: ["Postgres", "MySQL", "SQLite", "Redis", "MongoDB"],
  },
  {
    type: "ML & AI",
    names: [
      "PyTorch",
      "TensorFlow",
      "scikit-learn",
      "Hugging Face",
      "LangChain",
      "LangGraph",
    ],
  },
  {
    type: "Testing",
    names: ["Cypress", "Playwright"],
  },
  {
    type: "Infrastructure",
    names: [
      "Docker",
      "Terraform",
      "Ansible",
      "Nginx",
      "Proxmox",
      "WireGuard",
      "Prometheus",
      "Grafana",
      "GitHub Actions",
      "Google Cloud Platform",
    ],
  },
  {
    type: "AWS",
    names: [
      "AWS",
      "AWS ECS Fargate",
      "AWS ECR",
      "AWS ALB",
      "AWS API Gateway",
      "AWS S3",
      "AWS IAM",
      "AWS Secrets Manager",
      "AWS CloudWatch",
    ],
  },
  {
    type: "Typesetting",
    names: ["LaTeX", "Typst"],
  },
  {
    type: "Tools",
    names: [
      "Markdown",
      "Git",
      "GitHub",
      "Gitlab",
      "Bun.js",
      "curl",
      "Neovim",
      "Obsidian",
      "Claude",
      "Cursor",
      "Copilot",
    ],
  },
];

export const SKILL_GROUPS: SkillType[] = groups.map((group) => ({
  type: group.type,
  skills: group.names.flatMap((name) => {
    const skill = byName.get(name);
    return skill ? [skill] : [];
  }),
}));
