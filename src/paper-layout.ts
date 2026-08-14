import type { LayoutRole, PaperPreviewArticle, StoryDensity } from "./types";
import {
  DEFAULT_GRID_GAP,
  DEFAULT_PAPER_MARGINS,
  PAPER_ROW_UNIT,
  columnSpanWidth,
  pageContentHeight,
  pageContentWidth,
  pageRowCapacity,
  rowSpanHeight,
  type PaperMargins,
  type TemplateFormat,
} from "./paper-dimensions";
import {
  BODY_LINE_HEIGHT,
  bodyColumnCount,
  bodyFontSize,
  headlineFontSize,
} from "./paper-typography";
import {
  buildStoryBody,
  estimateCharCapacity,
  resolveEffectiveDensity,
  totalBodyChars,
} from "./paper-content";
import {
  buildTopStories,
  parseMasthead,
  planFrontPageFurniture,
  type FurnitureBlock,
  type FurnitureGeometry,
} from "./paper-furniture";

export type { LayoutRole };

export interface ZoneHint {
  id: string;
  label: string;
  default_column_span?: number;
  default_row_span?: number;
}

export interface ComputedArticleLayout {
  article: PaperPreviewArticle;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  role: LayoutRole;
  pinned?: boolean;
  jumpToPage?: number | null;
  isContinuation?: boolean;
  continuedFromPage?: number | null;
  continuationOffset?: number;
}

export interface FillerBlock {
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

export interface EditionPage {
  pageLabel: number;
  articles: PaperPreviewArticle[];
  layouts: ComputedArticleLayout[];
  fillers: FillerBlock[];
  furniture: FurnitureBlock[];
  rows: number;
}

export type BroadsheetPage = EditionPage;

export interface PageGeometry {
  format: TemplateFormat;
  columns: number;
  margins: PaperMargins;
  gap: number;
  rows: number;
  contentWidth: number;
  contentHeight: number;
}

const ROLE_PRIORITY: Record<LayoutRole, number> = {
  lead: 0,
  feature: 1,
  standard: 2,
  sidebar: 3,
  brief: 4,
};

const MAX_GROWTH_RATIO = 2.0;
const MAX_GROWTH_ROWS = 4;
const MAX_PACK_ROWS = 400;

export function zoneHintsFromSchema(
  schema: Record<string, unknown> | undefined
): ZoneHint[] {
  const zones = schema?.zones;
  if (!Array.isArray(zones)) return [];

  return zones.flatMap((zone) => {
    const item = zone as Record<string, unknown>;
    const id = String(item.id ?? "");
    if (!id || id === "masthead") return [];
    return [
      {
        id,
        label: String(item.label ?? id),
        default_column_span:
          typeof item.default_column_span === "number" ? item.default_column_span : undefined,
        default_row_span:
          typeof item.default_row_span === "number" ? item.default_row_span : undefined,
      },
    ];
  });
}

export function roleForArticle(article: PaperPreviewArticle): LayoutRole {
  if (article.is_lead) return "lead";
  const zoneId = article.zone_id ?? "";
  if (zoneId === "lead") return "lead";
  if (zoneId === "sidebar" || zoneId.includes("side")) return "sidebar";
  if (zoneId.includes("brief")) return "brief";
  if (zoneId.includes("feature")) return "feature";
  return "standard";
}

function sortArticles(articles: PaperPreviewArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.is_lead !== b.is_lead) return a.is_lead ? -1 : 1;
    const roleDelta = ROLE_PRIORITY[roleForArticle(a)] - ROLE_PRIORITY[roleForArticle(b)];
    if (roleDelta !== 0) return roleDelta;
    return a.sort_order - b.sort_order;
  });
}

function roleDefaultSpans(role: LayoutRole, columns: number) {
  switch (role) {
    case "lead":
      return { colSpan: Math.max(2, Math.min(columns, columns - 1)), rowSpan: 5 };
    case "feature":
      return { colSpan: Math.min(2, columns), rowSpan: 3 };
    case "sidebar":
      return { colSpan: 1, rowSpan: 3 };
    case "brief":
      return { colSpan: 1, rowSpan: 1 };
    default:
      return { colSpan: 1, rowSpan: 2 };
  }
}

