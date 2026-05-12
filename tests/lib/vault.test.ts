import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import os from 'node:os'
import { getVaultRoot, warnIfNotMain } from '@/lib/vault'

beforeEach(() => { delete process.env.VAULT_ROOT })
afterEach(() => { delete process.env.VAULT_ROOT })

describe('getVaultRoot', () => {
  it('returns VAULT_ROOT env var when set (absolute path)', () => {
    process.env.VAULT_ROOT = '/custom/vault'
    expect(getVaultRoot()).toBe('/custom/vault')
  })

  it('expands leading ~ to home directory', () => {
    process.env.VAULT_ROOT = '~/my/vault'
    expect(getVaultRoot()).toBe(`${os.homedir()}/my/vault`)
  })

  it('defaults to ~/repos/Obsidian when env not set', () => {
    expect(getVaultRoot()).toBe(`${os.homedir()}/repos/Obsidian`)
  })
})

describe('warnIfNotMain', () => {
  it('does not warn when vault is on main branch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnIfNotMain('/some/vault', () => 'main')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns when vault is on a non-main branch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnIfNotMain('/some/vault', () => 'jobs-network')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('jobs-network'))
    warn.mockRestore()
  })

  it('warns when git command fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warnIfNotMain('/nonexistent', () => { throw new Error('not a git repo') })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
