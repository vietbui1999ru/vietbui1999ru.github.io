import path from "node:path";
import { getVaultRoot } from "./vault";

// Every content collection and asset folder is derived here, so VAULT_ROOT
// redirects the whole site. Thoughts globs from the vault root (Thoughts/**).
export function vaultPaths(projectRoot: string) {
  const root = path.resolve(getVaultRoot(projectRoot));
  return {
    root,
    blogs: path.join(root, "Blogs"),
    gallery: path.join(root, "Gallery"),
    projects: path.join(root, "Portfolio", "Projects"),
    thoughts: root,
    site: path.join(root, "Site"),
    library: path.join(root, "Library"),
    projectAssets: path.join(root, "Assets", "Projects"),
    attachments: path.join(root, "Attachments"),
  };
}
