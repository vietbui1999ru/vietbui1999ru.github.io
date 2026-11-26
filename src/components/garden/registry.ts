import { z } from "astro/zod";
import GardenIdentity from "./GardenIdentity.svelte";
import GardenFocus from "./GardenFocus.astro";
import GardenFeed from "./GardenFeed.svelte";
import GardenCurrently from "./GardenCurrently.svelte";
import GardenAboutProse from "./GardenAboutProse.svelte";
import GardenExperience from "./GardenExperience.astro";
import GardenEducation from "./GardenEducation.astro";
import GardenToc from "./GardenToc.svelte";
import GardenBacklinks from "./GardenBacklinks.svelte";
import { resolveBlocks, type BlockDef } from "@/lib/garden-blocks";
import { TOC_DEFAULTS } from "@/lib/toc";

// Every page block: one component plus the props its note may set.
// A new block is a component, a schema here, and a /ui-lab fixture.
export const gardenRegistry = {
  identity: { component: GardenIdentity, props: z.object({}).strict() },
  focus: { component: GardenFocus, props: z.object({}).strict() },
  feed: {
    component: GardenFeed,
    props: z
      .object({
        limit: z.number().int().positive().default(8),
        // Which kinds the feed shows; the component defaults to posts and thoughts.
        sources: z.array(z.enum(["blog", "thought", "library"])).min(1).optional(),
      })
      .strict(),
  },
  currently: { component: GardenCurrently, props: z.object({}).strict() },
  "about-prose": { component: GardenAboutProse, props: z.object({}).strict() },
  experience: { component: GardenExperience, props: z.object({}).strict() },
  education: { component: GardenEducation, props: z.object({}).strict() },
  toc: {
    component: GardenToc,
    props: z
      .object({
        minHeadings: z.number().int().min(0).default(TOC_DEFAULTS.minHeadings),
        maxDepth: z.number().int().min(2).max(6).default(TOC_DEFAULTS.maxDepth),
      })
      .strict(),
  },
  backlinks: { component: GardenBacklinks, props: z.object({}).strict() },
} satisfies Record<string, BlockDef<unknown>>;

export type GardenBlockId = keyof typeof gardenRegistry;

export function resolveGardenBlocks(note: string, blocks: unknown[]) {
  return resolveBlocks(note, blocks, gardenRegistry);
}
