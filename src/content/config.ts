import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  blogSchema,
  blogVariantSchema,
  gallerySchema,
  projectSchema,
  siteNoteSchema,
  thoughtSchema,
} from "@/content/schemas";
import { vaultPaths } from "@/lib/vault-paths";
import { noteId } from "@/lib/note-id";

const paths = vaultPaths(process.cwd());

// Canonical posts only: companion files such as post.tldr.md are excluded here.
const blog = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*.*.md"],
    base: paths.blogs,
    generateId: ({ entry }) => noteId(entry),
  }),
  schema: blogSchema,
});

// The only companion variant: post.tldr.md, beside its parent post.
const blogVariants = defineCollection({
  loader: glob({
    pattern: "**/*.tldr.md",
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
    generateId: ({ entry }) => noteId(entry),
  }),
  schema: projectSchema,
});

const thoughts = defineCollection({
  // Keep the base present before the first published thought creates this folder.
  loader: glob({
    pattern: "Thoughts/**/*.md",
    base: paths.thoughts,
    generateId: ({ entry }) => noteId(entry),
  }),
  schema: thoughtSchema,
});

// Owner copy for Home, About and focus areas. Missing Site/ yields no entries,
// and the pages then omit the vault-driven blocks.
const site = defineCollection({
  loader: glob({
    pattern: ["Home.md", "About.md", "Focus/*.md"],
    base: paths.site,
  }),
  schema: siteNoteSchema,
});

export const collections = {
  blog,
  "blog-variants": blogVariants,
  gallery,
  projects,
  site,
  thoughts,
};
