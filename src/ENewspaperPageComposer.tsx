"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PAPER_DIMENSIONS, type TemplateFormat } from "./paper-dimensions";
import {
  buildPageGeometry,
  computePageBlocks,
  storyFitReport,
  type ComputedArticleLayout,
  type StoryFitState,
} from "./paper-layout";
import type { PaperPreviewArticle, StoryDensity } from "./types";

export type ComposerPatch = {
  column_span: number;
  row_span: number;
  col_start: number;
  row_start: number;
};

export type ENewspaperPageComposerProps = {
  articles: PaperPreviewArticle[];
  columns: number;
  format: TemplateFormat;
  layoutConfig?: Record<string, unknown>;
  zoneSchema?: Record<string, unknown>;
  pageNumber: number;
  onChange: (articleId: string, patch: ComposerPatch) => void;
  onSelect?: (articleId: string) => void;
  selectedArticleId?: string | null;
  className?: string;
};

type DragState = {
  mode: "move" | "resize";
  articleId: string;
  originCol: number;
  originRow: number;
  originColSpan: number;
  originRowSpan: number;
  startX: number;
  startY: number;
};

const FIT_COLORS: Record<StoryFitState, { border: string; chip: string; label: string }> = {
  good: { border: "#16a34a", chip: "#16a34a", label: "Good" },
  tight: { border: "#d97706", chip: "#d97706", label: "Tight" },
  "no-room": { border: "#dc2626", chip: "#dc2626", label: "No room" },
  empty: { border: "#d4d4d8", chip: "#a1a1aa", label: "No text" },
};

const FIT_HINTS: Record<StoryFitState, string> = {
  good: "Room for a proper story.",
  tight: "Only a couple of lines of copy fit — enlarge the box.",
  "no-room": "The headline fills the box; no copy will print.",
  empty: "No article text loaded for this story.",
};