function desiredSpans(
  article: PaperPreviewArticle,
  role: LayoutRole,
  columns: number,
  zoneMap: Map<string, ZoneHint>
) {
  const zone = zoneMap.get(article.zone_id);
  const fallback = roleDefaultSpans(role, columns);
  const colSpan = Math.max(
    1,
    Math.min(columns, article.column_span || zone?.default_column_span || fallback.colSpan)
  );
  const rowSpan = Math.max(1, article.row_span || zone?.default_row_span || fallback.rowSpan);
  return { colSpan, rowSpan };
}

class Occupancy {
  private cells = new Set<number>();

  constructor(private readonly columns: number) {}

  private key(row: number, col: number) {
    return row * (this.columns + 2) + col;
  }

  isFree(row: number, col: number) {
    return !this.cells.has(this.key(row, col));
  }

  canPlace(row: number, col: number, rowSpan: number, colSpan: number, maxRows?: number) {
    if (col < 1 || col + colSpan - 1 > this.columns) return false;
    if (maxRows && row + rowSpan - 1 > maxRows) return false;
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (!this.isFree(r, c)) return false;
      }
    }
    return true;
  }

  mark(row: number, col: number, rowSpan: number, colSpan: number) {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        this.cells.add(this.key(r, c));
      }
    }
  }

  clear(row: number, col: number, rowSpan: number, colSpan: number) {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        this.cells.delete(this.key(r, c));
      }
    }
  }
}

function furnitureBlockedColumns(reserved: FurnitureBlock[]): Set<number> {
  const cols = new Set<number>();
  for (const block of reserved) {
    for (let c = block.colStart; c < block.colStart + block.colSpan; c++) {
      cols.add(c);
    }
  }
  return cols;
}

function packLayouts(
  articles: PaperPreviewArticle[],
  columns: number,
  zoneMap: Map<string, ZoneHint>,
  maxRows: number,
  reserved: FurnitureBlock[]
): { layouts: ComputedArticleLayout[]; spilled: PaperPreviewArticle[] } {
  const occupancy = new Occupancy(columns);
  for (const block of reserved) {
    occupancy.mark(block.rowStart, block.colStart, block.rowSpan, block.colSpan);
  }
  const layouts: ComputedArticleLayout[] = [];
  const spilled: PaperPreviewArticle[] = [];
  const blockedCols = furnitureBlockedColumns(reserved);

  const pinned = articles.filter((a) => a.col_start && a.row_start);
  const floating = articles.filter((a) => !(a.col_start && a.row_start));

  for (const article of pinned) {
    const role = roleForArticle(article);
    const { colSpan, rowSpan } = desiredSpans(article, role, columns, zoneMap);
    const col = Math.max(1, Math.min(columns - colSpan + 1, article.col_start!));
    const row = Math.max(1, article.row_start!);

    if (occupancy.canPlace(row, col, rowSpan, colSpan, maxRows)) {
      occupancy.mark(row, col, rowSpan, colSpan);
      layouts.push({ article, colStart: col, colSpan, rowStart: row, rowSpan, role, pinned: true });
    } else {
      floating.push(article);
    }
  }

  for (const article of floating) {
    const role = roleForArticle(article);
    const { colSpan, rowSpan } = desiredSpans(article, role, columns, zoneMap);

    let placed = false;
    for (let row = 1; row <= maxRows && !placed; row++) {
      for (let col = 1; col <= columns - colSpan + 1; col++) {
        if (blockedCols.has(col) || spansBlockedColumn(col, colSpan, blockedCols)) continue;
        if (!occupancy.canPlace(row, col, rowSpan, colSpan, maxRows)) continue;
        occupancy.mark(row, col, rowSpan, colSpan);
        layouts.push({ article, colStart: col, colSpan, rowStart: row, rowSpan, role });
        placed = true;
        break;
      }
    }

    if (!placed) spilled.push(article);
  }

  return { layouts, spilled };
}

