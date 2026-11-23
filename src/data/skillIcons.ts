/**
 * Maps skill/badge names to Simple Icons slugs.
 * Data loaded from skillIcons.json for easy editing.
 * Slugs are Simple Icons names (https://simpleicons.org/); paths come from the
 * `simple-icons` package in src/lib/tool-icon.ts.
 */

import skillIconsJson from "./skillIcons.json";

export const SKILL_ICON_SLUGS: Record<string, string> = skillIconsJson as Record<string, string>;

export function getSkillIconSlug(skill: string): string | null {
  const normalized = skill.trim();
  return SKILL_ICON_SLUGS[normalized] ?? null;
}
