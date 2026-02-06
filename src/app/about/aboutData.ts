/**
 * About section content — edit this file to customize your About section.
 * All text and structure is centralized here for easy updates.
 */

export const ABOUT_TAGLINE =
	"Early Career Computer Scientist / Software Engineer with a passion for Simulations and Automation.";

export const ABOUT_PARAGRAPHS = [
	"I have backgrounds in Computer Science and Applied Mathematics, and a strong interest in the intersection of Math and Sciences.",
	"I am currently working as a Research Engineer at Carboncopies org. Remote, USA.",
	"I am building personal projects that will teach me to become a 10x engineer (hopefully).",
	"In my free time, I enjoy cooking and grinding PoE2.",
] as const;

export const ABOUT_CURRENT_ROLE = {
	title: "Research Engineer",
	org: "Carboncopies org",
	location: "Remote, USA",
} as const;

/** Badges for interests / skills — shown as pills in the About section */
export const ABOUT_INTERESTS = [
	"Simulations",
	"Automation",
	"Computer Science",
	"Applied Mathematics",
	"Math × Science",
] as const;

/** Hobbies / free-time — optional, for a small "When I'm not coding" block */
export const ABOUT_HOBBIES = ["Cooking", "PoE2"] as const;
