import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { fileURLToPath } from "url";

type SVGFile = {
  name: string;
  content: string;
};

type ProcessedFile = {
  fileName: string;
  tsFileName: string;
  tsContent: string;
  viewBox: string;
  pathKeys: string[];
  pathCount: number;
};

const THIS_FILE = fileURLToPath(import.meta.url);
const THIS_DIR = path.dirname(THIS_FILE);

const ROOT_DIR = path.resolve(THIS_DIR, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const IMPORTS_DIR = path.join(ROOT_DIR, "src", "imports");

function slugifyFileName(fileName: string): string {
  const base = fileName.replace(/\.svg$/i, "");
  // Remove non-alphanumeric, collapse spaces, lowercase
  const slug = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();

  return slug || "icon";
}

function extractViewBox(svg: string): string {
  const match = svg.match(/viewBox=["']([^"']+)["']/i);
  return match ? match[1] : "0 0 100 100";
}

function extractPaths(svg: string): string[] {
  const paths: string[] = [];
  const pathRegex = /<path\b[^>]*\bd=(?:"([^"]+)"|'([^']+)')[^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(svg)) !== null) {
    const d = match[1] ?? match[2];
    if (d) paths.push(d);
  }
  return paths;
}

function generatePathKey(d: string): string {
  const hash = crypto.createHash("md5").update(d).digest("hex").slice(0, 8);
  return `p${hash}`;
}

function processSVGFiles(files: SVGFile[]): ProcessedFile[] {
  return files.map((file) => {
    const viewBox = extractViewBox(file.content);
    const paths = extractPaths(file.content);

    const keyMap = new Map<string, string>();
    const pathKeys = paths.map((d) => {
      const key = generatePathKey(d);
      keyMap.set(key, d);
      return key;
    });

    const entries = Array.from(keyMap.entries())
      .map(([key, d]) => `  ${key}: ${JSON.stringify(d)},`)
      .join("\n");

    const tsContent = `export default {\n${entries}\n} as const;\n`;

    const baseSlug = slugifyFileName(file.name);
    const tsFileName = `${baseSlug}.ts`;

    return {
      fileName: file.name,
      tsFileName,
      tsContent,
      viewBox,
      pathKeys,
      pathCount: pathKeys.length,
    };
  });
}

function formatSummary(processed: ProcessedFile[]): string {
  const lines = processed.map(
    (f) =>
      `- ${f.fileName} → ${f.tsFileName} (${f.pathCount} paths, viewBox="${f.viewBox}")`,
  );
  return [`Processed ${processed.length} SVG file(s):`, ...lines].join("\n");
}

async function readSVGFilesFromPublic(): Promise<SVGFile[]> {
  const entries = await fs.promises.readdir(PUBLIC_DIR, {
    withFileTypes: true,
  });

  const svgFiles: SVGFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".svg")) continue;

    const fullPath = path.join(PUBLIC_DIR, entry.name);
    const content = await fs.promises.readFile(fullPath, "utf8");
    svgFiles.push({ name: entry.name, content });
  }

  return svgFiles;
}

async function ensureImportsDir() {
  await fs.promises.mkdir(IMPORTS_DIR, { recursive: true });
}

async function writeTSFiles(processed: ProcessedFile[]) {
  await ensureImportsDir();

  for (const file of processed) {
    const outPath = path.join(IMPORTS_DIR, file.tsFileName);
    await fs.promises.writeFile(outPath, file.tsContent, "utf8");
  }
}

async function main() {
  console.log(`Reading SVG files from: ${PUBLIC_DIR}`);
  const svgFiles = await readSVGFilesFromPublic();

  if (svgFiles.length === 0) {
    console.log("No .svg files found in public/.");
    return;
  }

  const processed = processSVGFiles(svgFiles);
  await writeTSFiles(processed);

  console.log(formatSummary(processed));
  console.log(`\nTypeScript SVG files written to: ${IMPORTS_DIR}`);
  console.log(
    "You can import a generated file like:\n  import svgPaths from '@/imports/<name>.ts';",
  );
}

const isDirectRun = path.resolve(process.argv[1] ?? "") === THIS_FILE;
if (isDirectRun) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
