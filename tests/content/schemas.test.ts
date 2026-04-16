import { describe, it, expect } from 'vitest'
import {
  blogSchema, roleSchema, companySchema, projectSchema,
  educationSchema, gallerySchema, clippingSchema, aboutSchema,
} from '@/content/schemas'

describe('blogSchema', () => {
  it('accepts minimal valid frontmatter', () => {
    const parsed = blogSchema.parse({
      title: 'x', description: 'y', date: '2026-04-16',
    })
    expect(parsed.draft).toBe(false)
  })
  it('rejects missing title', () => {
    expect(() => blogSchema.parse({ description: 'y', date: '2026-04-16' })).toThrow()
  })
  it('coerces date strings', () => {
    const parsed = blogSchema.parse({ title: 'x', description: 'y', date: '2026-04-16' })
    expect(parsed.date).toBeInstanceOf(Date)
  })
})

describe('roleSchema', () => {
  it('requires role, company, date_start, summary', () => {
    expect(() => roleSchema.parse({})).toThrow()
  })
  it('allows date_end null (current role)', () => {
    const parsed = roleSchema.parse({
      role: 'r', company: 'c', date_start: '2026-01-01', date_end: null, summary: 's',
    })
    expect(parsed.date_end).toBeNull()
  })
  it('defaults graph_node to true', () => {
    const parsed = roleSchema.parse({
      role: 'r', company: 'c', date_start: '2026-01-01', summary: 's',
    })
    expect(parsed.graph_node).toBe(true)
  })
})

describe('companySchema', () => {
  it('defaults graph_node to false (R2)', () => {
    const parsed = companySchema.parse({ name: 'c' })
    expect(parsed.graph_node).toBe(false)
  })
})

describe('clippingSchema', () => {
  it('defaults publish + share to false', () => {
    const parsed = clippingSchema.parse({ title: 't' })
    expect(parsed.publish).toBe(false)
    expect(parsed.share).toBe(false)
    expect(parsed.graph_node).toBe(true)
  })
})

describe('projectSchema', () => {
  it('defaults status to shipped', () => {
    const parsed = projectSchema.parse({ title: 't', summary: 's', date: '2026-01-01' })
    expect(parsed.status).toBe('shipped')
  })
})

describe('aboutSchema', () => {
  it('requires title + tagline', () => {
    expect(() => aboutSchema.parse({ title: 't' })).toThrow()
  })
})
