/**
 * Owner configuration — single source of truth for personal info, social links, and availability.
 * Edit this file to update anything identity-related without touching component code.
 */

export interface SocialLinks {
  github: { url: string; label: string };
  gitlab: { url: string; label: string };
  linkedin: { url: string };
  discord: { url: string };
}

export interface OwnerConfig {
  name: string;
  email: string;
  /** Intro greeting displayed on the home hero */
  intro: string;
  social: SocialLinks;
  availability: {
    open: boolean;
    text: string;
  };
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
  intro: "Hi, I'm Viet",
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
    discord: { url: "https://discord.com/users/463366284940410910" },
  },
  availability: {
    open: true,
    text: "open to new opportunities & challenges",
  },
  giscus: {
    repo: "vietbui1999ru/vietbui1999ru.github.io",
    repoId: "R_kgDOQp69TA",
    category: "General",
    categoryId: "DIC_kwDOQp69TM4C9SY7",
  },
};
