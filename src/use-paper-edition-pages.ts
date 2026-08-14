import { useMemo } from "react";
import { asTemplateFormat, PAPER_DIMENSIONS } from "./paper-dimensions";
import { paginateByPageNumber, type BroadsheetPage } from "./paper-layout";
import { getGridGap, getPaperMargins, type PaperPreviewInput } from "./paper-preview";
import type { PaperPreviewArticle, PaperRenderBundle, TemplateFormat } from "./types";
import { buildPaperPreviewFromRenderBundle } from "./paper-preview";

export type PaperEditionPagesResult = {
  input: PaperPreviewInput;
  format: TemplateFormat;
  dims: { width: number; height: number; label: string };
  pages: BroadsheetPage[];
  tokens: Record<string, unknown>;
  headlineFont: PaperRenderBundle["headline_font"];
  bodyFont: PaperRenderBundle["body_font"];
  zoneSchema: Record<string, unknown>;
  uploadedPdfUrl: string | null;
};

export function resolveUploadedPdfUrl(edition: PaperRenderBundle["edition"]): string | null {
  const file = edition.edition_pdf_file;
  const url = edition.edition_pdf_url;
  if (typeof file === "string" && file.trim()) return file;
  if (typeof url === "string" && url.trim()) return url;
  return null;
}

export function buildPaperEditionPages(
  bundle: PaperRenderBundle,
  articlesOverride?: PaperPreviewArticle[]
): PaperEditionPagesResult {
  const input = buildPaperPreviewFromRenderBundle(bundle);
  if (articlesOverride) {
    input.articles = articlesOverride;
  }
  const format = asTemplateFormat(bundle.template.format);
  const dims = PAPER_DIMENSIONS[format];
  const columns = input.body_columns || bundle.template.default_columns || 3;
  const pages = paginateByPageNumber(input.articles, columns, bundle.template.zone_schema, {
    format,
    layoutConfig: input.layout_config,
    mastheadConfig: input.masthead_config,
    editionTitle: input.title,
  });

  return {
    input,
    format,
    dims,
    pages,
    tokens: bundle.theme.tokens ?? {},
    headlineFont: bundle.headline_font,
    bodyFont: bundle.body_font,
    zoneSchema: bundle.template.zone_schema ?? {},
    uploadedPdfUrl: resolveUploadedPdfUrl(bundle.edition),
  };
}

export function usePaperEditionPages(
  bundle: PaperRenderBundle | null | undefined,
  articlesOverride?: PaperPreviewArticle[]
): PaperEditionPagesResult | null {
  return useMemo(() => {
    if (!bundle) return null;
    return buildPaperEditionPages(bundle, articlesOverride);
  }, [bundle, articlesOverride]);
}

export function usePaperEditionPagesFromInput(
  input: PaperPreviewInput | null | undefined,
  options: {
    format: TemplateFormat;
    zoneSchema?: Record<string, unknown>;
    tokens: Record<string, unknown>;
    headlineFont: PaperRenderBundle["headline_font"];
    bodyFont: PaperRenderBundle["body_font"];
    uploadedPdfUrl?: string | null;
  } | null
): PaperEditionPagesResult | null {
  return useMemo(() => {
    if (!input || !options) return null;
    const dims = PAPER_DIMENSIONS[options.format];
    const pages = paginateByPageNumber(input.articles, input.body_columns, options.zoneSchema, {
      format: options.format,
      layoutConfig: input.layout_config,
      mastheadConfig: input.masthead_config,
      editionTitle: input.title,
    });
    return {
      input,
      format: options.format,
      dims,
      pages,
      tokens: options.tokens,
      headlineFont: options.headlineFont,
      bodyFont: options.bodyFont,
      zoneSchema: options.zoneSchema ?? {},
      uploadedPdfUrl: options.uploadedPdfUrl ?? null,
    };
  }, [input, options]);
}

export { getPaperMargins, getGridGap };
