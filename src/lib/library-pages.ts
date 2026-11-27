// Build-time data for the /library pages. Uses astro:content and astro:assets,
// so only .astro pages import it; the pure logic lives in library-categories and library-view.
import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import type { LibraryType } from "@/content/schemas";
import { coverFileName } from "./library-covers";
import { libraryCategories, type LibraryCategory } from "./library-categories";
import { toCardData, type LibraryCardData, type Thumbnail } from "./library-view";

// Covers copied by astro.config.ts at load time; empty when the vault has none.
const COVERS = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/library/*.{png,jpg,jpeg,gif,webp,avif,PNG,JPG,JPEG}",
  { eager: true },
);

/** A dev build shows drafts and hidden categories; production never does. */
export const LIBRARY_DEV = import.meta.env.DEV;

export async function thumbnailFor(cover: string | undefined, width: number): Promise<Thumbnail | undefined> {
  const name = coverFileName(cover);
  const image = name ? COVERS[`/src/assets/library/${name}`]?.default : undefined;
  if (!image) return undefined;
  const result = await getImage({ src: image, width, format: "webp" });
  return {
    src: result.src,
    width: Number(result.attributes.width ?? width),
    height: Number(result.attributes.height ?? Math.round((width * image.height) / image.width)),
  };
}

export interface LibraryShelf extends LibraryCategory {
  cards: LibraryCardData[];
}

/** Visible categories with their cards, in the order Site/Library.md sets. */
export async function loadLibrary(): Promise<{ shelves: LibraryShelf[]; intro: string; title: string }> {
  const entries = await getCollection("library");
  const settings = await getEntry("site", "library");
  const categories = libraryCategories(entries, settings?.data.categories, { dev: LIBRARY_DEV });
  const shelves = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      cards: await Promise.all(
        category.items.map(async (item) =>
          toCardData(item.id, item.data, await thumbnailFor(item.data.cover, 480)),
        ),
      ),
    })),
  );
  return {
    shelves,
    intro: settings?.rendered?.html ?? "",
    title: settings?.data.title ?? "library",
  };
}

export function shelfFor(shelves: LibraryShelf[], type: LibraryType): LibraryShelf | undefined {
  return shelves.find((shelf) => shelf.type === type);
}

export type LibraryCollectionEntry = CollectionEntry<"library">;
