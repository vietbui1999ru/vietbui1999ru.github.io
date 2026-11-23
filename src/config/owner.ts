/**
 * Owner configuration — single source of truth for personal info and social links.
 * Edit this file to update anything identity-related without touching component code.
 */

export interface SocialLinks {
  github: { url: string; label: string };
  gitlab: { url: string; label: string };
  linkedin: { url: string };
}

export interface OwnerConfig {
  name: string;
  email: string;
  social: SocialLinks;
  giscus: {
    repo: `${string}/${string}`;
    repoId: string;
    category: string;
    categoryId: string;
  };
}

export const OWNER: OwnerConfig = {
  name: "Viet Bui",
  email: "buiquocviet99@gmail.com",
  social: {
    github: {
      url: "https://github.com/vietbui1999ru",
      label: "My GitHub profile",
    },
    gitlab: {
      url: "https://gitlab.com/vietbui1999ru",
      label: "My GitLab profile",
    },
    linkedin: { url: "https://linkedin.com/in/vietbui99" },
  },
  giscus: {
    repo: "vietbui1999ru/vietbui1999ru.github.io",
    repoId: "R_kgDOQp69TA",
    category: "General",
    categoryId: "DIC_kwDOQp69TM4C9SY7",
  },
};
