import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { librarySchema, siteNoteSchema } from "@/content/schemas";
import { libraryCategories, type LibraryItem } from "@/lib/library-categories";

const VAULT = path.resolve("tests/fixtures/garden-vault");

function fixtureItems(): LibraryItem[] {
  const root = path.join(VAULT, "Library");
  return fs.readdirSync(root).flatMap((type) =>
    fs.readdirSync(path.join(root, type)).map((file) => ({
      id: `${type}/${file.replace(/\.md$/, "")}`,
      data: librarySchema.parse(matter(fs.readFileSync(path.join(root, type, file), "utf-8")).data),
    })),
  );
}

const settings = () =>
  siteNoteSchema.parse(matter(fs.readFileSync(path.join(VAULT, "Site/Library.md"), "utf-8")).data)
    .categories;

describe("library categories", () => {
  it("parses Site/Library.md with its category list", () => {
    expect(settings()?.map((c) => c.type)).toEqual(["book", "game", "film", "recipe"]);
  });

  it("shows visitors only enabled categories with a published item, in listed order", () => {
    const categories = libraryCategories(fixtureItems(), settings(), { dev: false });
    expect(categories.map((c) => c.type)).toEqual(["book", "game"]);
  });

  it("hides unpublished and draft items from visitors", () => {
    const [books] = libraryCategories(fixtureItems(), settings(), { dev: false });
    const titles = books.items.map((i) => i.data.title);
    expect(titles).not.toContain("PLACEHOLDER Book Unpublished");
    // Five status fixtures plus the rich sample book.
    expect(titles).toHaveLength(6);
  });

  it("puts unlisted types after listed ones, enabled", () => {
    const categories = libraryCategories(fixtureItems(), [{ type: "film", enabled: true }], { dev: false });
    expect(categories.map((c) => c.type)).toEqual(["film", "game", "book"]);
  });

  it("dev mode shows disabled and empty categories and every item", () => {
    const categories = libraryCategories(fixtureItems(), settings(), { dev: true });
    expect(categories.map((c) => [c.type, c.enabled])).toEqual([
      ["book", true],
      ["game", true],
      ["film", false],
      ["recipe", true],
    ]);
    expect(categories.find((c) => c.type === "recipe")?.items).toHaveLength(3);
    expect(categories.find((c) => c.type === "book")?.items).toHaveLength(7);
  });
});
