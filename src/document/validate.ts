import {
  BLOCK_TYPES,
  DOCUMENT_SCHEMA_VERSION,
  type BlockType,
  type DocumentBlock,
  type DocumentPage,
  type EditionDocument,
  type PageMargins,
} from "./types";

export class DocumentSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentSchemaError";
  }
}

const BLOCK_TYPE_SET = new Set<string>(BLOCK_TYPES);

export const DEFAULT_MARGINS: PageMargins = {
  top: 8,
  right: 24,
  bottom: 18,
  left: 24,
};

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && BLOCK_TYPE_SET.has(value);
}

export function assertSupportedDocument(document: EditionDocument): void {
  if (document.version !== DOCUMENT_SCHEMA_VERSION) {
    throw new DocumentSchemaError(
      `Unsupported document version ${document.version}; this renderer speaks version ${DOCUMENT_SCHEMA_VERSION}`
    );
  }
  if (!document.page_px || !(document.page_px.w > 0) || !(document.page_px.h > 0)) {
    throw new DocumentSchemaError("Document is missing a positive page_px size");
  }
}

export function resolveMargins(document: EditionDocument): PageMargins {
  const m = document.margins ?? {};
  return {
    top: m.top ?? DEFAULT_MARGINS.top,
    right: m.right ?? DEFAULT_MARGINS.right,
    bottom: m.bottom ?? DEFAULT_MARGINS.bottom,
    left: m.left ?? DEFAULT_MARGINS.left,
  };
}

export function sortedPages(document: EditionDocument): DocumentPage[] {
  return [...(document.pages ?? [])].sort(
    (a, b) => a.page_number - b.page_number
  );
}

export function pageByNumber(
  document: EditionDocument,
  pageNumber: number
): DocumentPage | null {
  return (
    (document.pages ?? []).find((page) => page.page_number === pageNumber) ?? null
  );
}

export function renderableBlocks(page: DocumentPage): DocumentBlock[] {
  return (page.blocks ?? []).filter((block) => isBlockType(block.type));
}

export function documentIsEmpty(document: EditionDocument | null | undefined): boolean {
  if (!document || !Array.isArray(document.pages)) return true;
  return !document.pages.some((page) => (page.blocks ?? []).length > 0);
}

export function contentWidth(document: EditionDocument): number {
  const margins = resolveMargins(document);
  return document.page_px.w - margins.left - margins.right;
}

export function columnWidth(document: EditionDocument): number {
  const columns = Math.max(1, document.columns);
  const gutter = document.gutter ?? 16;
  return (contentWidth(document) - gutter * (columns - 1)) / columns;
}

export function columnX(document: EditionDocument, columnIndex: number): number {
  const margins = resolveMargins(document);
  const gutter = document.gutter ?? 16;
  return margins.left + (columnWidth(document) + gutter) * (columnIndex - 1);
}

export function spanWidth(document: EditionDocument, span: number): number {
  const gutter = document.gutter ?? 16;
  const safeSpan = Math.max(1, Math.min(span, document.columns));
  return columnWidth(document) * safeSpan + gutter * (safeSpan - 1);
}
