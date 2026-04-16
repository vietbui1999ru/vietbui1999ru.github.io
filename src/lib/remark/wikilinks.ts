import type { Plugin } from 'unified'
import type { Root, Text, PhrasingContent } from 'mdast'
import { visit, SKIP } from 'unist-util-visit'

export type WikilinkTarget =
  | { kind: 'blog'|'project'|'role'|'education'|'gallery'; url: string; title: string }
  | {
      kind: 'clipping'
      url: string
      title: string
      preview?: string
      source?: string
      publish: boolean
      share: boolean
    }

export interface WikilinkIndex {
  posts:      Map<string, WikilinkTarget>
  projects:   Map<string, WikilinkTarget>
  roles:      Map<string, WikilinkTarget>
  education:  Map<string, WikilinkTarget>
  gallery:    Map<string, WikilinkTarget>
  clippings:  Map<string, WikilinkTarget>
}

export interface WikilinkOptions {
  index: WikilinkIndex
  onDead?: (slug: string, sourceFile: string) => void
  strict?: boolean
}

const LINK_REGEX = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g

function slugify(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
}

function resolve(index: WikilinkIndex, slug: string): WikilinkTarget | undefined {
  const s = slugify(slug)
  return index.posts.get(s)
    ?? index.projects.get(s)
    ?? index.roles.get(s)
    ?? index.education.get(s)
    ?? index.gallery.get(s)
    ?? index.clippings.get(s)
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const remarkWikilinks: Plugin<[WikilinkOptions], Root> = (opts) => {
  const { index, onDead = () => {}, strict = false } = opts
  return (tree, file) => {
    visit(tree, 'text', (node: Text, idx, parent) => {
      if (!parent || typeof idx !== 'number') return
      const src = node.value
      if (!src.includes('[[')) return

      const out: PhrasingContent[] = []
      let lastIndex = 0
      LINK_REGEX.lastIndex = 0
      for (const match of src.matchAll(LINK_REGEX)) {
        const [full, slugRaw, alias] = match
        const mIdx = match.index ?? 0
        if (mIdx > lastIndex) out.push({ type: 'text', value: src.slice(lastIndex, mIdx) })
        lastIndex = mIdx + full.length

        const target = resolve(index, slugRaw)
        const display = (alias ?? target?.title ?? slugRaw).trim()

        if (!target) {
          onDead(slugRaw.trim(), String(file.path ?? ''))
          if (strict) throw new Error(`Dead wikilink: ${slugRaw} in ${file.path}`)
          out.push({ type: 'text', value: display })
          continue
        }

        if (target.kind === 'clipping' && !target.publish) {
          const parts: string[] = ['<a class="note-popover"', `data-title="${escapeAttr(target.title)}"`]
          if (target.preview) parts.push(`data-preview="${escapeAttr(target.preview)}"`)
          if (target.source) parts.push(`data-source="${escapeAttr(target.source)}"`)
          const html = `${parts.join(' ')}>${escapeHtml(display)}</a>`
          out.push({ type: 'html', value: html } as any)
          continue
        }

        out.push({
          type: 'link',
          url: target.url,
          title: null,
          children: [{ type: 'text', value: display }],
        })
      }

      if (lastIndex < src.length) out.push({ type: 'text', value: src.slice(lastIndex) })
      if (out.length === 0) return

      parent.children.splice(idx, 1, ...out)
      return [SKIP, idx + out.length]
    })
  }
}
