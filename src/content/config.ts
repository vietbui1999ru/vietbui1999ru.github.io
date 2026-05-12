import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema } from "@/content/schemas";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./vendor/vault/Blogs",
  }),
  schema: blogSchema,
});

export const collections = {
  blog,
};
