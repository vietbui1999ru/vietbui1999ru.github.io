import { z } from 'zod'

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  updated: z.coerce.date().optional(),
  series: z.string().optional(),
  preview: z.string().optional(),
  audience: z.array(z.enum(['dev', 'student', 'general'])).optional(),
  topics: z.array(z.string()).optional(),
})

export const roleSchema = z.object({
  role: z.string(),
  company: z.string(),
  company_url: z.string().url().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

export const companySchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  logo: z.string().optional(),
  graph_node: z.boolean().default(false),
})

export const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  cover: z.string().optional(),
  links: z.array(z.object({ icon: z.string(), url: z.string().url() })).optional(),
  status: z.enum(['active', 'shipped', 'archived']).default('shipped'),
  graph_node: z.boolean().default(true),
})

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  date_start: z.coerce.date(),
  date_end: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string(),
  graph_node: z.boolean().default(true),
})

export const gallerySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  image: z.string(),
  tags: z.array(z.string()).optional(),
  graph_node: z.boolean().default(true),
})

export const clippingSchema = z.object({
  title: z.string(),
  source: z.string().url().optional(),
  preview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publish: z.boolean().default(false),
  share: z.boolean().default(false),
  graph_node: z.boolean().default(true),
})

export const aboutSchema = z.object({
  title: z.string(),
  tagline: z.string(),
})

export type BlogEntry = z.infer<typeof blogSchema>
export type RoleEntry = z.infer<typeof roleSchema>
export type CompanyEntry = z.infer<typeof companySchema>
export type ProjectEntry = z.infer<typeof projectSchema>
export type EducationEntry = z.infer<typeof educationSchema>
export type GalleryEntry = z.infer<typeof gallerySchema>
export type ClippingEntry = z.infer<typeof clippingSchema>
export type AboutEntry = z.infer<typeof aboutSchema>
