import { describe, expect, it } from "vitest";
import { thoughtSchema } from "@/content/schemas";
import { publishedNewestFirst } from "@/lib/thoughts";

describe("thought publishing", () => {
  it("defaults unpublished thoughts to private", () => {
    expect(thoughtSchema.parse({ date: "2026-10-01" })).toMatchObject({
      publish: false,
    });
  });

  it("only returns published thoughts, newest first", () => {
    const entries = [
      { data: thoughtSchema.parse({ date: "2026-09-30", publish: true }) },
      { data: thoughtSchema.parse({ date: "2026-10-01" }) },
      { data: thoughtSchema.parse({ date: "2026-10-02", publish: true }) },
    ];

    expect(publishedNewestFirst(entries).map((entry) => entry.data.date.toISOString())).toEqual([
      "2026-10-02T00:00:00.000Z",
      "2026-09-30T00:00:00.000Z",
    ]);
  });
});