function spansBlockedColumn(colStart: number, colSpan: number, blockedCols: Set<number>): boolean {
  for (let c = colStart; c < colStart + colSpan; c++) {
    if (blockedCols.has(c)) return true;
  }
  return false;
}

function compactVertically(
  layouts: ComputedArticleLayout[],
  columns: number,
  reserved: FurnitureBlock[] = []
) {
  const occupancy = new Occupancy(columns);
  const ordered = [...layouts].sort((a, b) => a.rowStart - b.rowStart || a.colStart - b.colStart);

  for (const block of reserved) {
    occupancy.mark(block.rowStart, block.colStart, block.rowSpan, block.colSpan);
  }

  for (const layout of ordered) {
    occupancy.mark(layout.rowStart, layout.colStart, layout.rowSpan, layout.colSpan);
  }

  for (const layout of ordered) {
    if (layout.pinned) continue;
    occupancy.clear(layout.rowStart, layout.colStart, layout.rowSpan, layout.colSpan);
    let row = layout.rowStart;
    while (row > 1 && occupancy.canPlace(row - 1, layout.colStart, layout.rowSpan, layout.colSpan)) {
      row -= 1;
    }
    layout.rowStart = row;
    occupancy.mark(layout.rowStart, layout.colStart, layout.rowSpan, layout.colSpan);
  }
}

function absorbDeadSpace(
  layouts: ComputedArticleLayout[],
  columns: number,
  targetRows: number,
  authoredRowSpan: Map<ComputedArticleLayout, number>,
  reserved: FurnitureBlock[] = []
): FillerBlock[] {
  const occupancy = new Occupancy(columns);
  for (const layout of layouts) {
    occupancy.mark(layout.rowStart, layout.colStart, layout.rowSpan, layout.colSpan);
  }
  for (const block of reserved) {
    occupancy.mark(block.rowStart, block.colStart, block.rowSpan, block.colSpan);
  }

  if (layouts.length === 0) return collectFillers(occupancy, columns, targetRows);

  const cappedGrowth = (layout: ComputedArticleLayout) => {
    const authored = authoredRowSpan.get(layout) ?? layout.rowSpan;
    return Math.min(Math.ceil(authored * MAX_GROWTH_RATIO), authored + MAX_GROWTH_ROWS);
  };

  const rowsFree = (row: number, colStart: number, colSpan: number) => {
    if (row < 1 || row > targetRows) return false;
    for (let c = colStart; c < colStart + colSpan; c++) {
      if (!occupancy.isFree(row, c)) return false;
    }
    return true;
  };

  const growDown = (limit: (layout: ComputedArticleLayout) => number) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const layout of layouts) {
        if (layout.pinned) continue;
        if (layout.rowSpan >= limit(layout)) continue;
        const nextRow = layout.rowStart + layout.rowSpan;
        if (!rowsFree(nextRow, layout.colStart, layout.colSpan)) continue;
        occupancy.mark(nextRow, layout.colStart, 1, layout.colSpan);
        layout.rowSpan += 1;
        changed = true;
      }
    }
  };

  const growUp = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const layout of layouts) {
        if (layout.pinned) continue;
        const previousRow = layout.rowStart - 1;
        if (!rowsFree(previousRow, layout.colStart, layout.colSpan)) continue;
        occupancy.mark(previousRow, layout.colStart, 1, layout.colSpan);
        layout.rowStart -= 1;
        layout.rowSpan += 1;
        changed = true;
      }
    }
  };

  const growSideways = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const layout of layouts) {
        if (layout.pinned) continue;

        const rightColumn = layout.colStart + layout.colSpan;
        if (
          rightColumn <= columns &&
          !blockedCols.has(rightColumn) &&
          columnRangeFree(rightColumn, layout)
        ) {
          markColumn(rightColumn, layout);
          layout.colSpan += 1;
          changed = true;
          continue;
        }

        const leftColumn = layout.colStart - 1;
        if (
          leftColumn >= 1 &&
          !blockedCols.has(leftColumn) &&
          columnRangeFree(leftColumn, layout)
        ) {
          markColumn(leftColumn, layout);
          layout.colStart -= 1;
          layout.colSpan += 1;
          changed = true;
        }
      }
    }
  };

  function columnRangeFree(column: number, layout: ComputedArticleLayout) {
    for (let r = layout.rowStart; r < layout.rowStart + layout.rowSpan; r++) {
      if (!occupancy.isFree(r, column)) return false;
    }
    return true;
  }

  function markColumn(column: number, layout: ComputedArticleLayout) {
    occupancy.mark(layout.rowStart, column, layout.rowSpan, 1);
  }

  const stretchOrder: FurnitureBlock["kind"][] = [
    "top-stories",
    "stands-for",
    "editorial",
    "quote",
    "filler",
  ];
  const stretchable = [...reserved].sort(
    (a, b) => stretchOrder.indexOf(a.kind) - stretchOrder.indexOf(b.kind)
  );
  const blockedCols = furnitureBlockedColumns(reserved);

  const stretchReserved = (respectMax: boolean) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const block of stretchable) {
        if (respectMax && block.rowSpan >= block.maxRowSpan) continue;
        const nextRow = block.rowStart + block.rowSpan;
        if (rowsFree(nextRow, block.colStart, block.colSpan)) {
          occupancy.mark(nextRow, block.colStart, 1, block.colSpan);
          block.rowSpan += 1;
          changed = true;
          continue;
        }
        const previousRow = block.rowStart - 1;
        if (rowsFree(previousRow, block.colStart, block.colSpan)) {
          occupancy.mark(previousRow, block.colStart, 1, block.colSpan);
          block.rowStart -= 1;
          block.rowSpan += 1;
          changed = true;
        }
      }
    }
  };

  growDown(cappedGrowth);
  growDown(() => targetRows);
  growUp();
  growSideways();

  for (let pass = 0; pass < 4; pass++) {
    if (collectFillers(occupancy, columns, targetRows).length === 0) break;
    stretchReserved(pass === 0);
    growDown(() => targetRows);
    growUp();
    growSideways();
  }

  return collectFillers(occupancy, columns, targetRows);
}

