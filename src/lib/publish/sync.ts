import fs from "node:fs/promises";
import path from "node:path";

// Records every file this tool wrote, so a later run can remove what left the set.
export const MANIFEST = ".publish-manifest.json";

export type Content = string | Buffer;

export interface SyncPlan {
  created: string[];
  changed: string[];
  unchanged: string[];
  removed: string[];
}

/** True when rel is a relative path that stays inside targetRoot. */
export function isInsideTarget(targetRoot: string, rel: string): boolean {
  if (typeof rel !== "string" || rel === "" || path.isAbsolute(rel)) return false;
  const root = path.resolve(targetRoot);
  return path.resolve(root, rel).startsWith(root + path.sep);
}

/** Manifest entries, without anything that is not a path inside targetRoot. */
export async function readManifest(targetRoot: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(path.join(targetRoot, MANIFEST), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((rel): rel is string => isInsideTarget(targetRoot, rel));
  } catch {
    return [];
  }
}

async function readExisting(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

/** Diff the desired files against the target tree. Only manifest entries can be removed. */
export async function planSync(
  targetRoot: string,
  desired: Record<string, Content>,
  previous: string[],
): Promise<SyncPlan> {
  const plan: SyncPlan = { created: [], changed: [], unchanged: [], removed: [] };
  for (const rel of Object.keys(desired).sort()) {
    const current = await readExisting(path.join(targetRoot, rel));
    const next = Buffer.isBuffer(desired[rel]) ? desired[rel] : Buffer.from(desired[rel]);
    if (current === null) plan.created.push(rel);
    else if (current.equals(next)) plan.unchanged.push(rel);
    else plan.changed.push(rel);
  }
  for (const rel of [...previous].sort()) {
    if (!(rel in desired)) plan.removed.push(rel);
  }
  return plan;
}

/** Write created and changed files, delete removed ones, and refresh the manifest. */
export async function applySync(
  targetRoot: string,
  desired: Record<string, Content>,
  plan: SyncPlan,
): Promise<void> {
  for (const rel of [...plan.created, ...plan.changed]) {
    const file = path.join(targetRoot, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, desired[rel]);
  }
  for (const rel of plan.removed) {
    if (!isInsideTarget(targetRoot, rel)) throw new Error(`refusing to remove ${rel}: outside target`);
    await fs.rm(path.join(targetRoot, rel), { force: true });
  }
  await fs.writeFile(
    path.join(targetRoot, MANIFEST),
    JSON.stringify(Object.keys(desired).sort(), null, 2) + "\n",
  );
}
