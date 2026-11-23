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
          html: "<p>UI_LAB_PLACEHOLDER focus text with <strong>bold</strong>.</p>",
          tools: ["Networking", "NixOS", "OPNsense"],
        },
      ],
    },
  },
  feed: { props: { limit: 2 }, context: { items: UI_LAB_FEED } },
  "about-prose": { props: {}, body: UI_LAB_BODY },
  experience: { props: {} },
  education: { props: {} },
  toc: {
    props: { minHeadings: 3, maxDepth: 3 },
    context: {
      headings: [
        { depth: 2, slug: "ui-lab-one", text: "UI_LAB_PLACEHOLDER one" },
        { depth: 3, slug: "ui-lab-one-a", text: "UI_LAB_PLACEHOLDER one a" },
        { depth: 2, slug: "ui-lab-two", text: "UI_LAB_PLACEHOLDER two" },
      ],
    },
  },
  backlinks: {
    props: {},
    context: {
      backlinks: [
        { url: "/blog/ui-lab-linking-a", title: "UI_LAB_PLACEHOLDER linking note one" },
        { url: "/thoughts#ui-lab-linking-b", title: "UI_LAB_PLACEHOLDER linking note two" },
      ],
    },
  },
};