function collectFillers(occupancy: Occupancy, columns: number, targetRows: number): FillerBlock[] {
  const taken = new Set<string>();
  const fillers: FillerBlock[] = [];

  for (let row = 1; row <= targetRows; row++) {
    for (let col = 1; col <= columns; col++) {
      if (!occupancy.isFree(row, col) || taken.has(`${row}:${col}`)) continue;

      let colSpan = 0;
      while (
        col + colSpan <= columns &&
        occupancy.isFree(row, col + colSpan) &&
        !taken.has(`${row}:${col + colSpan}`)
      ) {
        colSpan += 1;
      }

      let rowSpan = 1;
      while (row + rowSpan <= targetRows) {
        let wholeRowFree = true;
        for (let c = col; c < col + colSpan; c++) {
          if (!occupancy.isFree(row + rowSpan, c) || taken.has(`${row + rowSpan}:${c}`)) {
            wholeRowFree = false;
            break;
          }
        }
        if (!wholeRowFree) break;
        rowSpan += 1;
      }

      for (let r = row; r < row + rowSpan; r++) {
        for (let c = col; c < col + colSpan; c++) taken.add(`${r}:${c}`);
      }

      fillers.push({ colStart: col, colSpan, rowStart: row, rowSpan });
    }
  }

  return fillers;
}

export function computePageLayouts(
  articles: PaperPreviewArticle[],
  columns: number,
  zoneSchema?: Record<string, unknown>,
  options?: { targetRows?: number; justify?: boolean }
): ComputedArticleLayout[] {
  return computePageBlocks(articles, columns, zoneSchema, options).layouts;
}

