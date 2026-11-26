// Manual TLDR for one post. Usage: npm run tldr -- <path/to/post.md>
// Writes <stem>.tldr.md beside the post, or prints why it skipped.
import path from "node:path";
import { makeTldrGenerator, PiUnavailableError } from "../src/lib/publish/pi-tldr";
import { writeTldrDraft } from "../src/lib/publish/tldr-draft";

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file || !file.endsWith(".md")) {
    console.error("usage: npm run tldr -- <path/to/post.md>");
    process.exit(2);
  }
  try {
    const outcome = await writeTldrDraft(path.resolve(file), makeTldrGenerator());
    if (outcome.status === "created") console.log(`draft written: ${outcome.file}`);
    else if (outcome.status === "exists") console.log(`skipped: ${outcome.file} already exists`);
    else {
      console.error(`failed: ${outcome.reason}`);
      process.exit(1);
    }
  } catch (err) {
    if (err instanceof PiUnavailableError) {
      console.error(`skipped: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
