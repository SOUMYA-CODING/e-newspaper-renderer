"use client";

import { useEffect } from "react";
import type { PaperFont } from "./types";

const GOOGLE_WEIGHTS = "ital,wght@0,400;0,600;0,700;0,800;1,400;1,700";

export function googleFontHref(fontFamily: string): string {
  const family = fontFamily.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:${GOOGLE_WEIGHTS}&display=block`;
}

export function fontStack(font: PaperFont): string {
  return `"${font.font_family}", Georgia, "Times New Roman", serif`;
}

function ensureStylesheet(href: string, key: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-paper-font="${key}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-paper-font", key);
  document.head.appendChild(link);
}

function ensureUploadedFace(font: PaperFont) {
  if (typeof document === "undefined") return;
  const src = font.font_file || font.font_url;
  if (!src) return;
  const key = `upload:${font.font_family}`;
  if (document.querySelector(`style[data-paper-font="${key}"]`)) return;
  const style = document.createElement("style");
  style.setAttribute("data-paper-font", key);
  style.textContent = `@font-face{font-family:"${font.font_family}";src:url("${src}");font-display:block;}`;
  document.head.appendChild(style);
}

export function usePaperFonts(...fonts: PaperFont[]) {
  const signature = fonts
    .map((font) => `${font.font_source}:${font.font_family}:${font.font_file ?? font.font_url ?? ""}`)
    .join("|");

  useEffect(() => {
    for (const font of fonts) {
      if (!font?.font_family) continue;
      if (font.font_source === "google") {
        ensureStylesheet(googleFontHref(font.font_family), `google:${font.font_family}`);
      } else if (font.font_source === "upload") {
        ensureUploadedFace(font);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}

export async function waitForPaperFonts(timeoutMs = 5000): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
