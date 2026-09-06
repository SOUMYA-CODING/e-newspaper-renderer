export const DOCUMENT_SCHEMA_VERSION = 1;

export const BLOCK_TYPES = [
  "story",
  "image",
  "masthead",
  "edition_bar",
  "highlights",
  "quote",
  "editorial",
  "briefs",
  "panel",
  "ad",
  "notice",
  "folio",
  "rule",
  "filler",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type PaperFormat =
  | "broadsheet"
  | "tabloid"
  | "berliner"
  | "compact"
  | "magazine";

export type DocumentBlock = {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  article_id?: string | null;
  jump_to_page?: number | null;
  continued_from_page?: number | null;
  props?: Record<string, unknown>;
};

export type DocumentPage = {
  page_number: number;
  blocks: DocumentBlock[];
};

export type PageMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type EditionDocument = {
  version: number;
  format: PaperFormat | string;
  columns: number;
  gutter: number;
  page_px: { w: number; h: number };
  margins?: Partial<PageMargins>;
  pages: DocumentPage[];
};

export type FontDescriptor = {
  id?: string;
  name?: string;
  font_family: string;
  font_source: "google" | "upload" | "system" | string;
  font_url?: string | null;
  font_file?: string | null;
};

export type ThemeTokens = {
  background: string;
  surface: string;
  text: string;
  rule: string;
  accent: string;
};

export type EditionStyle = {
  format: PaperFormat | string;
  default_columns: number;
  tokens: ThemeTokens;
  masthead: Record<string, unknown>;
  headline_font: FontDescriptor;
  body_font: FontDescriptor;
};

export type RenderBundle = {
  edition: {
    id: string;
    title: string;
    slug: string;
    edition_date: string;
    document: EditionDocument;
    published_pdf?: string | null;
    page_images?: string[];
    render_status?: string;
    [key: string]: unknown;
  };
  style: EditionStyle;
};

export type ResolveMediaUrl = (url: string | null | undefined) => string | null;
