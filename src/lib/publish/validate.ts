import { z } from "astro/zod";
import {
  blogSchema,
  gallerySchema,
  librarySchema,
  projectSchema,
  siteNoteSchema,
  thoughtSchema,
} from "@/content/schemas";

// Each routable type is checked against the same schema the site collection uses.
export const TYPE_SCHEMAS: Record<string, z.ZodType> = {
  post: blogSchema,
  thought: thoughtSchema,
  gallery: gallerySchema,
  game: librarySchema,
  book: librarySchema,
  film: librarySchema,
  recipe: librarySchema,
  project: projectSchema,
  site: siteNoteSchema,
};

export interface ValidatableNote {
  relPath: string;
  frontmatter: Record<string, unknown>;
}

/** Throws one error listing every note that fails its type's schema. Writes nothing. */
export function validateNotes(notes: ValidatableNote[]): void {
  const failures: string[] = [];
  for (const note of notes) {
    const schema = TYPE_SCHEMAS[String(note.frontmatter.type)];
    if (!schema) {
      failures.push(`${note.relPath}: no schema for type "${String(note.frontmatter.type)}"`);
      continue;
    }
    const result = schema.safeParse(note.frontmatter);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      failures.push(`${note.relPath}: ${issues}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`validation failed, nothing written:\n${failures.join("\n")}`);
  }
}
