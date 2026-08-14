import { stripRichEmbeds } from "./paper-content";
import { stripHtml } from "./paper-preview";

export function sanitizeArticleHtml(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  return stripHtml(stripRichEmbeds(html));
}

export function looksLikeHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
