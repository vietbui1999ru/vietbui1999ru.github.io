import { describe, it, expect, vi } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkWikilinks } from '@/lib/remark/wikilinks'
import type { WikilinkIndex } from '@/lib/remark/wikilinks'

const index: WikilinkIndex = {
  posts: new Map([['hello-world', { kind: 'blog', url: '/blog/hello-world', title: 'Hello World' }]]),
  projects: new Map([['stripe-mrr', { kind: 'project', url: '/projects/stripe-mrr', title: 'Stripe MRR' }]]),
  roles: new Map(),
  education: new Map(),
  gallery: new Map(),
  clippings: new Map([['comptia-linux', {
    kind: 'clipping',
    url: '',
    title: 'CompTIA Linux Guide',
    preview: 'Short excerpt.',
    source: 'https://example.com',
    publish: false,
    share: false,
  }]]),
}

async function transform(md: string) {
  const tree = unified().use(remarkParse).parse(md)
  await unified().use(remarkParse).use(remarkWikilinks, { index, onDead: () => {} }).run(tree)
  return tree
}

describe('remark-wikilinks', () => {
  it('rewrites internal blog wikilink to <a href="/blog/slug">', async () => {
    const tree: any = await transform('See [[hello-world]] for more.')
    const link = tree.children[0].children[1]
    expect(link.type).toBe('link')
    expect(link.url).toBe('/blog/hello-world')
    expect(link.children[0].value).toBe('Hello World')
  })

  it('supports alias syntax [[slug|alias]]', async () => {
    const tree: any = await transform('Go see [[hello-world|this post]].')
    const link = tree.children[0].children[1]
    expect(link.url).toBe('/blog/hello-world')
    expect(link.children[0].value).toBe('this post')
  })

  it('wraps private clippings as <a class="note-popover"> html', async () => {
    const tree: any = await transform('Read [[comptia-linux]] for reference.')
    const node = tree.children[0].children[1]
    expect(node.type).toBe('html')
    expect(node.value).toContain('class="note-popover"')
    expect(node.value).toContain('data-preview="Short excerpt."')
    expect(node.value).toContain('data-source="https://example.com"')
  })

  it('invokes onDead callback for unknown targets and renders plain text', async () => {
    const onDead = vi.fn()
    const tree = unified().use(remarkParse).parse('Unknown [[does-not-exist]] link.')
    await unified().use(remarkParse).use(remarkWikilinks, { index, onDead }).run(tree)
    expect(onDead).toHaveBeenCalledWith('does-not-exist', expect.any(String))
    const text = (tree as any).children[0].children[1]
    expect(text.type).toBe('text')
    expect(text.value).toBe('does-not-exist')
  })

  it('escapes special chars in clipping HTML attributes', async () => {
    const unsafeIndex: WikilinkIndex = {
      ...index,
      clippings: new Map([['x', {
        kind: 'clipping',
        url: '',
        title: 'A "quoted" <title>',
        preview: 'Excerpt with & ampersand',
        source: 'https://example.com',
        publish: false,
        share: false,
      }]]),
    }
    const tree = unified().use(remarkParse).parse('See [[x]] here.')
    await unified().use(remarkParse).use(remarkWikilinks, { index: unsafeIndex, onDead: () => {} }).run(tree)
    const node: any = (tree as any).children[0].children[1]
    expect(node.type).toBe('html')
    expect(node.value).toContain('&quot;')
    expect(node.value).toContain('&lt;')
    expect(node.value).toContain('&amp;')
  })
})
