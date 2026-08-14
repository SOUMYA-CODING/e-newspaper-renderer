import type { PaperPreviewArticle } from "./types";

export type FurnitureKind =
  | "top-stories"
  | "editorial"
  | "quote"
  | "stands-for"
  | "filler";

export interface FurnitureBlock {
  kind: FurnitureKind;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  maxRowSpan: number;
}

export type FurnitureGeometry = {
  columns: number;
  rows: number;
  columnWidth: number;
  rowHeight: number;
  gap: number;
};

const PANEL_HEADING = 24;
const PANEL_PADDING = 16;
const AVG_CHAR_EM = 0.478;

function wrappedLines(text: string, width: number, fontSize: number): number {
  const charsPerLine = Math.max(4, width / (fontSize * AVG_CHAR_EM));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function rowsForHeight(height: number, geometry: FurnitureGeometry): number {
  const unit = geometry.rowHeight + geometry.gap;
  return Math.max(1, Math.ceil((height + geometry.gap) / unit));
}

function editorialRows(body: string, geometry: FurnitureGeometry): number {
  const inner = geometry.columnWidth - PANEL_PADDING;
  const lines = wrappedLines(body, inner, 10.5) + 1;
  return rowsForHeight(PANEL_HEADING + PANEL_PADDING + lines * 10.5 * 1.5, geometry);
}

function quoteRows(quote: PaperQuote, geometry: FurnitureGeometry): number {
  const inner = geometry.columnWidth - 20;
  const height =
    PANEL_HEADING +
    20 +
    18 +
    wrappedLines(quote.text, inner, 13) * 13 * 1.4 +
    (quote.attribution ? 16 : 0);
  return rowsForHeight(height, geometry);
}

function standsForRows(items: string[], geometry: FurnitureGeometry): number {
  const inner = geometry.columnWidth - PANEL_PADDING - 14;
  const body = items.reduce(
    (sum, item) => sum + (wrappedLines(item, inner, 10) + 0.5) * 10 * 1.3 + 6,
    0
  );
  return rowsForHeight(PANEL_HEADING + PANEL_PADDING + body, geometry);
}

function topStoriesRows(count: number, geometry: FurnitureGeometry): number {
  const perStory = 10 * 1.3 * 2 + 12 + 14;
  return rowsForHeight(PANEL_HEADING + PANEL_PADDING + count * perStory, geometry);
}

export type PaperContact = {
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
};

export type PaperEditorial = {
  title: string;
  body: string;
};

export type PaperQuote = {
  title: string;
  text: string;
  attribution: string | null;
};

export type PaperHighlight = {
  label: string;
  title: string;
  image: string | null;
  page: number;
};

export type PaperMasthead = {
  title: string;
  tagline: string | null;
  logoUrl: string | null;
  editionLabel: string | null;
  volume: string | null;
  issue: string | null;
  price: string | null;
  pages: number | null;
  agency: string;
  section: string | null;
  contact: PaperContact;
  editorial: PaperEditorial | null;
  quote: PaperQuote | null;
  standsFor: string[];
  standsForTitle: string;
  topStoriesTitle: string;
  highlightsTitle: string;
  showHighlights: boolean;
  showTopStories: boolean;
  /** Side rails (quote, editorial, top stories) — on when panel content is configured. */
  showFurnitureRails: boolean;
  showContactNote: boolean;
};

const DEFAULT_AGENCY = "PRESS TRUST OF INDIA";

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = text(item);
    return parsed ? [parsed] : [];
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseMasthead(
  config: Record<string, unknown>,
  fallbackTitle: string
): PaperMasthead {
  const contact = record(config.contact);
  const editorial = record(config.editorial);
  const quote = record(config.quote);

  const editorialBody = text(editorial.body);
  const quoteText = text(quote.text);
  const standsForItems = stringList(config.stands_for);

  return {
    title: text(config.title) ?? fallbackTitle,
    tagline: text(config.tagline),
    logoUrl: text(config.logo_url),
    editionLabel: text(config.edition_label),
    volume: text(config.volume),
    issue: text(config.issue),
    price: text(config.price),
    pages: typeof config.pages === "number" && config.pages > 0 ? config.pages : null,
    agency: text(config.agency) ?? DEFAULT_AGENCY,
    section: text(config.section),
    contact: {
      website: text(contact.website),
      email: text(contact.email),
      phone: text(contact.phone),
      address: text(contact.address),
      note: text(contact.note),
    },
    editorial: editorialBody
      ? { title: text(editorial.title) ?? "Editorial", body: editorialBody }
      : null,
    quote: quoteText
      ? {
          title: text(quote.title) ?? "Thought of the Month",
          text: quoteText,
          attribution: text(quote.attribution),
        }
      : null,
    standsFor: standsForItems,
    standsForTitle: text(config.stands_for_title) ?? "What We Stand For",
    topStoriesTitle: text(config.top_stories_title) ?? "Top Stories",
    highlightsTitle: text(config.highlights_title) ?? "Today's Highlights",
    showHighlights: config.show_highlights !== false,
    showTopStories: config.show_top_stories === true,
    showFurnitureRails:
      config.show_furniture_rails === false
        ? false
        : config.show_furniture_rails === true || config.show_top_stories === true,
    showContactNote:
      config.show_contact_note === false ? false : Boolean(text(contact.note)),
  };
}

export function buildHighlights(
  articles: PaperPreviewArticle[],
  frontPage: number,
  limit = 5
): PaperHighlight[] {
  const seen = new Set<number>();
  const highlights: PaperHighlight[] = [];

  for (const article of articles) {
    const page = article.page_number || 1;
    if (page === frontPage || seen.has(page)) continue;
    seen.add(page);
    highlights.push({
      label: "Inside",
      title: article.title,
      image: article.image ?? null,
      page,
    });
    if (highlights.length >= limit) break;
  }

  return highlights;
}

export function buildTopStories(
  articles: PaperPreviewArticle[],
  frontPage: number,
  limit = 5
): Array<{ title: string; page: number }> {
  return articles
    .filter((article) => (article.page_number || 1) !== frontPage)
    .slice(0, limit)
    .map((article) => ({ title: article.title, page: article.page_number || 1 }));
}

export function planFrontPageFurniture(
  masthead: PaperMasthead,
  geometry: FurnitureGeometry,
  topStoriesCount: number
): FurnitureBlock[] {
  const { columns, rows } = geometry;
  if (!masthead.showFurnitureRails || columns < 2) return [];

  const blocks: FurnitureBlock[] = [];
  const lastColumn = columns;
  const twoRails = columns >= 5;

  const place = (kind: FurnitureKind, column: number, startRow: number, natural: number) => {
    const available = rows - startRow + 1;
    if (available < 2) return startRow;
    const span = Math.max(2, Math.min(natural, available));
    blocks.push({
      kind,
      colStart: column,
      colSpan: 1,
      rowStart: startRow,
      rowSpan: span,
      maxRowSpan: Math.min(available, span + 2),
    });
    return startRow + span;
  };

  const leftColumn = twoRails ? 1 : lastColumn;
  let row = 1;

  if (masthead.showTopStories && topStoriesCount > 0) {
    row = place(
      "top-stories",
      leftColumn,
      row,
      topStoriesRows(topStoriesCount, geometry)
    );
  }

  return blocks;
}

export function hasInlineFrontPagePanels(masthead: PaperMasthead): boolean {
  return Boolean(masthead.quote || masthead.editorial || masthead.standsFor.length > 0);
}
