export type TemplateFormat =
  | "broadsheet"
  | "tabloid"
  | "berliner"
  | "compact"
  | "magazine";

export type StoryDensity = "full" | "textonly" | "summary" | "headline";

export type LayoutRole = "lead" | "feature" | "sidebar" | "standard" | "brief";

export type PaperFont = {
  font_family: string;
  font_source: "google" | "upload" | "system" | string;
  font_file?: string | null;
  font_url?: string | null;
};

export type PaperPreviewArticle = {
  article_id: string;
  sort_order: number;
  page_number: number;
  zone_id: string;
  column_span: number;
  row_span: number;
  is_lead: boolean;
  title: string;
  short_description?: string | null;
  image?: string | null;
  category_title?: string | null;
  content?: string | null;
  show_image?: boolean | null;
  density?: StoryDensity | null;
  col_start?: number | null;
  row_start?: number | null;
};

export type PaperPreviewInput = {
  title: string;
  edition_date: string;
  body_columns: number;
  template_id: string;
  theme_id: string;
  headline_font_id: string;
  body_font_id: string;
  layout_config: Record<string, unknown>;
  masthead_config: Record<string, unknown>;
  articles: PaperPreviewArticle[];
};

export type PaperRenderArticleSnapshot = {
  article_id: string;
  title: string;
  slug?: string | null;
  short_description?: string | null;
  image?: string | null;
  category_id?: string | null;
  category_title?: string | null;
  sort_order: number;
  page_number: number;
  zone_id: string;
  column_span: number;
  row_span: number;
  is_lead: boolean;
  layout_overrides?: Record<string, unknown> | null;
  content?: string | null;
};

export type PaperRenderTemplate = {
  id: string;
  format: TemplateFormat | string;
  default_columns: number;
  zone_schema: Record<string, unknown>;
  name?: string;
  slug?: string;
};

export type PaperRenderTheme = {
  id: string;
  tokens: Record<string, unknown>;
  name?: string;
  slug?: string;
};

export type PaperRenderFont = PaperFont & {
  id: string;
  name?: string;
  slug?: string;
  category?: string;
};

export type PaperRenderEdition = {
  id: string;
  title: string;
  edition_date: string;
  slug: string;
  template_id: string;
  theme_id: string;
  headline_font_id: string;
  body_font_id: string;
  body_columns: number;
  layout_config: Record<string, unknown>;
  masthead_config: Record<string, unknown>;
  edition_pdf_file?: string | null;
  edition_pdf_url?: string | null;
  articles?: PaperRenderArticleSnapshot[];
  [key: string]: unknown;
};

export type PaperRenderBundle = {
  edition: PaperRenderEdition;
  template: PaperRenderTemplate;
  theme: PaperRenderTheme;
  headline_font: PaperRenderFont;
  body_font: PaperRenderFont;
  articles: PaperRenderArticleSnapshot[];
};

export type ResolveMediaUrl = (url: string | null | undefined) => string | null;
