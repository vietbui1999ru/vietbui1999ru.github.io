/**
 * Achievements section content
 */

export type AchievementItem = {
  title: string;
  content: string;
  url?: string;
  image?: string;
};

export const ACHIEVEMENTS_ITEMS: AchievementItem[] = [
  {
    title: "Hacktoberfest 2025 participant",
    content:
      "I ranked 14th on the leaderboard on Block Company's open-source Goose AI Agent repository.",
    url: "https://github.com/block/goose/issues/4775",
    image: "/images/achievement.jpg",
  },
];
