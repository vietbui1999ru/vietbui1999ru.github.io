import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export interface AssetAdapterOptions {
  attachmentsRoot: string
  publicRoot: string
  excalidrawCacheDir: string
  renderExcalidraw?: (content: string) => string
}

export interface AssetAdapters {
  copyAsset: (filename: string, postSlug: string) => string
  resolveExcalidraw: (filename: string) => string
}

function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
}

export function createAssetAdapters(opts: AssetAdapterOptions): AssetAdapters {
  const { attachmentsRoot, publicRoot, excalidrawCacheDir, renderExcalidraw } = opts

  function copyAsset(filename: string, postSlug: string): string {
    if (filename.includes('..')) {
      throw new Error(`path traversal detected: ${filename}`)
    }

    const srcPath = path.join(attachmentsRoot, filename)
    const basename = path.basename(filename)
    const destDir = path.join(publicRoot, 'blog-assets', postSlug)
    const destFile = path.join(destDir, basename)
    const publicUrl = `/blog-assets/${postSlug}/${basename}`

    const srcData = fs.readFileSync(srcPath)
    if (fs.existsSync(destFile)) {
      const destData = fs.readFileSync(destFile)
      if (sha256(srcData) === sha256(destData)) return publicUrl
    }

    fs.mkdirSync(destDir, { recursive: true })
    fs.writeFileSync(destFile, srcData)
    return publicUrl
  }

  function resolveExcalidraw(filename: string): string {
    const srcPath = path.join(attachmentsRoot, filename)
    const content = fs.readFileSync(srcPath, 'utf-8')
    const hash = sha256(content)

    const cacheFile = path.join(excalidrawCacheDir, `${hash}.svg`)
    if (fs.existsSync(cacheFile)) {
      return fs.readFileSync(cacheFile, 'utf-8')
    }

    if (!renderExcalidraw) throw new Error('renderExcalidraw callback required')

    const sanitized = sanitizeSvg(renderExcalidraw(content))
    fs.mkdirSync(excalidrawCacheDir, { recursive: true })
    fs.writeFileSync(cacheFile, sanitized)
    return sanitized
  }

  return { copyAsset, resolveExcalidraw }
}
