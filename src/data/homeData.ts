/**
 * Home section content — edit this file to customize gradients and hero copy.
 * Intro text and personal info live in src/config/owner.ts.
 */

import { ABOUT_TAGLINE } from "./aboutData";
import { OWNER } from "@/config/owner";

export const INTRO_LINE1 = OWNER.intro;
export const INTRO_TYPING_SPEED = 100;
export const INTRO_INITIAL_DELAY = 10;
export const INTRO_GRADIENT =
  "linear-gradient(90deg, var(--chart-1) 0%, var(--primary) 25%, var(--accent) 50%, var(--primary) 75%, var(--chart-1) 100%)";
export const VIET_GRADIENT = "linear-gradient(90deg, #ffffff 0%, #eb3500 50%, #ffffff 100%)";
export const HOME_TAGLINE = ABOUT_TAGLINE;
