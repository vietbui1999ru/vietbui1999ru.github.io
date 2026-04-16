import type { Plugin } from 'unified'
import type { Root, Paragraph } from 'mdast'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'

const MAX_PREVIEW = 280

export const remarkPreview: Plugin<[], Root> = () => (tree, file) => {
  const frontmatter = ((file.data.astro as any)?.frontmatter ?? {}) as Record<string, unknown>
  if (typeof frontmatter.preview === 'string' && frontmatter.preview.length > 0) return

  let first: Paragraph | undefined
  visit(tree, 'paragraph', (node) => {
    if (!first) first = node
  })
  if (!first) return

  const raw = toString(first).trim()
  if (!raw) return

  const chars = [...raw]
  const preview = chars.length > MAX_PREVIEW
    ? chars.slice(0, MAX_PREVIEW - 1).join('').trimEnd() + '…'
    : raw
  frontmatter.preview = preview
  ;(file.data.astro as any).frontmatter = frontmatter
}
