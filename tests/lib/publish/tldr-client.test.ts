import { describe, it, expect, afterEach } from "vitest";
import { generateTldr, PiMissingError, DEFAULT_TLDR_MODEL } from "@/lib/publish/tldr-client";

const BODY = "Paragraph one.\n\n" + "Filler sentence. ".repeat(200) + "\n\nLAST LINE OF THE POST.";

afterEach(() => {
  delete process.env.TLDR_MODEL;
});

describe("generateTldr", () => {
  it("spawns pi with an argument array, no shell, and the default model", async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const run = async (file: string, args: string[]) => {
      calls.push({ file, args });
      return "A short summary.\n";
    };
    const out = await generateTldr({ title: "Post", body: BODY, run });

    expect(out).toBe("A short summary.");
    expect(calls).toHaveLength(1);
    expect(calls[0].file).toBe("pi");
    expect(calls[0].args.slice(0, 7)).toEqual([
      "--model",
      DEFAULT_TLDR_MODEL,
      "--no-session",
      "--no-extensions",
      "--no-skills",
      "-p",
      expect.any(String),
    ]);
  });

  it("passes the full post body in the prompt", async () => {
    let prompt = "";
    await generateTldr({
      title: "Post",
      body: BODY,
      run: async (_f, args) => {
        prompt = args[args.length - 1];
        return "x";
      },
    });
    expect(prompt).toContain("LAST LINE OF THE POST.");
  });

  it("uses TLDR_MODEL when set", async () => {
    process.env.TLDR_MODEL = "opencode-go/other:low";
    let model = "";
    await generateTldr({
      title: "Post",
      body: BODY,
      run: async (_f, args) => {
        model = args[1];
        return "x";
      },
    });
    expect(model).toBe("opencode-go/other:low");
  });

  it("reports a missing pi as PiMissingError", async () => {
    const run = async () => {
      throw new PiMissingError("pi is not installed");
    };
    await expect(generateTldr({ title: "Post", body: BODY, run })).rejects.toBeInstanceOf(
      PiMissingError,
    );
  });
});
