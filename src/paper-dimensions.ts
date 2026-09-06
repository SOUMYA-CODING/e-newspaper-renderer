import type { PaperFormat } from "./document/types";

export type { PaperFormat };

export const PAPER_DIMENSIONS: Record<
  PaperFormat,
  { width: number; height: number; label: string }
> = {
  broadsheet: { width: 1296, height: 1728, label: '13.5" × 18"' },
  tabloid: { width: 1056, height: 1632, label: '11" × 17"' },
  berliner: { width: 992, height: 1408, label: '10.33" × 14.67"' },
  compact: { width: 896, height: 1280, label: '9.33" × 13.33"' },
  magazine: { width: 816, height: 1056, label: '8.5" × 11"' },
};

export const DEFAULT_PAPER_MARGINS = {
  top: 48,
  right: 40,
  bottom: 48,
  left: 40,
};

export const DEFAULT_GRID_GAP = 16;

export const PAPER_ROW_UNIT = 72;

export const MASTHEAD_RESERVE = 152;
export const FOOTER_RESERVE = 34;

export type PaperMargins = { top: number; right: number; bottom: number; left: number };

export function asPaperFormat(value: string | undefined | null): PaperFormat {
  if (
    value === "broadsheet" ||
    value === "tabloid" ||
    value === "berliner" ||
    value === "compact" ||
    value === "magazine"
  ) {
    return value;
  }
  return "broadsheet";
}

export function pageContentWidth(
  format: PaperFormat,
  margins: Pick<PaperMargins, "left" | "right"> = DEFAULT_PAPER_MARGINS
): number {
  return PAPER_DIMENSIONS[format].width - margins.left - margins.right;
}

export function pageContentHeight(
  format: PaperFormat,
  margins: Pick<PaperMargins, "top" | "bottom"> = DEFAULT_PAPER_MARGINS
): number {
  const { height } = PAPER_DIMENSIONS[format];
  return Math.max(
    PAPER_ROW_UNIT,
    height - margins.top - margins.bottom - MASTHEAD_RESERVE - FOOTER_RESERVE
  );
}

export function pageRowCapacity(
  format: PaperFormat,
  margins: Pick<PaperMargins, "top" | "bottom"> = DEFAULT_PAPER_MARGINS
): number {
  return Math.max(3, Math.floor(pageContentHeight(format, margins) / PAPER_ROW_UNIT));
}

export function columnSpanWidth(
  contentWidth: number,
  columns: number,
  colSpan: number,
  gap: number = DEFAULT_GRID_GAP
): number {
  const safeColumns = Math.max(1, columns);
  const span = Math.max(1, Math.min(colSpan, safeColumns));
  const columnWidth = (contentWidth - gap * (safeColumns - 1)) / safeColumns;
  return columnWidth * span + gap * (span - 1);
}

export function rowSpanHeight(
  contentHeight: number,
  rows: number,
  rowSpan: number,
  gap: number = DEFAULT_GRID_GAP
): number {
  const safeRows = Math.max(1, rows);
  const span = Math.max(1, Math.min(rowSpan, safeRows));
  const rowHeight = (contentHeight - gap * (safeRows - 1)) / safeRows;
  return rowHeight * span + gap * (span - 1);
}
