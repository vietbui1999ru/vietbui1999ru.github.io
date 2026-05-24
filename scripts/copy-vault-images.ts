import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(THIS_DIR, "..");

const VAULT_PROJECTS = path.join(ROOT, "vendor/vault/Portfolio/Projects");
const VAULT_ASSETS = path.join(ROOT, "vendor/vault/Assets/Projects");
const PUBLIC_ASSETS = path.join(ROOT, "public/assets/projects");

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

function copyImage(slug: string, filename: string): void {
  const src = path.join(VAULT_ASSETS, slug, filename);
  const destDir = path.join(PUBLIC_ASSETS, slug);
  const dest = path.join(destDir, filename);

  if (!fs.existsSync(src)) {
    console.warn(`  [warn] missing vault image: Assets/Projects/${slug}/${filename}`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  [copy] ${filename} -> public/assets/projects/${slug}/`);
}

function processProject(mdPath: string): void {
  const raw = fs.readFileSync(mdPath, "utf-8");
  const { data } = matter(raw);
  const slug = path.basename(mdPath, ".md");

  console.log(`[project] ${slug}`);

  const imagesToCopy: string[] = [];

  if (data.cover && typeof data.cover === "string" && !isUrl(data.cover)) {
    imagesToCopy.push(data.cover);
  }

  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (typeof img === "string" && !isUrl(img) && !imagesToCopy.includes(img)) {
        imagesToCopy.push(img);
      }
    }
  }

  for (const filename of imagesToCopy) {
    copyImage(slug, filename);
  }
}

function main(): void {
  if (!fs.existsSync(VAULT_PROJECTS)) {
    console.log("vault/Portfolio/Projects not found — skipping image copy");
    return;
  }

  const mdFiles = fs
    .readdirSync(VAULT_PROJECTS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(VAULT_PROJECTS, f));

  if (mdFiles.length === 0) {
    console.log("No project markdown files found — skipping");
    return;
  }

  console.log(`Copying vault images for ${mdFiles.length} project(s)...`);
  for (const mdPath of mdFiles) {
    processProject(mdPath);
  }
  console.log("Done.");
}

main();
