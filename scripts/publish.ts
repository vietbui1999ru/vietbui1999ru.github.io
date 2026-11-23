// Wiring only: all logic lives in src/lib/publish/. Usage: npm run publish [-- --dry-run]
import { runPublish } from "../src/lib/publish/publish";

async function main(): Promise<void> {
  const personal = process.env.PERSONAL_VAULT;
  if (!personal) {
    console.error("PERSONAL_VAULT is not set. Add it to mise.local.toml.");
    process.exit(1);
  }
  const target = process.env.PORTFOLIO_VAULT ?? "vendor/vault";
  const dryRun = process.argv.includes("--dry-run");

  const { plan, committed, skipped } = await runPublish({
    vaultRoot: personal,
    targetRoot: target,
    dryRun,
  });
  for (const rel of plan.created) console.log(`new      ${rel}`);
  for (const rel of plan.changed) console.log(`changed  ${rel}`);
  for (const rel of plan.removed) console.log(`removed  ${rel}`);
  for (const s of skipped) console.log(`skipped  ${s.relPath} (${s.reason})`);
  if (dryRun) console.log("dry run: target working tree written, nothing committed or pushed");
  else console.log(committed ? "published: committed and pushed" : "nothing to publish");
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
