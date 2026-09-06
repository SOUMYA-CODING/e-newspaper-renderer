"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  EditionDocument,
  EditionStyle,
  ResolveMediaUrl,
} from "../document/types";
import {
  assertSupportedDocument,
  documentIsEmpty,
  sortedPages,
} from "../document/validate";
import { usePaperFonts } from "../paper-fonts";
import { DocumentPage } from "./DocumentPage";

export type DocumentViewerProps = {
  document: EditionDocument;
  style: EditionStyle;
  resolveMediaUrl?: ResolveMediaUrl;
  initialPage?: number;
  showPageNav?: boolean;
  outline?: boolean;
  className?: string;
  onPageChange?: (pageNumber: number) => void;
};

export function DocumentViewer({
  document,
  style,
  resolveMediaUrl,
  initialPage = 1,
  showPageNav = true,
  outline = false,
  className,
  onPageChange,
}: DocumentViewerProps) {
  usePaperFonts(style.headline_font, style.body_font);

  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const pages = sortedPages(document);
  const [index, setIndex] = useState(() =>
    Math.max(0, pages.findIndex((p) => p.page_number === initialPage))
  );

  const fit = useCallback(() => {
    const el = frameRef.current;
    if (!el || !document.page_px?.w) return;
    const available = el.clientWidth;
    if (available <= 0) return;
    setScale(Math.min(1, available / document.page_px.w));
  }, [document.page_px?.w]);

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, pages.length - 1));
      setIndex(clamped);
      const page = pages[clamped];
      if (page && onPageChange) onPageChange(page.page_number);
    },
    [pages, onPageChange]
  );

  if (documentIsEmpty(document)) return null;

  try {
    assertSupportedDocument(document);
  } catch {
    return null;
  }

  const page = pages[Math.min(index, pages.length - 1)];
  if (!page) return null;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {showPageNav && pages.length > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 12,
          }}
        >
          <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0}>
            Previous
          </button>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            Page {page.page_number} of {pages.length}
          </span>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= pages.length - 1}
          >
            Next
          </button>
        </div>
      ) : null}

      <div ref={frameRef} style={{ width: "100%", overflow: "hidden" }}>
        <div
          style={{
            width: document.page_px.w * scale,
            height: document.page_px.h * scale,
            margin: "0 auto",
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <DocumentPage
              document={document}
              page={page}
              style={style}
              resolveMediaUrl={resolveMediaUrl}
              outline={outline}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
