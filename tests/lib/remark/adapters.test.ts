import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createAssetAdapters } from '@/lib/remark/adapters'

let tmp: string
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-test-'))
  fs.mkdirSync(path.join(tmp, 'vault/Attachments'), { recursive: true })
  fs.mkdirSync(path.join(tmp, 'public'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'vault/Attachments/image.png'), 'PNG_BYTES')
  fs.writeFileSync(path.join(tmp, 'vault/Attachments/drawing.excalidraw.md'), '```compressed-json\n{"elements":[]}\n```')
})
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

function adapters(extra: Partial<Parameters<typeof createAssetAdapters>[0]> = {}) {
  return createAssetAdapters({
    attachmentsRoot: path.join(tmp, 'vault/Attachments'),
    publicRoot: path.join(tmp, 'public'),
    excalidrawCacheDir: path.join(tmp, '.cache/excalidraw'),
    ...extra,
  })
}

describe('asset adapters', () => {
  it('copyAsset places file under public/blog-assets/<slug>/ and returns public URL', () => {
    const { copyAsset } = adapters()
    const url = copyAsset('image.png', 'hello-world')
    expect(url).toBe('/blog-assets/hello-world/image.png')
    expect(fs.existsSync(path.join(tmp, 'public/blog-assets/hello-world/image.png'))).toBe(true)
  })

  it('copyAsset is idempotent (hash-checked skip)', () => {
    const { copyAsset } = adapters()
    copyAsset('image.png', 'hello-world')
    const mtime1 = fs.statSync(path.join(tmp, 'public/blog-assets/hello-world/image.png')).mtimeMs
    copyAsset('image.png', 'hello-world')
    const mtime2 = fs.statSync(path.join(tmp, 'public/blog-assets/hello-world/image.png')).mtimeMs
    expect(mtime2).toBe(mtime1)
  })

  it('copyAsset rejects path traversal in filename', () => {
    const { copyAsset } = adapters()
    expect(() => copyAsset('../../etc/passwd', 'slug')).toThrow(/path traversal/i)
    expect(() => copyAsset('sub/dir/../../escape.png', 'slug')).toThrow(/path traversal/i)
  })

  it('resolveExcalidraw returns SVG string (stub renderer)', () => {
    const { resolveExcalidraw } = adapters({
      renderExcalidraw: () => '<svg data-stub="1"></svg>',
    })
    const svg = resolveExcalidraw('drawing.excalidraw.md')
    expect(svg).toContain('<svg')
  })

  it('resolveExcalidraw caches by content hash', () => {
    let calls = 0
    const { resolveExcalidraw } = adapters({
      renderExcalidraw: () => { calls++; return '<svg data-stub="1"></svg>' },
    })
    resolveExcalidraw('drawing.excalidraw.md')
    resolveExcalidraw('drawing.excalidraw.md')
    expect(calls).toBe(1)
  })

  it('resolveExcalidraw strips script tags and on* handlers', () => {
    const { resolveExcalidraw } = adapters({
      renderExcalidraw: () => '<svg onload="alert(1)"><script>evil()</script><circle cx="5"/></svg>',
    })
    const svg = resolveExcalidraw('drawing.excalidraw.md')
    expect(svg).not.toMatch(/<script/i)
    expect(svg).not.toMatch(/onload\s*=/i)
    expect(svg).toContain('<circle')
  })
})
