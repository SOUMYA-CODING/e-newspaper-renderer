import {
  DOCUMENT_SCHEMA_VERSION,
  type DocumentBlock,
  type DocumentPage,
  type EditionDocument,
  type PaperFormat,
} from "../document/types";
import { PAPER_DIMENSIONS, asPaperFormat } from "../paper-dimensions";
import { DEFAULT_MARGINS } from "../document/validate";

export type ArrangeArticle = {
  article_id: string;
  headline: string;
  dek?: string | null;
  byline?: string | null;
  body_text?: string | null;
  image?: string | null;
  kicker?: string | null;
  weight?: "lead" | "feature" | "standard" | "brief";
};

export type ArrangeOptions = {
  format?: PaperFormat | string;
  columns?: number;
  gutter?: number;
  margins?: Partial<typeof DEFAULT_MARGINS>;
  mastheadHeight?: number;
  folioHeight?: number;
  articlesPerPage?: number;
};

const WEIGHT_SPAN: Record<NonNullable<ArrangeArticle["weight"]>, number> = {
  lead: 4,
  feature: 3,
  standard: 2,
  brief: 1,
};

const WEIGHT_ROWS: Record<NonNullable<ArrangeArticle["weight"]>, number> = {
  lead: 3,
  feature: 2,
  standard: 2,
  brief: 1,
};

const WEIGHT_ORDER: NonNullable<ArrangeArticle["weight"]>[] = [
  "lead",
  "feature",
  "standard",
  "brief",
];

function blockId(prefix: string, index: number): string {
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}

export function autoArrange(
  articles: ArrangeArticle[],
  options: ArrangeOptions = {}
): EditionDocument {
  const format = asPaperFormat(options.format);
  const dims = PAPER_DIMENSIONS[format];
  const columns = Math.max(1, Math.min(8, options.columns ?? 6));
  const gutter = options.gutter ?? 16;
  const margins = { ...DEFAULT_MARGINS, ...(options.margins ?? {}) };
  const mastheadHeight = options.mastheadHeight ?? 150;
  const folioHeight = options.folioHeight ?? 30;

  const contentW = dims.width - margins.left - margins.right;
  const colW = (contentW - gutter * (columns - 1)) / columns;
  const colX = (i: number) => margins.left + (colW + gutter) * i;
  const spanW = (span: number) =>
    colW * Math.min(span, columns) + gutter * (Math.min(span, columns) - 1);

  const bodyTop = margins.top + mastheadHeight + 12;
  const bodyBottom = dims.height - margins.bottom - folioHeight - 12;
  const bodyH = bodyBottom - bodyTop;
  const rowUnit = Math.max(80, bodyH / 6);

  const sorted = [...articles].sort(
    (a, b) =>
      WEIGHT_ORDER.indexOf(a.weight ?? "standard") -
      WEIGHT_ORDER.indexOf(b.weight ?? "standard")
  );

  const pages: DocumentPage[] = [];
  let pageBlocks: DocumentBlock[] = [];
  let pageNumber = 1;
  let cursorCol = 0;
  let cursorY = bodyTop;
  let rowHeight = 0;
  let blockIndex = 0;

  const startPage = () => {
    pageBlocks = [
      {
        id: blockId("blk_masthead", pageNumber - 1),
        type: "masthead",
        x: margins.left,
        y: margins.top,
        w: contentW,
        h: mastheadHeight,
        props: {},
      },
      {
        id: blockId("blk_folio", pageNumber - 1),
        type: "folio",
        x: margins.left,
        y: dims.height - margins.bottom - folioHeight,
        w: contentW,
        h: folioHeight,
        props: { right: `Page ${pageNumber}` },
      },
    ];
    cursorCol = 0;
    cursorY = bodyTop;
    rowHeight = 0;
  };

  const commitPage = () => {
    pages.push({ page_number: pageNumber, blocks: pageBlocks });
    pageNumber += 1;
    startPage();
  };

  startPage();

  for (const article of sorted) {
    const weight = article.weight ?? "standard";
    const span = Math.min(WEIGHT_SPAN[weight], columns);
    const rows = WEIGHT_ROWS[weight];
    const h = Math.min(rows * rowUnit, bodyH);

    if (cursorCol + span > columns) {
      cursorCol = 0;
      cursorY += rowHeight;
      rowHeight = 0;
    }

    if (cursorY + h > bodyBottom) {
      commitPage();
    }

    pageBlocks.push({
      id: blockId("blk_story", blockIndex),
      type: "story",
      x: colX(cursorCol),
      y: cursorY,
      w: spanW(span),
      h,
      article_id: article.article_id,
      props: {
        kicker: article.kicker ?? "",
        headline: article.headline,
        dek: article.dek ?? "",
        byline: article.byline ?? "",
        body_text: article.body_text ?? "",
        image: article.image ?? null,
        show_image: Boolean(article.image),
        image_h: weight === "lead" ? 240 : 150,
        headline_size: weight === "lead" ? 46 : weight === "feature" ? 30 : 20,
        body_size: weight === "brief" ? 11 : 12,
        body_columns: span >= 3 ? 2 : 1,
      },
    });

    blockIndex += 1;
    cursorCol += span;
    rowHeight = Math.max(rowHeight, h);
  }

  pages.push({ page_number: pageNumber, blocks: pageBlocks });

  return {
    version: DOCUMENT_SCHEMA_VERSION,
    format,
    columns,
    gutter,
    page_px: { w: dims.width, h: dims.height },
    margins,
    pages,
  };
}
