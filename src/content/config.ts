import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, projectSchema } from "@/content/schemas";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogSchema,
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Portfolio/Projects",
  }),
  schema: projectSchema,
});

export const collections = {
  blog,
  projects,
};