export function computePageBlocks(
  articles: PaperPreviewArticle[],
  columns: number,
  zoneSchema?: Record<string, unknown>,
  options?: { targetRows?: number; justify?: boolean; reserved?: FurnitureBlock[] }
): {
  layouts: ComputedArticleLayout[];
  fillers: FillerBlock[];
  furniture: FurnitureBlock[];
  spilled: PaperPreviewArticle[];
} {
  const safeColumns = Math.max(1, Math.min(6, columns));
  const zoneMap = new Map(zoneHintsFromSchema(zoneSchema).map((zone) => [zone.id, zone]));
  const reserved = (options?.reserved ?? []).map((block) => ({ ...block }));

  if (articles.length === 0) {
    return { layouts: [], fillers: [], furniture: reserved, spilled: [] };
  }

  const sorted = sortArticles(articles);
  const targetRows = options?.targetRows;
  const packLimit = targetRows ?? MAX_PACK_ROWS;

  const { layouts, spilled } = packLayouts(sorted, safeColumns, zoneMap, packLimit, reserved);
  compactVertically(layouts, safeColumns, reserved);

  if (!targetRows || options?.justify === false) {
    return { layouts, fillers: [], furniture: reserved, spilled };
  }

  const authored = new Map(layouts.map((layout) => [layout, layout.rowSpan] as const));
  const fillers = absorbDeadSpace(layouts, safeColumns, targetRows, authored, reserved);

  return { layouts, fillers, furniture: reserved, spilled };
}

export function maxLayoutRow(layouts: ComputedArticleLayout[]) {
  return layouts.reduce(
    (max, layout) => Math.max(max, layout.rowStart + layout.rowSpan - 1),
    1
  );
}

export function furnitureGeometry(geometry: PageGeometry): FurnitureGeometry {
  return {
    columns: geometry.columns,
    rows: geometry.rows,
    columnWidth: columnSpanWidth(geometry.contentWidth, geometry.columns, 1, geometry.gap),
    rowHeight: rowSpanHeight(geometry.contentHeight, geometry.rows, 1, geometry.gap),
    gap: geometry.gap,
  };
}

export function buildPageGeometry(
  format: TemplateFormat,
  columns: number,
  layoutConfig: Record<string, unknown> | undefined,
  rows?: number
): PageGeometry {
  const configMargins = layoutConfig?.margins as Partial<PaperMargins> | undefined;
  const margins: PaperMargins = {
    top: configMargins?.top ?? DEFAULT_PAPER_MARGINS.top,
    right: configMargins?.right ?? DEFAULT_PAPER_MARGINS.right,
    bottom: configMargins?.bottom ?? DEFAULT_PAPER_MARGINS.bottom,
    left: configMargins?.left ?? DEFAULT_PAPER_MARGINS.left,
  };
  const gap = typeof layoutConfig?.gap === "number" ? (layoutConfig.gap as number) : DEFAULT_GRID_GAP;
  const safeColumns = Math.max(1, Math.min(6, columns));

  return {
    format,
    columns: safeColumns,
    margins,
    gap,
    rows: rows ?? pageRowCapacity(format, margins),
    contentWidth: pageContentWidth(format, margins),
    contentHeight: pageContentHeight(format, margins),
  };
}

export type StoryBoxMetrics = {
  boxWidth: number;
  boxHeight: number;
  headlineSize: number;
  bodySize: number;
  bodyColumns: number;
  imageHeight: number;
  showDek: boolean;
  bodyHeight: number;
  estimatedCapacity: number;
};

const HEADLINE_BLOCK_PADDING = 12;
const DEK_BLOCK = 34;
const DATELINE_BLOCK = 16;
const IMAGE_CAPTION_BLOCK = 16;

