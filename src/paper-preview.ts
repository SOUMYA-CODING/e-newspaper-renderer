import { DEFAULT_GRID_GAP, DEFAULT_PAPER_MARGINS } from "./paper-dimensions";
import type {
  PaperPreviewArticle,
  PaperPreviewInput,
  PaperRenderArticleSnapshot,
  PaperRenderBundle,
  StoryDensity,
} from "./types";

export type { PaperPreviewArticle, PaperPreviewInput };

function positiveIntOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : null;
}

function readOverrides(overrides: Record<string, unknown> | null | undefined) {
  if (!overrides) {
    return {
      show_image: null as boolean | null,
      density: null as StoryDensity | null,
      col_start: null as number | null,
      row_start: null as number | null,
    };
  }
  const density = overrides.density;
  const validDensity =
    density === "full" ||
    density === "textonly" ||
    density === "summary" ||
    density === "headline";
  return {
    show_image: typeof overrides.show_image === "boolean" ? overrides.show_image : null,
    density: validDensity ? (density as StoryDensity) : null,
    col_start: positiveIntOrNull(overrides.col_start),
    row_start: positiveIntOrNull(overrides.row_start),
  };
}

export function getPaperMargins(layoutConfig: Record<string, unknown>) {
  const margins = layoutConfig.margins as Record<string, number> | undefined;
  return {
    top: margins?.top ?? DEFAULT_PAPER_MARGINS.top,
    right: margins?.right ?? DEFAULT_PAPER_MARGINS.right,
    bottom: margins?.bottom ?? DEFAULT_PAPER_MARGINS.bottom,
    left: margins?.left ?? DEFAULT_PAPER_MARGINS.left,
  };
}

export function getGridGap(layoutConfig: Record<string, unknown>) {
  const gap = layoutConfig.gap;
  return typeof gap === "number" ? gap : DEFAULT_GRID_GAP;
}

export function stripHtml(html: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? "").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function snapshotToPreviewArticle(
  snapshot: PaperRenderArticleSnapshot
): PaperPreviewArticle {
  const overrides = readOverrides(snapshot.layout_overrides);
  return {
    article_id: snapshot.article_id,
    sort_order: snapshot.sort_order,
    page_number: snapshot.page_number,
    zone_id: snapshot.zone_id,
    column_span: snapshot.column_span,
    row_span: snapshot.row_span,
    is_lead: snapshot.is_lead,
    title: snapshot.title,
    short_description: snapshot.short_description,
    image: snapshot.image,
    category_title: snapshot.category_title,
    content: snapshot.content ?? null,
    show_image: overrides.show_image,
    density: overrides.density,
    col_start: overrides.col_start,
    row_start: overrides.row_start,
  };
}

export function buildPaperPreviewFromRenderBundle(
  bundle: PaperRenderBundle
): PaperPreviewInput {
  const { edition, articles } = bundle;
  return {
    title: edition.title,
    edition_date: edition.edition_date,
    body_columns: edition.body_columns,
    template_id: edition.template_id,
    theme_id: edition.theme_id,
    headline_font_id: edition.headline_font_id,
    body_font_id: edition.body_font_id,
    layout_config: edition.layout_config ?? {},
    masthead_config: edition.masthead_config ?? {},
    articles: (articles.length > 0 ? articles : edition.articles ?? []).map(
      snapshotToPreviewArticle
    ),
  };
}

export function canPreviewPaper(input: Partial<PaperPreviewInput>): boolean {
  return Boolean(
    input.template_id &&
      input.theme_id &&
      input.headline_font_id &&
      input.body_font_id
  );
}
