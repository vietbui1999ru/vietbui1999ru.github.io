/**
 * About section content
 */

export const ABOUT_TITLE = "About Me";

export const ABOUT_TAGLINE =
  "I'm a New Graduate Software Engineer with a passion for Simulations and Automation.";

export const ABOUT_PARAGRAPHS = [
  "I graduated with B.A & M.S degrees in Computer Science & Applied Mathematics in the year 2025",
  "I have a strong passion in building projects that intersect programming with Math & other Sciences",
  "I love to build, tinker, & break stuff in my free time (In addition to self-hosting my own services)",
  "I aim to be a T-shaped engineer by building projects & learning from engineering experts",
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