export function storyBoxMetrics(
  layout: ComputedArticleLayout,
  geometry: PageGeometry,
  density: StoryDensity,
  hasImage: boolean,
  headlineUppercase = true
): StoryBoxMetrics {
  const boxWidth = columnSpanWidth(
    geometry.contentWidth,
    geometry.columns,
    layout.colSpan,
    geometry.gap
  );
  const boxHeight = rowSpanHeight(
    geometry.contentHeight,
    geometry.rows,
    layout.rowSpan,
    geometry.gap
  );

  const bodyColumns = bodyColumnCount(layout.role, boxWidth);
  const bodySize = bodyFontSize(layout.role, boxWidth, bodyColumns);
  const isLead = layout.role === "lead" || layout.role === "feature";

  const chrome = HEADLINE_BLOCK_PADDING + (isLead ? DATELINE_BLOCK : 0);

  const minBodyHeight = Math.min(
    boxHeight * 0.3,
    bodySize * BODY_LINE_HEIGHT * (layout.role === "brief" ? 2 : 4)
  );

  let headlineSize = headlineFontSize(layout.role, boxWidth, boxHeight);
  let imageHeight = hasImage
    ? imageHeightFor(layout.role, boxWidth, boxHeight) + IMAGE_CAPTION_BLOCK
    : 0;
  let showDek = isLead;

  const solve = () => {
    const lines = estimateHeadlineLines(
      layout.article.title,
      boxWidth,
      headlineSize,
      headlineUppercase
    );
    return (
      boxHeight -
      chrome -
      (showDek ? DEK_BLOCK : 0) -
      lines * headlineSize * 1.06 -
      imageHeight
    );
  };

  let bodyHeight = solve();
  const minHeadline = layout.role === "lead" ? 26 : layout.role === "feature" ? 20 : 13;
  let guard = 0;

  while (bodyHeight < minBodyHeight && guard < 40) {
    guard += 1;
    if (headlineSize > minHeadline) {
      headlineSize -= 2;
    } else if (showDek) {
      showDek = false;
    } else if (imageHeight > IMAGE_CAPTION_BLOCK) {
      imageHeight = Math.max(IMAGE_CAPTION_BLOCK, imageHeight - 20);
    } else {
      break;
    }
    bodyHeight = solve();
  }

  return {
    showDek,
    boxWidth,
    boxHeight,
    headlineSize,
    bodySize,
    bodyColumns,
    imageHeight: Math.max(
      0,
      imageHeight - (hasImage ? IMAGE_CAPTION_BLOCK : 0)
    ),
    bodyHeight: Math.max(0, bodyHeight),
    estimatedCapacity:
      density === "headline"
        ? 0
        : estimateCharCapacity({
            widthPx: boxWidth,
            heightPx: Math.max(0, bodyHeight),
            fontSize: bodySize,
            lineHeight: BODY_LINE_HEIGHT,
            columns: bodyColumns,
            columnGap: 16,
          }),
  };
}

const HEADLINE_ADVANCE_UPPERCASE = 0.63;
const HEADLINE_ADVANCE_MIXED = 0.52;

function estimateHeadlineLines(
  title: string,
  boxWidth: number,
  size: number,
  uppercase: boolean
): number {
  const advance = uppercase ? HEADLINE_ADVANCE_UPPERCASE : HEADLINE_ADVANCE_MIXED;
  const charsPerLine = Math.max(6, boxWidth / (size * advance));
  return Math.max(1, Math.ceil(title.length / charsPerLine)) + 1;
}

export function imageAspectRatio(role: LayoutRole): number {
  switch (role) {
    case "lead":
      return 16 / 9;
    case "feature":
      return 3 / 2;
    case "sidebar":
      return 4 / 3;
    default:
      return 16 / 10;
  }
}

export function imageHeightFor(
  role: LayoutRole,
  boxWidth: number,
  boxHeight: number
): number {
  if (boxWidth <= 0 || boxHeight <= 0) return 0;

  const roleHeights: Record<LayoutRole, number> = {
    lead: 200,
    feature: 150,
    standard: 110,
    sidebar: 90,
    brief: 72,
  };
  const target = roleHeights[role] ?? 110;

  const fromWidth = boxWidth / imageAspectRatio(role);
  const maxShare = role === "lead" ? 0.4 : role === "feature" ? 0.34 : 0.28;
  const maxByBox = boxHeight * maxShare;

  return Math.round(Math.max(56, Math.min(target, fromWidth, maxByBox)));
}

export type StoryFitState = "empty" | "no-room" | "tight" | "good";