export function ENewspaperPageComposer({
  articles,
  columns,
  format,
  layoutConfig = {},
  zoneSchema,
  pageNumber,
  onChange,
  onSelect,
  selectedArticleId,
  className,
}: ENewspaperPageComposerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<Record<string, ComposerPatch> | null>(null);

  const safeColumns = Math.max(1, Math.min(6, columns));
  const geometry = useMemo(
    () => buildPageGeometry(format, safeColumns, layoutConfig),
    [format, safeColumns, layoutConfig]
  );

  const pageArticles = useMemo(
    () =>
      articles.filter(
        (article) => (article.page_number || 1) === pageNumber && article.zone_id !== "masthead"
      ),
    [articles, pageNumber]
  );

  const effectiveArticles = useMemo(() => {
    if (!preview) return pageArticles;
    return pageArticles.map((article) => {
      const patch = preview[article.article_id];
      return patch ? { ...article, ...patch } : article;
    });
  }, [pageArticles, preview]);

  const blocks = useMemo(
    () =>
      computePageBlocks(effectiveArticles, safeColumns, zoneSchema, {
        targetRows: geometry.rows,
        justify: false,
      }),
    [effectiveArticles, safeColumns, zoneSchema, geometry.rows]
  );

  const showImages = layoutConfig.show_images !== false;
  const editionDensity = layoutConfig.density as StoryDensity | undefined;

  const cellSize = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return { width: 1, height: 1 };
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width / safeColumns,
      height: rect.height / geometry.rows,
    };
  }, [safeColumns, geometry.rows]);

  const beginDrag = (
    event: ReactPointerEvent,
    layout: ComputedArticleLayout,
    mode: "move" | "resize"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    onSelect?.(layout.article.article_id);
    setDrag({
      mode,
      articleId: layout.article.article_id,
      originCol: layout.colStart,
      originRow: layout.rowStart,
      originColSpan: layout.colSpan,
      originRowSpan: layout.rowSpan,
      startX: event.clientX,
      startY: event.clientY,
    });
  };

  useEffect(() => {
    if (!drag) return;

    const compute = (clientX: number, clientY: number): ComposerPatch => {
      const cell = cellSize();
      const deltaCol = Math.round((clientX - drag.startX) / cell.width);
      const deltaRow = Math.round((clientY - drag.startY) / cell.height);

      if (drag.mode === "move") {
        const colSpan = drag.originColSpan;
        const rowSpan = drag.originRowSpan;
        return {
          column_span: colSpan,
          row_span: rowSpan,
          col_start: clamp(drag.originCol + deltaCol, 1, safeColumns - colSpan + 1),
          row_start: clamp(drag.originRow + deltaRow, 1, geometry.rows - rowSpan + 1),
        };
      }

      const colSpan = clamp(
        drag.originColSpan + deltaCol,
        1,
        safeColumns - drag.originCol + 1
      );
      const rowSpan = clamp(
        drag.originRowSpan + deltaRow,
        1,
        geometry.rows - drag.originRow + 1
      );
      return {
        column_span: colSpan,
        row_span: rowSpan,
        col_start: drag.originCol,
        row_start: drag.originRow,
      };
    };

    const onMove = (event: PointerEvent) => {
      setPreview({ [drag.articleId]: compute(event.clientX, event.clientY) });
    };

    const onUp = (event: PointerEvent) => {
      const patch = compute(event.clientX, event.clientY);
      setPreview(null);
      setDrag(null);
      onChange(drag.articleId, patch);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, cellSize, safeColumns, geometry.rows, onChange]);

  const aspect = PAPER_DIMENSIONS[format].height / PAPER_DIMENSIONS[format].width;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11,
          color: "#52525b",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600 }}>Page {pageNumber}</span>
        <span>
          {safeColumns} cols × {geometry.rows} rows
        </span>
        {(["good", "tight", "no-room", "empty"] as const).map((key) => (
          <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: FIT_COLORS[key].chip,
                display: "inline-block",
              }}
            />
            {FIT_COLORS[key].label}
          </span>
        ))}
        <span style={{ marginLeft: "auto" }}>Drag to move · drag the corner to resize</span>
      </div>

      <div
        ref={canvasRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `1 / ${aspect}`,
          background: "#faf9f6",
          border: "1px solid #d4d4d8",
          borderRadius: 4,
          display: "grid",
          gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${geometry.rows}, minmax(0, 1fr))`,
          gap: 2,
          padding: 2,
          touchAction: "none",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: safeColumns * geometry.rows }).map((_, index) => (
          <div
            key={`grid-${index}`}
            style={{
              gridColumn: `${(index % safeColumns) + 1} / span 1`,
              gridRow: `${Math.floor(index / safeColumns) + 1} / span 1`,
              border: "1px dashed #e4e4e7",
              pointerEvents: "none",
            }}
          />
        ))}

        {blocks.layouts.map((layout) => {
          const report = storyFitReport(layout, geometry, editionDensity, showImages);
          const band = FIT_COLORS[report.state];
          const isSelected = selectedArticleId === layout.article.article_id;
          const isDragging = drag?.articleId === layout.article.article_id;

          const boxStyle: CSSProperties = {
            gridColumn: `${layout.colStart} / span ${layout.colSpan}`,
            gridRow: `${layout.rowStart} / span ${layout.rowSpan}`,
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            background: isDragging ? "rgba(24,24,27,0.06)" : "#fff",
            border: `2px solid ${band.border}`,
            borderRadius: 3,
            boxShadow: isSelected ? "0 0 0 2px rgba(24,24,27,0.35)" : undefined,
            cursor: "grab",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "4px 6px",
          };

          return (
            <div
              key={layout.article.article_id}
              style={boxStyle}
              onPointerDown={(event) => beginDrag(event, layout, "move")}
              data-fit={band.label}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 8,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: band.chip,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                <span>{band.label}</span>
                {report.state !== "empty" ? (
                  <span style={{ color: "#a1a1aa", fontWeight: 500 }} title={FIT_HINTS[report.state]}>
                    shows {Math.round(report.coverage * 100)}%
                  </span>
                ) : null}
                {report.continues && report.state !== "empty" ? (
                  <span style={{ color: "#a1a1aa", fontWeight: 500 }}>· jumps</span>
                ) : null}
                {layout.article.is_lead ? (
                  <span style={{ color: "#b91c1c" }}>· LEAD</span>
                ) : null}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.2,
                  fontWeight: 600,
                  color: "#18181b",
                  overflow: "hidden",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {layout.article.title}
              </p>

              <span style={{ fontSize: 8, color: "#a1a1aa", flexShrink: 0 }}>
                {layout.colSpan}×{layout.rowSpan} · {layout.role}
              </span>

              <span
                onPointerDown={(event) => beginDrag(event, layout, "resize")}
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 14,
                  height: 14,
                  cursor: "nwse-resize",
                  background: band.border,
                  clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                }}
                aria-label="Resize story"
              />
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "#71717a", margin: 0 }}>
&ldquo;shows N%&rdquo; is how much of the article prints in this box — a short box on a
        long story is normal, and the rest continues on a jump page. Watch for
        &ldquo;No room&rdquo;: there the headline fills the box and no copy prints at all.
      </p>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
