import type { GardenBlockId } from "@/components/garden/registry";
import type { FeedItem } from "@/lib/garden-feed";

/** One /ui-lab fixture per registry block. Copy is placeholder text only. */
export type GardenBlockFixture = {
  props: Record<string, unknown>;
  body?: string;
  context?: Record<string, unknown>;
};

const UI_LAB_BODY = "<p>UI_LAB_PLACEHOLDER body copy for layout review.</p>";

const UI_LAB_FEED: FeedItem[] = [
  { kind: "blog", title: "UI_LAB_PLACEHOLDER post", date: new Date("2026-03-01"), href: "#" },
  { kind: "thought", date: new Date("2026-02-01"), href: "#" },
];

export const GARDEN_BLOCK_FIXTURES: Record<GardenBlockId, GardenBlockFixture> = {
  identity: { props: {}, body: UI_LAB_BODY },
  focus: {
    props: {},
    context: {
      areas: [
        {
          id: "focus/ui-lab-a",
          title: "UI_LAB_PLACEHOLDER area",
          text: "UI_LAB_PLACEHOLDER focus text.",
          tools: ["Networking", "NixOS", "OPNsense"],
        },
      ],
    },
  },
  feed: { props: { limit: 2 }, context: { items: UI_LAB_FEED } },
  "about-prose": { props: {}, body: UI_LAB_BODY },
  experience: { props: {} },
  education: { props: {} },
};
