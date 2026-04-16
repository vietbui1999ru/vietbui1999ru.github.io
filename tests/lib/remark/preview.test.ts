import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkPreview } from '@/lib/remark/preview'

async function run(md: string, existing?: string) {
  const file: any = { data: { astro: { frontmatter: existing ? { preview: existing } : {} } } }
  const tree = unified().use(remarkParse).parse(md)
  await unified().use(remarkParse).use(remarkPreview).run(tree, file)
  return file.data.astro.frontmatter.preview as string | undefined
}

describe('remark-preview', () => {
  it('extracts first paragraph when preview absent', async () => {
    const out = await run('# Heading\n\nFirst paragraph text here.\n\nSecond paragraph.')
    expect(out).toBe('First paragraph text here.')
  })

  it('skips headings when looking for first paragraph', async () => {
    const out = await run('## Skip\n\n### Also skip\n\nActual content paragraph.')
    expect(out).toBe('Actual content paragraph.')
  })

  it('preserves explicit preview frontmatter', async () => {
    const out = await run('First paragraph.', 'Custom preview override.')
    expect(out).toBe('Custom preview override.')
  })

  it('caps preview at 280 chars', async () => {
    const long = 'x'.repeat(500)
    const out = await run(long)
    expect(out?.length).toBeLessThanOrEqual(280)
  })
})
