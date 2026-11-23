import { describe, it, expect, afterEach } from "vitest";
import {
  generateTldr,
  checkPiReady,
  makeTldrGenerator,
  spawnLimited,
  stripFrontmatter,
  DEFAULT_TLDR_MODEL,
  PI_FIXED_FLAGS,
  TLDR_SYSTEM_PROMPT,
  PiUnavailableError,
} from "@/lib/publish/pi-tldr";

const BODY = "Paragraph one.\n\n" + "Filler sentence. ".repeat(200) + "\n\nLAST LINE OF THE POST.";

afterEach(() => {
  delete process.env.TLDR_MODEL;
});

function capture(output = "A short summary.\n") {
  const calls: Array<{ args: string[]; env: Record<string, string> }> = [];
  const run = async (args: string[], env: Record<string, string>) => {
    calls.push({ args, env });
    return output;
  };
  return { calls, run };
}

describe("generateTldr argv", () => {
  it("is the model, system prompt, fixed flags and prompt, in that order", async () => {
    const { calls, run } = capture();
    const out = await generateTldr({ title: "Post", body: BODY, run });
    expect(out).toBe("A short summary.");
    const [{ args }] = calls;
    expect(args.slice(0, 4)).toEqual([
      "--model",
      DEFAULT_TLDR_MODEL,
      "--system-prompt",
      TLDR_SYSTEM_PROMPT,
    ]);
    expect(args.slice(4, 4 + PI_FIXED_FLAGS.length)).toEqual([...PI_FIXED_FLAGS]);
    expect(args).toHaveLength(4 + PI_FIXED_FLAGS.length + 1);
    expect(args.at(-2)).toBe("-p");
  });

  it("disables tools and MCP", () => {
    expect(PI_FIXED_FLAGS).toContain("--no-tools");
    expect(PI_FIXED_FLAGS).toContain("--no-mcp");
    expect(PI_FIXED_FLAGS).toContain("--no-session");
    expect(PI_FIXED_FLAGS).toContain("--no-extensions");
    expect(PI_FIXED_FLAGS).toContain("--no-skills");
  });

  it("passes the full post body inside nonce markers", async () => {
    const { calls, run } = capture();
    await generateTldr({ title: "Post", body: BODY, run });
    const prompt = calls[0].args.at(-1)!;
    expect(prompt).toContain("LAST LINE OF THE POST.");
    expect(prompt).toMatch(/<<<ARTICLE ([0-9a-f]+)>>>/);
  });

  it("has no extra-args path: caller-supplied flags never reach argv", async () => {
    const { calls, run } = capture();
    await generateTldr({
      title: "Post",
      body: BODY,
      run,
      extraArgs: ["--tools", "read"],
    } as unknown as Parameters<typeof generateTldr>[0]);
    expect(calls[0].args).not.toContain("--tools");
    expect(calls[0].args).not.toContain("read");
  });

  it("uses TLDR_MODEL when set", async () => {
    process.env.TLDR_MODEL = "opencode-go/other:low";
    const { calls, run } = capture();
    await generateTldr({ title: "Post", body: BODY, run });
    expect(calls[0].args[1]).toBe("opencode-go/other:low");
  });

  it("rejects model values that start with a dash or contain whitespace", async () => {
    for (const model of ["-x", "a b", "", "m\tn"]) {
      const { calls, run } = capture();
      await expect(generateTldr({ title: "P", body: BODY, model, run })).rejects.toThrow(
        /invalid TLDR model/,
      );
      expect(calls).toHaveLength(0);
    }
  });
});

describe("generateTldr environment", () => {
  it("passes only PATH and HOME to the child", async () => {
    process.env.SECRET_TOKEN = "must-not-leak";
    process.env.TLDR_MODEL = "opencode-go/other:low";
    try {
      const { calls, run } = capture();
      await generateTldr({ title: "Post", body: BODY, run });
      expect(Object.keys(calls[0].env).sort()).toEqual(["HOME", "PATH"]);
    } finally {
      delete process.env.SECRET_TOKEN;
    }
  });
});

describe("model output", () => {
  it("strips a leading frontmatter block", async () => {
    const { run } = capture("---\npublish: true\ntitle: owned\n---\nThe summary.");
    expect(await generateTldr({ title: "Post", body: BODY, run })).toBe("The summary.");
  });

  it("strips frontmatter only at the start", () => {
    expect(stripFrontmatter("text\n---\nkeep\n---\n")).toBe("text\n---\nkeep\n---");
  });

  it("rejects empty output", async () => {
    const { run } = capture("   \n");
    await expect(generateTldr({ title: "Post", body: BODY, run })).rejects.toThrow(/empty/);
  });

  it("rejects output that is only frontmatter", async () => {
    const { run } = capture("---\npublish: true\n---\n");
    await expect(generateTldr({ title: "Post", body: BODY, run })).rejects.toThrow(/empty/);
  });
});

describe("readiness", () => {
  it("runs pi auth check through the same runner with the minimal env", async () => {
    const { calls, run } = capture("{}");
    await checkPiReady("opencode-go/deepseek-v4.1-flash:low", run);
    expect(calls[0].args).toEqual([
      "auth",
      "check",
      "--model",
      "opencode-go/deepseek-v4.1-flash:low",
      "--no-refresh",
      "--json",
    ]);
    expect(Object.keys(calls[0].env).sort()).toEqual(["HOME", "PATH"]);
  });

  it("reports a failed check as unavailable", async () => {
    const run = async () => {
      throw new Error("pi exited with 1");
    };
    await expect(checkPiReady("m", run)).rejects.toBeInstanceOf(PiUnavailableError);
  });

  it("makeTldrGenerator skips every post when the check fails", async () => {
    const run = async () => {
      throw new Error("not logged in");
    };
    const generate = makeTldrGenerator({ model: "m", run });
    await expect(generate("A", "body")).rejects.toBeInstanceOf(PiUnavailableError);
    await expect(generate("B", "body")).rejects.toBeInstanceOf(PiUnavailableError);
  });
});

describe("spawnLimited", () => {
  const node = process.execPath;
  const env = minimalEnvForTest();

  it("kills the child on timeout", async () => {
    const started = Date.now();
    await expect(
      spawnLimited(node, ["-e", "setTimeout(() => {}, 60000)"], env, {
        timeoutMs: 300,
        maxBytes: 1024,
      }),
    ).rejects.toThrow(/timed out/);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it("kills the child when output exceeds the cap", async () => {
    await expect(
      spawnLimited(node, ["-e", "process.stdout.write('x'.repeat(5000))"], env, {
        timeoutMs: 10_000,
        maxBytes: 100,
      }),
    ).rejects.toThrow(/exceeded/);
  });

  it("maps a missing binary to unavailable", async () => {
    await expect(
      spawnLimited("definitely-not-a-real-binary-xyz", [], env, {
        timeoutMs: 1000,
        maxBytes: 100,
      }),
    ).rejects.toBeInstanceOf(PiUnavailableError);
  });
});

function minimalEnvForTest(): Record<string, string> {
  return { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" };
}
