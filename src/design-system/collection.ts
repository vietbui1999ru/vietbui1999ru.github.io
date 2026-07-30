import type {
  CollectionAlignment,
  CollectionDensity,
  CollectionExperimentState,
  CollectionIconPosition,
  CollectionOverflow,
  CollectionPalette,
  CollectionSort,
  CollectionView,
  CollectionWidth,
} from "./types";

export const DEFAULT_COLLECTION_STATE: CollectionExperimentState = {
  query: "",
  tags: [],
  view: "grid",
  width: "standard",
  density: "comfortable",
  sort: "featured",
  columns: 3,
  gap: "md",
  cardHeight: "auto",
  alignment: "stretch",
  overflow: "visible",
  pageSize: 6,
  showImage: true,
  showSummary: true,
  showTags: true,
  showStatus: true,
  showLinks: true,
  iconPosition: "leading",
  palette: "current",
  texture: false,
  order: [],
};

const VIEWS: CollectionView[] = [
  "grid",
  "table",
  "rows",
  "compact",
  "showcase",
];
const WIDTHS: CollectionWidth[] = ["narrow", "standard", "wide", "fluid"];
const DENSITIES: CollectionDensity[] = ["comfortable", "compact", "minimal"];
const SORTS: CollectionSort[] = [
  "featured",
  "date-desc",
  "title-asc",
  "status",
];
const OVERFLOWS: CollectionOverflow[] = [
  "visible",
  "scroll",
  "fade",
  "paginate",
];
const ALIGNMENTS: CollectionAlignment[] = ["start", "center", "end", "stretch"];
const ICON_POSITIONS: CollectionIconPosition[] = [
  "leading",
  "trailing",
  "hidden",
];
const PALETTES: CollectionPalette[] = [
  "current",
  "eggshell",
  "bone",
  "linen",
  "ledger",
  "cotton",
];

function enumValue<T extends string>(
  value: string | null,
  allowed: T[],
  fallback: T,
): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

function boolValue(value: string | null, fallback: boolean): boolean {
  return value === null ? fallback : value === "1";
}

function numberValue<T extends number>(
  value: string | null,
  allowed: T[],
  fallback: T,
): T {
  const parsed = Number(value);
  return allowed.includes(parsed as T) ? (parsed as T) : fallback;
}

export function parseCollectionState(
  input?: URLSearchParams | string,
): CollectionExperimentState {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.replace(/^\?/, ""))
      : input;
  if (!params) return { ...DEFAULT_COLLECTION_STATE, tags: [], order: [] };

  const tags = (params.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const order = (params.get("order") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    query: params.get("q") ?? DEFAULT_COLLECTION_STATE.query,
    tags,
    view: enumValue(params.get("view"), VIEWS, DEFAULT_COLLECTION_STATE.view),
    width: enumValue(
      params.get("width"),
      WIDTHS,
      DEFAULT_COLLECTION_STATE.width,
    ),
    density: enumValue(
      params.get("density"),
      DENSITIES,
      DEFAULT_COLLECTION_STATE.density,
    ),
    sort: enumValue(params.get("sort"), SORTS, DEFAULT_COLLECTION_STATE.sort),
    columns: numberValue(
      params.get("columns"),
      [1, 2, 3, 4],
      DEFAULT_COLLECTION_STATE.columns,
    ),
    gap: enumValue(
      params.get("gap"),
      ["sm", "md", "lg"],
      DEFAULT_COLLECTION_STATE.gap,
    ),
    cardHeight: enumValue(
      params.get("height"),
      ["auto", "compact", "fixed"],
      DEFAULT_COLLECTION_STATE.cardHeight,
    ),
    alignment: enumValue(
      params.get("align"),
      ALIGNMENTS,
      DEFAULT_COLLECTION_STATE.alignment,
    ),
    overflow: enumValue(
      params.get("overflow"),
      OVERFLOWS,
      DEFAULT_COLLECTION_STATE.overflow,
    ),
    pageSize: numberValue(
      params.get("page"),
      [3, 6, 9],
      DEFAULT_COLLECTION_STATE.pageSize,
    ),
    showImage: boolValue(
      params.get("image"),
      DEFAULT_COLLECTION_STATE.showImage,
    ),
    showSummary: boolValue(
      params.get("summary"),
      DEFAULT_COLLECTION_STATE.showSummary,
    ),
    showTags: boolValue(
      params.get("tagsVisible"),
      DEFAULT_COLLECTION_STATE.showTags,
    ),
    showStatus: boolValue(
      params.get("statusVisible"),
      DEFAULT_COLLECTION_STATE.showStatus,
    ),
    showLinks: boolValue(
      params.get("links"),
      DEFAULT_COLLECTION_STATE.showLinks,
    ),
    iconPosition: enumValue(
      params.get("icons"),
      ICON_POSITIONS,
      DEFAULT_COLLECTION_STATE.iconPosition,
    ),
    palette: enumValue(
      params.get("palette"),
      PALETTES,
      DEFAULT_COLLECTION_STATE.palette,
    ),
    texture: boolValue(params.get("texture"), DEFAULT_COLLECTION_STATE.texture),
    order,
  };
}

function setBool(params: URLSearchParams, key: string, value: boolean): void {
  params.set(key, value ? "1" : "0");
}

export function serializeCollectionState(
  state: CollectionExperimentState,
): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.tags.length) params.set("tags", state.tags.join(","));
  params.set("view", state.view);
  params.set("width", state.width);
  params.set("density", state.density);
  params.set("sort", state.sort);
  params.set("columns", String(state.columns));
  params.set("gap", state.gap);
  params.set("height", state.cardHeight);
  params.set("align", state.alignment);
  params.set("overflow", state.overflow);
  params.set("page", String(state.pageSize));
  setBool(params, "image", state.showImage);
  setBool(params, "summary", state.showSummary);
  setBool(params, "tagsVisible", state.showTags);
  setBool(params, "statusVisible", state.showStatus);
  setBool(params, "links", state.showLinks);
  params.set("icons", state.iconPosition);
  params.set("palette", state.palette);
  setBool(params, "texture", state.texture);
  if (state.order.length) params.set("order", state.order.join(","));
  return `?${params.toString()}`;
}

export function resetCollectionState(): CollectionExperimentState {
  return { ...DEFAULT_COLLECTION_STATE, tags: [], order: [] };
}
