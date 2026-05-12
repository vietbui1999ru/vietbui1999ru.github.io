import fs from 'node:fs'
import path from 'node:path'
import type { WikilinkIndex } from '@/lib/remark/wikilinks'

function parseFrontmatter(content: string): Record<string, string | boolean> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm: Record<string, string | boolean> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/)
    if (!kv) continue
    const [, key, raw] = kv
    const val = raw.trim()
    fm[key] = val === 'true' ? true : val === 'false' ? false : val.replace(/^["']|["']$/g, '')
  }
  return fm
}

export function buildWikilinkIndex(blogDir: string): WikilinkIndex {
  const index: WikilinkIndex = {
    posts:     new Map(),
    projects:  new Map(),
    roles:     new Map(),
    education: new Map(),
    gallery:   new Map(),
    clippings: new Map(),
  }

  let files: string[]
  try {
    files = (fs.readdirSync(blogDir, { recursive: true, encoding: 'utf-8' }) as string[])
      .filter(f => f.endsWith('.md'))
  } catch {
    return index
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8')
    const fm = parseFrontmatter(content)
    if (fm.draft === true) continue
    const slug = path.basename(file, '.md')
    const title = typeof fm.title === 'string' && fm.title ? fm.title : slug
    index.posts.set(slug, { kind: 'blog', url: `/blog/${slug}`, title })
  }

  return index
}
