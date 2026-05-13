import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, blogVariantSchema, gallerySchema } from "@/content/schemas";

// Canonical posts only — exclude companion variant files (post.ai.md, post.yoda.md)
const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*.*.md"],
    base: "./vendor/vault/Blogs",
  }),
  schema: blogSchema,
});

// Companion variant files: post.ai.md, post.yoda.md, etc.
const blogVariants = defineCollection({
  loader: glob({
    pattern: "**/*.*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogVariantSchema,
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
  "blog-variants": blogVariants,
  gallery,
};
