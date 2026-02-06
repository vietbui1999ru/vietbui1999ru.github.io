/**
 * Home section content — edit this file to customize intro text, gradients, and hero copy.
 * All modifiable strings and config are centralized here for easy updates.
 */

/** First line of the intro (before the name highlight) */
export const INTRO_LINE1 = "Hello, my name is Viet";

/** Second line prefix before the rotating words */
export const INTRO_LINE2 = "I'm a ";

/** Typing animation: delay between each character (ms) */
export const INTRO_TYPING_SPEED = 100;

/** Typing animation: delay before first character (ms) */
export const INTRO_INITIAL_DELAY = 10;

/** Neon spectrum for the intro line (customize gradient or use color for single color) */
export const INTRO_GRADIENT =
	"linear-gradient(90deg, var(--chart-1) 0%, var(--primary) 25%, var(--accent) 50%, var(--primary) 75%, var(--chart-1) 100%)";

/** Gradient for the highlighted name "Viet" (or use a single color via highlightComponentProps) */
export const VIET_GRADIENT =
	"linear-gradient(90deg, #ffffff 0%, #ef4444 50%, #ffffff 100%)";

/** Words that rotate after "I'm a" — edit to change roles/titles */
export const INTRO_ROTATING_WORDS = ["Tinkerer", "Builder", "Fixer"] as const;

/** Duration (ms) for each word in the rotating text */
export const INTRO_ROTATING_DURATION = 2000;

/** Scroll-driven Singularity: min value when scrolled (0–1) */
export const SINGULARITY_SCROLL_MIN = 0.1;

/** Scroll-driven Singularity: max value at top (0–1) */
export const SINGULARITY_SCROLL_MAX = 1.0;

/** How much the black hole size range scales (larger = more dramatic resize on scroll) */
export const SINGULARITY_SIZE_RESIZE_FACTOR = 2.0;

/** Delay (ms) after typing finishes before showing the rotating text */
export const INTRO_ROTATING_DELAY_AFTER_TYPING = 800;
