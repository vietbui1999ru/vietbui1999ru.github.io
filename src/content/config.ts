import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  blogSchema,
  blogVariantSchema,
  gallerySchema,
  projectSchema,
  thoughtSchema,
} from "@/content/schemas";
import { vaultPaths } from "@/lib/vault-paths";

const paths = vaultPaths(process.cwd());

// Canonical posts only — exclude companion variant files (post.ai.md, post.yoda.md)
const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*.*.md"],
    base: paths.blogs,
  }),
  schema: blogSchema,
});

// Companion variant files: post.ai.md, post.yoda.md, etc.
const blogVariants = defineCollection({
  loader: glob({
    pattern: "**/*.*.md",
    base: paths.blogs,
  }),
  schema: blogVariantSchema,
});

const gallery = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: paths.gallery,
  }),
  schema: gallerySchema,
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: paths.projects,
  }),
  schema: projectSchema,
});

const thoughts = defineCollection({
  // Keep the base present before the first published thought creates this folder.
  loader: glob({
    pattern: "Thoughts/**/*.md",
    base: paths.thoughts,
    generateId: ({ entry }) => entry.replace(/^Thoughts\//, "").replace(/\.md$/, ""),
  }),
  schema: thoughtSchema,
});

export const collections = {
  blog,
  "blog-variants": blogVariants,
  gallery,
  projects,
  thoughts,
};
