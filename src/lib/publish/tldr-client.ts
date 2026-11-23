import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execPi = promisify(execFile);

export const DEFAULT_TLDR_MODEL = "opencode-go/deepseek-v4.1-flash:low";

/** `pi` is not installed on this machine. Generation is skipped, not failed. */
export class PiMissingError extends Error {}

/** Runs `pi` with an argument array. Resolves to stdout. Injected so tests never reach a model. */
export type PiRunner = (file: string, args: string[]) => Promise<string>;

// No shell: the prompt, which carries the whole post, is one argv element.
export const runPi: PiRunner = async (file, args) => {
  try {
    const { stdout } = await execPi(file, args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PiMissingError("pi is not installed");
    }
    throw err;
  }
};

export function tldrPrompt(title: string, body: string): string {
  return [
    "Write a TLDR of the blog post below, in the post's own voice.",
    "A few sentences, then up to five bullet takeaways. Output only the TLDR text.",
    `Post title: ${title}`,
    "",
    "--- POST ---",
    body,
    "--- END POST ---",
  ].join("\n");
}

export async function generateTldr(opts: {
  title: string;
  body: string;
  model?: string;
  run?: PiRunner;
}): Promise<string> {
  const model = opts.model ?? process.env.TLDR_MODEL ?? DEFAULT_TLDR_MODEL;
  const args = [
    "--model",
    model,
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "-p",
    tldrPrompt(opts.title, opts.body),
  ];
  const out = await (opts.run ?? runPi)("pi", args);
  return out.trim();
}
