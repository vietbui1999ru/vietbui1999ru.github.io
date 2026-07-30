export type ButtonVariant = "solid" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type CollectionView = "grid" | "table" | "rows" | "compact" | "showcase";
export type CollectionWidth = "narrow" | "standard" | "wide" | "fluid";
export type CollectionDensity = "comfortable" | "compact" | "minimal";
export type CollectionSort = "featured" | "date-desc" | "title-asc" | "status";
export type CollectionOverflow = "visible" | "scroll" | "fade" | "paginate";
export type CollectionAlignment = "start" | "center" | "end" | "stretch";
export type CollectionIconPosition = "leading" | "trailing" | "hidden";
export type CollectionPalette =
  | "current"
  | "eggshell"
  | "bone"
  | "linen"
  | "ledger"
  | "cotton";

export interface CollectionExperimentState {
  query: string;
  tags: string[];
  view: CollectionView;
  width: CollectionWidth;
  density: CollectionDensity;
  sort: CollectionSort;
  columns: 1 | 2 | 3 | 4;
  gap: "sm" | "md" | "lg";
  cardHeight: "auto" | "compact" | "fixed";
  alignment: CollectionAlignment;
  overflow: CollectionOverflow;
  pageSize: 3 | 6 | 9;
  showImage: boolean;
  showSummary: boolean;
  showTags: boolean;
  showStatus: boolean;
  showLinks: boolean;
  iconPosition: CollectionIconPosition;
  palette: CollectionPalette;
  texture: boolean;
  order: string[];
}
