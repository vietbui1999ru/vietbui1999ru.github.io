import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface AssetAdapterOptions {
  attachmentsRoot: string;
  publicRoot: string;
}

export interface AssetAdapters {
  copyAsset: (filename: string, postSlug: string) => string;
  resolveExcalidraw: (filename: string) => string;
}

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
}

export function createAssetAdapters(opts: AssetAdapterOptions): AssetAdapters {
  const { attachmentsRoot, publicRoot } = opts;

  function copyAsset(filename: string, postSlug: string): string {
    if (filename.includes("..")) {
      throw new Error(`path traversal detected: ${filename}`);
    }

    const srcPath = path.join(attachmentsRoot, filename);
    const basename = path.basename(filename);
    const destDir = path.join(publicRoot, "blog-assets", postSlug);
    const destFile = path.join(destDir, basename);
    const publicUrl = `/blog-assets/${postSlug}/${basename}`;

    const srcData = fs.readFileSync(srcPath);
    if (fs.existsSync(destFile)) {
      const destData = fs.readFileSync(destFile);
      if (sha256(srcData) === sha256(destData)) return publicUrl;
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destFile, srcData);
    return publicUrl;
  }

  // The drawing's auto-exported `<name>.excalidraw.svg` (Excalidraw plugin default)
  // is the rendered form, so nothing renders at build time.
  function resolveExcalidraw(filename: string): string {
    if (filename.includes("..")) {
      throw new Error(`path traversal detected: ${filename}`);
    }
    const stem = filename.replace(/\.excalidraw(\.md|\.svg)?$/, "");
    const svgName = `${stem}.excalidraw.svg`;
    const srcPath = path.join(attachmentsRoot, svgName);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`drawing ${filename}: missing export ${svgName}`);
    }
    return sanitizeSvg(fs.readFileSync(srcPath, "utf-8"));
  }

  return { copyAsset, resolveExcalidraw };
}
