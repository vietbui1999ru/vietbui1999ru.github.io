/**
 * Skill groups for the skills data. Identity copy now lives in the vault (Site/About.md).
 */

// Skills data now abstracted, see skillsData.json
// All previous ABOUT_CURRENT_ROLE, ABOUT_INTERESTS, ABOUT_HOBBIES removed per instruction.
export type SkillType = {
  type: string; // e.g "Programming Languages"
  skills: Array<{
    name: string;
    icon: string; // Icon component name or path
  }>;
};

import skillsData from "./skillsData.json";
export const SKILLS_CATEGORIES: SkillType[] = skillsData;
