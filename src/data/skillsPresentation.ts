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
      "C#",
      "Rocq",
      "Lua",
      "Ruby",
      "Bash",
      "LaTeX",
      "Ocaml",
      "R",
      "Kotlin",
    ],
  },
  {
    type: "Frontend",
    names: ["React", "Astro", "Next.js", "Bun.js", "Vite"],
  },
  {
    type: "Backend",
    names: ["Express", "Django", "Flask", "FastAPI"],
  },
  {
    type: "Data & ML",
    names: [
      "Postgres",
      "MySQL",
      "SQLite",
      "Redis",
      "MongoDB",
      "AWS S3",
      "TensorFlow",
      "PyTorch",
      "Jupyter",
      "PySpark",
      "NumPy",
      "Pandas",
      "scikit-learn",
      "Keras",
      "Hugging Face",
      "OpenCV",
    ],
  },
  {
    type: "Infrastructure",
    names: [
      "Ansible",
      "Terraform",
      "Grafana",
      "Prometheus",
      "WireGuard",
      "Nginx",
      "Proxmox",
      "Docker",
      "GitHub Actions",
      "AWS",
      "Google Cloud Platform",
    ],
  },
  {
    type: "Tools",
    names: [
      "Markdown",
      "Git",
      "GitHub",
      "Gitlab",
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
