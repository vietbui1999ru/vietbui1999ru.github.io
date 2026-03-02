/**
 * Maps skill/badge names to Simple Icons slugs.
 * Data loaded from skillIcons.json for easy editing.
 * Icons from https://simpleicons.org/ via @icons-pack/react-simple-icons
 */

import skillIconsJson from "./skillIcons.json";

export const SKILL_ICON_SLUGS: Record<string, string> =
  skillIconsJson as Record<string, string>;

export function getSkillIconSlug(skill: string): string | null {
  const normalized = skill.trim();
  return SKILL_ICON_SLUGS[normalized] ?? null;
}