export type StoryFitReport = {
  state: StoryFitState;
  capacity: number;
  needed: number;
  coverage: number;
  bodyLines: number;
  continues: boolean;
};

export function storyFitReport(
  layout: ComputedArticleLayout,
  geometry: PageGeometry,
  editionDensity: StoryDensity | undefined,
  showImages: boolean
): StoryFitReport {
  const density = resolveEffectiveDensity(layout.article, layout.role, editionDensity);
  const hasImage =
    density !== "textonly" &&
    density !== "headline" &&
    Boolean(layout.article.image) &&
    (layout.article.show_image ?? showImages);

  const metrics = storyBoxMetrics(layout, geometry, density, hasImage);
  const body = buildStoryBody(layout.article, layout.role, density);
  const needed = totalBodyChars(body);
  const capacity = metrics.estimatedCapacity;
  const bodyLines = Math.floor(
    metrics.bodyHeight / (metrics.bodySize * BODY_LINE_HEIGHT)
  );

  if (needed === 0 || density === "headline") {
    return { state: "empty", capacity, needed, coverage: 0, bodyLines, continues: false };
  }

  const coverage = capacity <= 0 ? 0 : Math.min(1, capacity / needed);
  const state: StoryFitState =
    bodyLines < 2 ? "no-room" : bodyLines < 4 ? "tight" : "good";

  return { state, capacity, needed, coverage, bodyLines, continues: needed > capacity };
}

export function storyFitRatio(
  layout: ComputedArticleLayout,
  geometry: PageGeometry,
  editionDensity: StoryDensity | undefined,
  showImages: boolean
): number {
  const density = resolveEffectiveDensity(layout.article, layout.role, editionDensity);
  if (density === "headline") return 0;
  const hasImage =
    density !== "textonly" &&
    Boolean(layout.article.image) &&
    (layout.article.show_image ?? showImages);
  const metrics = storyBoxMetrics(layout, geometry, density, hasImage);
  const body = buildStoryBody(layout.article, layout.role, density);
  const needed = totalBodyChars(body);
  if (metrics.estimatedCapacity <= 0) return needed > 0 ? 2 : 0;
  return needed / metrics.estimatedCapacity;
}

export function paginateByPageNumber(
  articles: PaperPreviewArticle[],
  columns: number,
  zoneSchema?: Record<string, unknown>,
  options?: {
    format?: TemplateFormat;
    layoutConfig?: Record<string, unknown>;
    mastheadConfig?: Record<string, unknown>;
    editionTitle?: string;
  }
): EditionPage[] {
  const format = options?.format ?? "broadsheet";
  const geometry = buildPageGeometry(format, columns, options?.layoutConfig);
  const targetRows = geometry.rows;
  const justify = options?.layoutConfig?.justify_vertical !== false;
  const masthead = parseMasthead(
    options?.mastheadConfig ?? {},
    options?.editionTitle ?? ""
  );

  const byPage = new Map<number, PaperPreviewArticle[]>();
  for (const article of articles) {
    if (article.zone_id === "masthead") continue;
    const key = article.page_number || 1;
    if (!byPage.has(key)) byPage.set(key, []);
    byPage.get(key)!.push(article);
  }

  const orderedKeys = Array.from(byPage.keys()).sort((a, b) => a - b);
  if (orderedKeys.length === 0) {
    return [
      { pageLabel: 1, articles: [], layouts: [], fillers: [], furniture: [], rows: targetRows },
    ];
  }

  const pages: EditionPage[] = [];
  const queue: Array<{ key: number; articles: PaperPreviewArticle[] }> = orderedKeys.map(
    (key) => ({ key, articles: byPage.get(key)! })
  );

  let label = 1;
  let guard = 0;
  while (queue.length > 0 && guard < 200) {
    guard += 1;
    const next = queue.shift()!;
    const group = sortArticles(next.articles);
    const isFrontPage = label === 1;
    const reserved = isFrontPage
      ? planFrontPageFurniture(
          masthead,
          furnitureGeometry(geometry),
          buildTopStories(articles, 1).length
        )
      : [];

    const { layouts, fillers, furniture, spilled } = computePageBlocks(
      group,
      columns,
      zoneSchema,
      { targetRows, justify, reserved }
    );

    pages.push({
      pageLabel: label,
      articles: group.filter((article) => !spilled.includes(article)),
      layouts,
      fillers,
      furniture,
      rows: targetRows,
    });
    label += 1;

    if (spilled.length > 0) {
      queue.unshift({ key: next.key, articles: spilled });
    }
  }

  return assignJumps(pages, geometry, columns, zoneSchema, options?.layoutConfig);
}

