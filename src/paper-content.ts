import { stripHtml } from "./paper-preview";
import type { LayoutRole, PaperPreviewArticle, StoryDensity } from "./types";

export function stripRichEmbeds(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?\/?>/gi, "")
    .replace(/<blockquote[^>]*class="[^"]*twitter-tweet[^"]*"[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<picture[\s\S]*?<\/picture>/gi, "")
    .replace(/<img[\s\S]*?\/?>/gi, "");
}

export function extractColumnParagraphs(content: string | null | undefined): string[] {
  if (!content?.trim()) return [];

  const cleaned = stripRichEmbeds(content);
  const paragraphMatches = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const paragraphs = paragraphMatches
    .map((match) => stripHtml(match[1]))
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length > 0) return paragraphs;

  const plain = stripHtml(cleaned);
  if (!plain) return [];

  return plain
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function truncatePlain(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

export function resolveEffectiveDensity(
  article: PaperPreviewArticle,
  role: LayoutRole,
  editionDensity: StoryDensity | undefined
): StoryDensity {
  if (article.density) return article.density;
  if (editionDensity && editionDensity !== "full") return editionDensity;
  if (role === "brief") return "headline";
  if (role === "sidebar") return "summary";
  return "full";
}

const AVG_CHAR_EM = 0.478;
const SETTING_EFFICIENCY = 0.93;

export type TextBoxMetrics = {
  widthPx: number;
  heightPx: number;
  fontSize: number;
  lineHeight: number;
  columns: number;
  columnGap?: number;
};

export function estimateCharCapacity({
  widthPx,
  heightPx,
  fontSize,
  lineHeight,
  columns,
  columnGap = 16,
}: TextBoxMetrics): number {
  if (widthPx <= 0 || heightPx <= 0 || fontSize <= 0) return 0;
  const safeColumns = Math.max(1, columns);
  const columnWidth = (widthPx - columnGap * (safeColumns - 1)) / safeColumns;
  if (columnWidth <= 0) return 0;

  const charsPerLine = Math.max(1, columnWidth / (fontSize * AVG_CHAR_EM));
  const linesPerColumn = Math.max(0, Math.floor(heightPx / (fontSize * lineHeight)));

  return Math.floor(charsPerLine * linesPerColumn * safeColumns * SETTING_EFFICIENCY);
}

export function bodyCharBudget(role: LayoutRole, rowSpan: number): number {
  switch (role) {
    case "lead":
      return Math.min(2400, rowSpan * 520);
    case "feature":
      return Math.min(900, rowSpan * 280);
    case "sidebar":
      return Math.min(420, rowSpan * 180);
    case "brief":
      return 0;
    default:
      return Math.min(560, rowSpan * 220);
  }
}

export function leadParagraphLimit(rowSpan: number): number {
  return Math.min(10, Math.max(3, rowSpan * 2));
}

export type StoryBody = {
  paragraphs: string[];
  plain: string | null;
  dek: string | null;
};

export function plainDek(article: PaperPreviewArticle): string | null {
  if (!article.short_description?.trim()) return null;
  const raw = article.short_description.trim();
  return raw.includes("<") ? stripHtml(raw) : raw;
}

export function buildStoryBody(
  article: PaperPreviewArticle,
  role: LayoutRole,
  density: StoryDensity
): StoryBody {
  const dek = role === "lead" || role === "feature" ? plainDek(article) : null;

  if (density === "headline") {
    return { paragraphs: [], plain: null, dek: null };
  }

  if (density === "textonly" || density === "summary") {
    const summarySource =
      article.short_description?.trim() ||
      (article.content ? stripHtml(stripRichEmbeds(article.content)) : "");
    if (!summarySource) return { paragraphs: [], plain: null, dek: null };
    return { paragraphs: [summarySource], plain: summarySource, dek: null };
  }

  const paragraphs = extractColumnParagraphs(article.content);
  if (paragraphs.length > 0) {
    return { paragraphs, plain: paragraphs.join("\n\n"), dek };
  }

  const fallback =
    article.short_description?.trim() ||
    (article.content ? stripHtml(stripRichEmbeds(article.content)) : "");
  if (!fallback) return { paragraphs: [], plain: null, dek };
  return { paragraphs: [fallback], plain: fallback, dek };
}

export function totalBodyChars(body: StoryBody): number {
  return body.paragraphs.reduce((sum, paragraph) => sum + paragraph.length + 1, 0);
}

export function sliceParagraphsToBudget(
  paragraphs: string[],
  budget: number
): { paragraphs: string[]; truncated: boolean; consumedChars: number } {
  if (budget <= 0) return { paragraphs: [], truncated: paragraphs.length > 0, consumedChars: 0 };

  const kept: string[] = [];
  let used = 0;

  for (const paragraph of paragraphs) {
    const remaining = budget - used;
    if (remaining <= 0) {
      return { paragraphs: kept, truncated: true, consumedChars: used };
    }
    if (paragraph.length <= remaining) {
      kept.push(paragraph);
      used += paragraph.length + 1;
      continue;
    }
    if (remaining > 90) {
      kept.push(truncatePlain(paragraph, remaining));
      used += remaining;
    }
    return { paragraphs: kept, truncated: true, consumedChars: used };
  }

  return { paragraphs: kept, truncated: false, consumedChars: used };
}

export function remainderAfterChars(body: StoryBody, consumedChars: number): string[] {
  if (consumedChars <= 0) return body.paragraphs;
  let seen = 0;
  const rest: string[] = [];
  for (const paragraph of body.paragraphs) {
    const end = seen + paragraph.length + 1;
    if (end <= consumedChars) {
      seen = end;
      continue;
    }
    if (seen >= consumedChars) {
      rest.push(paragraph);
    } else {
      const offset = consumedChars - seen;
      const tail = paragraph.slice(offset).trimStart();
      if (tail) rest.push(tail);
    }
    seen = end;
  }
  return rest;
}

export function splitDropcap(paragraph: string): { dropcap: string | null; rest: string } {
  const trimmed = paragraph.trim();
  if (!trimmed) return { dropcap: null, rest: "" };
  const firstChar = trimmed.charAt(0);
  if (!/[A-Za-z]/.test(firstChar)) return { dropcap: null, rest: trimmed };
  return { dropcap: firstChar, rest: trimmed.slice(1) };
}
