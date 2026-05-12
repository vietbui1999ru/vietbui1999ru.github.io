import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

export function getVaultRoot(): string {
  const env = process.env.VAULT_ROOT
  if (env) {
    return env.startsWith('~')
      ? path.join(os.homedir(), env.slice(1))
      : env
  }
  return path.join(os.homedir(), 'repos', 'Obsidian')
}

function readBranch(vaultRoot: string): string {
  return execFileSync('git', ['branch', '--show-current'], {
    cwd: vaultRoot,
    encoding: 'utf-8',
  }).trim()
}

export function warnIfNotMain(
  vaultRoot: string,
  getBranch: (root: string) => string = readBranch
): void {
  try {
    const branch = getBranch(vaultRoot)
    if (branch !== 'main') {
      console.warn(
        `[vault] WARNING: Obsidian vault is on branch '${branch}', not 'main'. ` +
        `Embeds may reference wrong attachments.`
      )
    }
  } catch {
    console.warn(`[vault] WARNING: Could not check vault branch at ${vaultRoot}`)
  }
}
