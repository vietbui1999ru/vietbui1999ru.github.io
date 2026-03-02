/**
 * About section content
 */

export const ABOUT_TITLE = "About Me";

export const ABOUT_TAGLINE =
  "I'm a New Graduate Software Engineer with a passion for Simulations and Automation.";

export const ABOUT_PARAGRAPHS = [
  "I graduated with B.A & M.S degrees in Computer Science & Applied Mathematics in 2025",
  "I have a strong passion in building projects that intersect programming with Math & Science",
  "I love to build, tinker, & break stuff in my free time (In addition to self-hosting)",
  "I aim to be a T-shaped engineer by diversifying my skills & learn from engineering experts",
] as const;

// Skills data now abstracted, see skillsData.json
// All previous ABOUT_CURRENT_ROLE, ABOUT_INTERESTS, ABOUT_HOBBIES removed per instruction.
export const SKILLS_SECTION_TITLE = "Skillset";

export type SkillType = {
  type: string; // e.g "Programming Languages"
  skills: Array<{
    name: string;
    icon: string; // Icon component name or path
  }>;
};

import skillsData from "./skillsData.json";
export const SKILLS_CATEGORIES: SkillType[] = skillsData as SkillType[];
