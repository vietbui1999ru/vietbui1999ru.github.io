import { z } from "astro/zod";
import GardenIdentity from "./GardenIdentity.svelte";
import GardenFocus from "./GardenFocus.svelte";
import GardenFeed from "./GardenFeed.svelte";
import GardenAboutProse from "./GardenAboutProse.svelte";
import GardenExperience from "./GardenExperience.svelte";
import GardenEducation from "./GardenEducation.svelte";
import { resolveBlocks, type BlockDef } from "@/lib/garden-blocks";

// Every page block: one component plus the props its note may set.
// A new block is a component, a schema here, and a /ui-lab fixture.
export const gardenRegistry = {
  identity: { component: GardenIdentity, props: z.object({}) },
  focus: { component: GardenFocus, props: z.object({}) },
  feed: {
    component: GardenFeed,
    props: z.object({ limit: z.number().int().positive().default(8) }),
  },
  "about-prose": { component: GardenAboutProse, props: z.object({}) },
  experience: { component: GardenExperience, props: z.object({}) },
  education: { component: GardenEducation, props: z.object({}) },
} satisfies Record<string, BlockDef<unknown>>;

export type GardenBlockId = keyof typeof gardenRegistry;

export function resolveGardenBlocks(note: string, blocks: unknown[]) {
  return resolveBlocks(note, blocks, gardenRegistry);
}
