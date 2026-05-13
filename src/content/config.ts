import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, gallerySchema } from "@/content/schemas";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogSchema,
});

const gallery = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Gallery",
  }),
  schema: gallerySchema,
});

export const collections = {
  blog,
  gallery,
};
