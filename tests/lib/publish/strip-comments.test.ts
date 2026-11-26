import { describe, it, expect } from "vitest";
import { stripPrivateComments } from "@/lib/publish/strip-comments";

describe("stripPrivateComments", () => {
  it("removes an inline %% comment", () => {
    expect(stripPrivateComments("keep %% secret %% this")).toBe("keep  this");
  });

  it("removes a comment that spans several lines", () => {
    const src = "before\n\n%% private\nline two\n%%\n\nafter";
    expect(stripPrivateComments(src)).toBe("before\n\nafter");
  });

  it("removes every comment in the body", () => {
    expect(stripPrivateComments("%%a%% x %%b%%")).toBe(" x ");
  });

  it("leaves text without comments unchanged", () => {
    const src = "plain body\n\nwith $math$ and [[link]]";
    expect(stripPrivateComments(src)).toBe(src);
  });
});
