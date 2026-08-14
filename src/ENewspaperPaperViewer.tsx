"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ENewspaperBroadsheetRenderer } from "./ENewspaperBroadsheetRenderer";
import { waitForPaperFonts } from "./paper-fonts";
import type { BroadsheetPage } from "./paper-layout";
import type { PaperEditionPagesResult } from "./use-paper-edition-pages";
import type { ResolveMediaUrl } from "./types";

export type ENewspaperPaperViewerProps = {
  edition: PaperEditionPagesResult;
  resolveMediaUrl?: ResolveMediaUrl;
  readOnly?: boolean;
  showPdfTab?: boolean;
  toolbarExtra?: ReactNode;
  className?: string;
};

export function ENewspaperPaperViewer({
  edition,
  resolveMediaUrl,
  readOnly = false,
  showPdfTab = true,
  toolbarExtra,
  className,
}: ENewspaperPaperViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<"layout" | "pdf">("layout");

  const { pages, dims, input, format, tokens, headlineFont, bodyFont, uploadedPdfUrl, zoneSchema } =
    edition;

  const totalPages = pages.length;
  const safeIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const currentPage: BroadsheetPage = pages[safeIndex] ?? pages[0] ?? {
    pageLabel: 1,
    articles: [],
    layouts: [],
    fillers: [],
    furniture: [],
    rows: 1,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const fit = () => {
      const padding = 48;
      const available = el.clientWidth - padding;
      const scale = Math.min(1, available / dims.width);
      setZoom(Number(scale.toFixed(3)));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dims.width]);

  const canShowPdf = !readOnly && showPdfTab && Boolean(uploadedPdfUrl);

  const chromeButtonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    minWidth: 32,
    padding: "0 10px",
    borderRadius: 6,
    border: "1px solid #d4d4d8",
    background: "#fff",
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: 12 }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {canShowPdf ? (
            <>
              <button
                type="button"
                style={{
                  ...chromeButtonStyle,
                  background: mode === "layout" ? "#18181b" : "#fff",
                  color: mode === "layout" ? "#fff" : "#18181b",
                }}
                onClick={() => setMode("layout")}
              >
                Layout preview
              </button>
              <button
                type="button"
                style={{
                  ...chromeButtonStyle,
                  background: mode === "pdf" ? "#18181b" : "#fff",
                  color: mode === "pdf" ? "#fff" : "#18181b",
                }}
                onClick={() => setMode("pdf")}
              >
                Uploaded PDF
              </button>
            </>
          ) : null}
          {toolbarExtra}
        </div>

        {mode === "layout" ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#71717a" }}>
              {dims.label} · {format}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                style={chromeButtonStyle}
                disabled={safeIndex <= 0}
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              <span style={{ fontSize: 12, minWidth: 64, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                Page {currentPage.pageLabel} / {totalPages}
              </span>
              <button
                type="button"
                style={chromeButtonStyle}
                disabled={safeIndex >= totalPages - 1}
                onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              style={chromeButtonStyle}
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
              aria-label="Zoom out"
            >
              −
            </button>
            <span style={{ fontSize: 12, width: 40, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              style={chromeButtonStyle}
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              style={chromeButtonStyle}
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                const scale = Math.min(1, (el.clientWidth - 48) / dims.width);
                setZoom(Number(scale.toFixed(3)));
              }}
              aria-label="Fit to width"
            >
              Fit
            </button>
          </div>
        ) : null}
      </div>

      {mode === "pdf" && uploadedPdfUrl ? (
        <div
          style={{
            flex: 1,
            minHeight: "45vh",
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            overflow: "hidden",
            background: "#f4f4f5",
          }}
        >
          <iframe
            src={uploadedPdfUrl}
            style={{ height: "100%", minHeight: "70vh", width: "100%", border: 0 }}
            title="Edition PDF"
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            alignItems: "flex-start",
            justifyContent: "center",
            overflow: "auto",
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            background: "rgba(228, 228, 231, 0.8)",
            padding: 16,
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <ENewspaperBroadsheetRenderer
              input={input}
              format={format}
              tokens={tokens}
              headlineFont={headlineFont}
              bodyFont={bodyFont}
              articles={currentPage.articles}
              layouts={currentPage.layouts}
              fillers={currentPage.fillers}
              furniture={currentPage.furniture}
              rows={currentPage.rows}
              allArticles={input.articles}
              isFrontPage={currentPage.pageLabel === (pages[0]?.pageLabel ?? 1)}
              zoneSchema={zoneSchema}
              pageNumber={currentPage.pageLabel}
              resolveMediaUrl={resolveMediaUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type ENewspaperPrintPagesProps = {
  edition: PaperEditionPagesResult;
  resolveMediaUrl?: ResolveMediaUrl;
  title?: string;
  onPrint?: () => void;
  toolbar?: ReactNode;
};

export function ENewspaperPrintPages({
  edition,
  resolveMediaUrl,
  title,
  onPrint,
  toolbar,
}: ENewspaperPrintPagesProps) {
  const { pages, dims, input, format, tokens, headlineFont, bodyFont, zoneSchema } = edition;

  const printHandler = useMemo(
    () =>
      onPrint ??
      (async () => {
        if (typeof window === "undefined") return;
        await waitForPaperFonts();
        window.print();
      }),
    [onPrint]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#d4d4d8" }}>
      <style>{`
        @media print {
          @page { size: ${dims.width}px ${dims.height}px; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .np-print-toolbar { display: none !important; }
          .np-print-surface { background: #fff !important; padding: 0 !important; gap: 0 !important; }
          .np-print-page { break-after: page; box-shadow: none !important; }
          .np-print-page:last-child { break-after: auto; }
        }
        .np-print-page { break-after: page; }
      `}</style>

      <div
        className="np-print-toolbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid #e4e4e7",
          background: "#fff",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title ?? input.title}</span>
          <span style={{ fontSize: 12, color: "#71717a" }}>
            {pages.length} page{pages.length === 1 ? "" : "s"} · {dims.label} · {format}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {toolbar}
          <button
            type="button"
            onClick={printHandler}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              border: 0,
              background: "#18181b",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div
        className="np-print-surface"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          padding: 24,
        }}
      >
        {pages.map((page) => (
          <div
            key={page.pageLabel}
            className="np-print-page"
            style={{
              width: dims.width,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <ENewspaperBroadsheetRenderer
              input={input}
              format={format}
              tokens={tokens}
              headlineFont={headlineFont}
              bodyFont={bodyFont}
              articles={page.articles}
              layouts={page.layouts}
              fillers={page.fillers}
              furniture={page.furniture}
              rows={page.rows}
              allArticles={input.articles}
              isFrontPage={page.pageLabel === (pages[0]?.pageLabel ?? 1)}
              zoneSchema={zoneSchema}
              pageNumber={page.pageLabel}
              resolveMediaUrl={resolveMediaUrl}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
