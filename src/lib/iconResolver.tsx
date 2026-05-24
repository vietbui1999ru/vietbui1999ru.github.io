import {
  SiGithub,
  SiGitlab,
  SiFigma,
  SiVercel,
  SiNetlify,
  SiNpm,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { ExternalLink, Globe, Link2, FileText, Play } from "lucide-react";
import type { ComponentType } from "react";

type IconProps = { className?: string; size?: number | string };

const SI_ICONS: Record<string, ComponentType<IconProps>> = {
  github: SiGithub,
  gitlab: SiGitlab,
  figma: SiFigma,
  vercel: SiVercel,
  netlify: SiNetlify,
  npm: SiNpm,
  youtube: SiYoutube,
};

const LUCIDE_ICONS: Record<string, ComponentType<IconProps>> = {
  "external-link": ExternalLink,
  globe: Globe,
  link: Link2,
  "file-text": FileText,
  play: Play,
};

export function resolveIcon(slug: string): ComponentType<IconProps> {
  const key = slug.toLowerCase();
  return SI_ICONS[key] ?? LUCIDE_ICONS[key] ?? ExternalLink;
}
