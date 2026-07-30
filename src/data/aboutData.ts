/**
 * About section content
 */

export const ABOUT_TAGLINE =
  "I'm a Software Engineer with a passion for all things Simulation and Automation.";

export const ABOUT_PARAGRAPHS = [
  "An avid AFOL. My second profession is stay-at-home mediocre chef. Dabble in gaming, emulation, & self-hosting. Currently learning how to sleep and journal better. Battling my inner demons on what to learn & document next. Read more about what I do in my profile",
  "",
  "Experienced in working in R&D, from formal verification & software safety to frontier work in Biophysical Brain Emulation.",
  "Passionate in mixing programming with Math & Natural Sciences, for educational & professional purposes.",
  "Love everything Tech & Gadgets. Like to repurpose old electronics for my personal curiosity.",
  "Aim to be a T-shaped engineer through learning & collaborating.",
] as const;

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
