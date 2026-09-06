"use client";

import { useEffect, useState } from "react";
import type {
  EditionDocument,
  EditionStyle,
  ResolveMediaUrl,
} from "../document/types";
import { documentIsEmpty, sortedPages } from "../document/validate";
import { usePaperFonts, waitForPaperFonts } from "../paper-fonts";
import { DocumentPage } from "./DocumentPage";

export const RENDER_READY_ATTRIBUTE = "data-render-ready";

export type DocumentPrintProps = {
  document: EditionDocument;
  style: EditionStyle;
  resolveMediaUrl?: ResolveMediaUrl;
};

export function DocumentPrint({
  document,
  style,
  resolveMediaUrl,
}: DocumentPrintProps) {
  usePaperFonts(style.headline_font, style.body_font);
  const [ready, setReady] = useState(false);
  const pages = sortedPages(document);

  useEffect(() => {
    let cancelled = false;
    waitForPaperFonts().then(() => {
      if (!cancelled) {
        requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [document]);

  if (documentIsEmpty(document)) return null;

  return (
    <div
      {...{ [RENDER_READY_ATTRIBUTE]: ready ? "true" : "false" }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <style>{`
        @page { size: ${document.page_px.w}px ${document.page_px.h}px; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; }
          [data-print-page] { break-after: page; page-break-after: always; }
          [data-print-page]:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      {pages.map((page) => (
        <div key={page.page_number} data-print-page={page.page_number}>
          <DocumentPage
            document={document}
            page={page}
            style={style}
            resolveMediaUrl={resolveMediaUrl}
          />
        </div>
      ))}
    </div>
  );
}
