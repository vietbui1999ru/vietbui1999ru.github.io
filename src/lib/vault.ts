import path from 'node:path'

// Submodule at vendor/vault/ is the single source of truth.
// VAULT_ROOT is kept for local dev overrides (e.g. pointing at a local PortfolioVault clone).
export function getVaultRoot(projectRoot: string): string {
  const env = process.env.VAULT_ROOT
  if (env) return env
  return path.join(projectRoot, 'vendor', 'vault')
}
