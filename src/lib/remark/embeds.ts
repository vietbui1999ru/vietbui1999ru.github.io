import type { Plugin } from 'unified'
import type { Root, Text, PhrasingContent } from 'mdast'
import { visit, SKIP } from 'unist-util-visit'
import path from 'node:path'

export interface EmbedOptions {
  attachmentsRoot: string
  copyAsset: (filename: string, postSlug: string) => string
  resolveExcalidraw: (filename: string) => string
}

const EMBED_REGEX = /!\[\[([^\[\]]+)\]\]/g

function postSlugFromFilePath(filePath: string | undefined): string {
  if (!filePath) return 'unknown'
  const base = path.basename(filePath, path.extname(filePath))
  return base
}

export const remarkEmbeds: Plugin<[EmbedOptions], Root> = (opts) => {
  const { copyAsset, resolveExcalidraw } = opts
  return (tree, file) => {
    const postSlug = postSlugFromFilePath(file.path as string | undefined)

    visit(tree, 'text', (node: Text, idx, parent) => {
      if (!parent || typeof idx !== 'number') return
      const src = node.value
      if (!src.includes('![[')) return

      const out: PhrasingContent[] = []
      let lastIndex = 0
      EMBED_REGEX.lastIndex = 0
      for (const match of src.matchAll(EMBED_REGEX)) {
        const [full, filename] = match
        const mIdx = match.index ?? 0
        if (mIdx > lastIndex) out.push({ type: 'text', value: src.slice(lastIndex, mIdx) })
        lastIndex = mIdx + full.length

        if (filename.endsWith('.excalidraw.md')) {
          const svg = resolveExcalidraw(filename)
          out.push({ type: 'html', value: svg } as any)
          continue
        }

        const publicUrl = copyAsset(filename, postSlug)
        out.push({
          type: 'image',
          url: publicUrl,
          title: null,
          alt: filename,
        })
      }

      if (lastIndex < src.length) out.push({ type: 'text', value: src.slice(lastIndex) })
      if (out.length === 0) return

      parent.children.splice(idx, 1, ...out)
      return [SKIP, idx + out.length]
    })
  }
}
