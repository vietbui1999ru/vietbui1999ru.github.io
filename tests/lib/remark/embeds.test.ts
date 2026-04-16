import { describe, it, expect, vi } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkEmbeds } from '@/lib/remark/embeds'

async function transform(md: string, opts: any) {
  const tree = unified().use(remarkParse).parse(md)
  await unified().use(remarkParse).use(remarkEmbeds, opts).run(tree, { path: '/vault/Blogs/my-post.md' } as any)
  return tree
}

describe('remark-embeds', () => {
  it('rewrites ![[image.png]] to <img> with copy request', async () => {
    const copyAsset = vi.fn().mockReturnValue('/blog-assets/my-post/image.png')
    const resolveExcalidraw = vi.fn()
    const tree: any = await transform('![[image.png]]', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    const para = tree.children[0]
    const img = para.children[0]
    expect(img.type).toBe('image')
    expect(img.url).toBe('/blog-assets/my-post/image.png')
    expect(copyAsset).toHaveBeenCalledWith('image.png', 'my-post')
  })

  it('rewrites ![[drawing.excalidraw.md]] to inline SVG', async () => {
    const copyAsset = vi.fn()
    const resolveExcalidraw = vi.fn().mockReturnValue('<svg data-test="ok"></svg>')
    const tree: any = await transform('![[drawing.excalidraw.md]]', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    const para = tree.children[0]
    const html = para.children[0]
    expect(html.type).toBe('html')
    expect(html.value).toContain('<svg')
    expect(resolveExcalidraw).toHaveBeenCalledWith('drawing.excalidraw.md')
  })

  it('leaves normal markdown image syntax alone', async () => {
    const copyAsset = vi.fn()
    const resolveExcalidraw = vi.fn()
    const tree: any = await transform('![alt text](https://example.com/img.png)', {
      attachmentsRoot: '/vault/Attachments',
      copyAsset,
      resolveExcalidraw,
    })
    expect(copyAsset).not.toHaveBeenCalled()
    expect(tree.children[0].children[0].url).toBe('https://example.com/img.png')
  })
})
