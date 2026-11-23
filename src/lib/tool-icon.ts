import * as simpleIcons from "simple-icons";
import { getSkillIconSlug } from "@/data/skillIcons";

type IconData = { path: string };

/** SVG path for a tool name, via its skill icon slug. Null when there is no icon. */
export function getToolIconPath(tool: string): string | null {
  const slug = getSkillIconSlug(tool);
  if (!slug) return null;
  // simple-icons exports each icon as si<Title>, e.g. siNixos, siNextdotjs.
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const icon = (simpleIcons as unknown as Record<string, IconData | undefined>)[key];
  return icon?.path ?? null;
}