function assignJumps(
  pages: EditionPage[],
  geometry: PageGeometry,
  columns: number,
  zoneSchema: Record<string, unknown> | undefined,
  layoutConfig: Record<string, unknown> | undefined
): EditionPage[] {
  if (layoutConfig?.allow_jumps !== true || pages.length === 0) return pages;

  const showImages = layoutConfig?.show_images !== false;
  const editionDensity = layoutConfig?.density as StoryDensity | undefined;
  const jumpPageLabel = pages[pages.length - 1].pageLabel + 1;

  const continuations: Array<{
    article: PaperPreviewArticle;
    fromPage: number;
    offset: number;
  }> = [];

  for (const page of pages) {
    for (const layout of page.layouts) {
      if (layout.role !== "lead" && layout.role !== "feature") continue;

      const density = resolveEffectiveDensity(layout.article, layout.role, editionDensity);
      if (density !== "full") continue;

      const hasImage =
        Boolean(layout.article.image) && (layout.article.show_image ?? showImages);
      const metrics = storyBoxMetrics(layout, geometry, density, hasImage);
      const body = buildStoryBody(layout.article, layout.role, density);
      const needed = totalBodyChars(body);
      if (metrics.estimatedCapacity <= 0 || needed <= metrics.estimatedCapacity * 1.08) continue;

      layout.jumpToPage = jumpPageLabel;
      continuations.push({
        article: layout.article,
        fromPage: page.pageLabel,
        offset: metrics.estimatedCapacity,
      });
    }
  }

  if (continuations.length === 0) return pages;

  const jumpArticles: PaperPreviewArticle[] = continuations.map((entry, index) => ({
    ...entry.article,
    sort_order: index,
    page_number: jumpPageLabel,
    zone_id: "continuation",
    is_lead: false,
    column_span: Math.min(2, columns),
    row_span: 4,
  }));

  const { layouts, fillers, furniture } = computePageBlocks(jumpArticles, columns, zoneSchema, {
    targetRows: geometry.rows,
    justify: layoutConfig?.justify_vertical !== false,
  });

  for (const layout of layouts) {
    const source = continuations.find((entry) => entry.article.article_id === layout.article.article_id);
    layout.isContinuation = true;
    layout.continuedFromPage = source?.fromPage ?? null;
    layout.continuationOffset = source?.offset ?? 0;
  }

  pages.push({
    pageLabel: jumpPageLabel,
    articles: jumpArticles,
    layouts,
    fillers,
    furniture,
    rows: geometry.rows,
  });

  return pages;
}

export function paginateBroadsheet(
  articles: PaperPreviewArticle[],
  params: {
    columns: number;
    contentWidth?: number;
    contentHeight?: number;
    gap?: number;
    showImages?: boolean;
    density?: StoryDensity;
    zoneSchema?: Record<string, unknown>;
    format?: TemplateFormat;
    layoutConfig?: Record<string, unknown>;
  }
): EditionPage[] {
  return paginateByPageNumber(articles, params.columns, params.zoneSchema, {
    format: params.format,
    layoutConfig: params.layoutConfig,
  });
}

export function buildEditionPages(
  articles: PaperPreviewArticle[],
  columns: number,
  _rowCapacity: number,
  zoneSchema?: Record<string, unknown>,
  options?: { format?: TemplateFormat; layoutConfig?: Record<string, unknown> }
): EditionPage[] {
  return paginateByPageNumber(articles, columns, zoneSchema, options);
}

export { PAPER_ROW_UNIT };
