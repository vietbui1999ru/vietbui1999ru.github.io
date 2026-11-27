import { describe, expect, it } from "vitest";
import { furthest, pointerTarget } from "@/lib/reading-highlight";

describe("reading highlight progress", () => {
  it("furthest returns next when there is no current position", () => {
    expect(furthest(null, { node: 1, offset: 4 })).toEqual({ node: 1, offset: 4 });
  });

  it("furthest keeps the later position in document order", () => {
    const a = { node: 0, offset: 10 };
    const b = { node: 1, offset: 2 };
    expect(furthest(a, b)).toEqual(b);
    expect(furthest(b, a)).toEqual(b);
    expect(furthest({ node: 1, offset: 5 }, { node: 1, offset: 3 })).toEqual({ node: 1, offset: 5 });
    expect(furthest({ node: 1, offset: 3 }, { node: 1, offset: 5 })).toEqual({ node: 1, offset: 5 });
  });

  it("pointerTarget returns the caret when the caret is inside the block", () => {
    const end = { node: 2, offset: 9 };
    expect(pointerTarget({ caret: { node: 0, offset: 3 }, below: false, end })).toEqual({ node: 0, offset: 3 });
  });

  it("pointerTarget returns the block end when the pointer is below the block", () => {
    const end = { node: 2, offset: 9 };
    expect(pointerTarget({ caret: null, below: true, end })).toEqual(end);
  });

  it("pointerTarget returns null when the caret is outside and the pointer is not below", () => {
    expect(pointerTarget({ caret: null, below: false, end: { node: 0, offset: 1 } })).toBeNull();
  });
});
