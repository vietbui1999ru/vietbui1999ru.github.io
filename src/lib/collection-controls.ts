import type { CollectionExperimentState } from "../design-system/types";

export interface CollectionRecord {
  slug?: string;
  id?: string;
  title: string;
  summary?: string;
  description?: string;
  tags?: string[];
  badges?: string[];
  date?: Date | string;
  featured?: boolean;
  status?: string;
}

function recordId(record: CollectionRecord, index: number): string {
  return record.slug ?? record.id ?? `${record.title}-${index}`;
}

function searchableText(record: CollectionRecord): string {
  return [
    record.title,
    record.summary,
    record.description,
    ...(record.tags ?? []),
    ...(record.badges ?? []),
    record.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function recordTags(record: CollectionRecord): string[] {
  return [...(record.tags ?? []), ...(record.badges ?? [])].map((tag) =>
    tag.toLocaleLowerCase(),
  );
}

function dateValue(record: CollectionRecord): number {
  if (!record.date) return 0;
  return new Date(record.date).valueOf();
}

export function filterAndSortCollection<T extends CollectionRecord>(
  records: T[],
  state: CollectionExperimentState,
): T[] {
  const query = state.query.trim().toLocaleLowerCase();
  const selectedTags = state.tags.map((tag) => tag.toLocaleLowerCase());

  const filtered = records.filter((record) => {
    const matchesQuery = !query || searchableText(record).includes(query);
    const tags = recordTags(record);
    const matchesTags = selectedTags.every((tag) => tags.includes(tag));
    return matchesQuery && matchesTags;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (state.sort === "featured" && a.featured !== b.featured)
      return a.featured ? -1 : 1;
    if (state.sort === "date-desc")
      return dateValue(b) - dateValue(a) || a.title.localeCompare(b.title);
    if (state.sort === "title-asc") return a.title.localeCompare(b.title);
    if (state.sort === "status") {
      return (
        (a.status ?? "").localeCompare(b.status ?? "") ||
        a.title.localeCompare(b.title)
      );
    }
    return 0;
  });

  if (!state.order.length) return sorted;

  const positions = new Map(state.order.map((id, index) => [id, index]));
  return sorted.sort((a, b) => {
    const aPosition =
      positions.get(recordId(a, records.indexOf(a))) ?? Number.MAX_SAFE_INTEGER;
    const bPosition =
      positions.get(recordId(b, records.indexOf(b))) ?? Number.MAX_SAFE_INTEGER;
    return aPosition - bPosition;
  });
}

export function collectTags(records: CollectionRecord[]): string[] {
  return [...new Set(records.flatMap(recordTags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function moveRecord<T extends CollectionRecord>(
  records: T[],
  id: string,
  direction: "up" | "down",
): T[] {
  const index = records.findIndex(
    (record, recordIndex) => recordId(record, recordIndex) === id,
  );
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= records.length)
    return records;

  const next = [...records];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function idsForRecords(records: CollectionRecord[]): string[] {
  return records.map(recordId);
}
