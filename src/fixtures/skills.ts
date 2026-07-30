export interface UiLabSkillFixture {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
}

export const UI_LAB_SKILLS: UiLabSkillFixture[] = [
  {
    id: "languages",
    title: "Languages",
    description: "Programming languages and core runtime fluency.",
    tags: ["TypeScript", "Python", "Go", "C#"],
    category: "Languages",
  },
  {
    id: "frontend",
    title: "Frontend",
    description: "UI frameworks, accessibility, and visual systems.",
    tags: ["Svelte", "React", "Astro", "Tailwind", "Testing"],
    category: "Frontend",
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    description: "Delivery, automation, observability, and self-hosting.",
    tags: ["Docker", "GitHub Actions", "Linux", "Ansible"],
    category: "Infrastructure",
  },
];
