import type { LayoutRole } from "./types";

const HEADLINE_WIDTH_FACTOR: Record<LayoutRole, number> = {
  lead: 0.076,
  feature: 0.086,
  standard: 0.094,
  sidebar: 0.098,
  brief: 0.072,
};

const HEADLINE_BOUNDS: Record<LayoutRole, { min: number; max: number }> = {
  lead: { min: 32, max: 86 },
  feature: { min: 23, max: 54 },
  standard: { min: 16, max: 31 },
  sidebar: { min: 15, max: 25 },
  brief: { min: 13, max: 20 },
};

const HEADLINE_HEIGHT_SHARE = 0.34;

export function headlineFontSize(
  role: LayoutRole,
  boxWidth: number,
  boxHeight: number
): number {
  const bounds = HEADLINE_BOUNDS[role];
  const fromWidth = boxWidth * HEADLINE_WIDTH_FACTOR[role];
  const heightCap = (boxHeight * HEADLINE_HEIGHT_SHARE) / 1.06;
  const size = Math.min(fromWidth, heightCap);
  return Math.round(Math.max(bounds.min, Math.min(bounds.max, size)));
}

export function bodyFontSize(role: LayoutRole, boxWidth: number, columnsInBox: number): number {
  const measure = boxWidth / Math.max(1, columnsInBox);
  if (role === "lead") return measure > 260 ? 13 : 12;
  if (role === "brief") return 10;
  if (measure < 170) return 10;
  return measure > 220 ? 12 : 11;
}

export function kickerFontSize(role: LayoutRole): number {
  return role === "lead" ? 12 : 10;
}

export function dekFontSize(headlineSize: number): number {
  return Math.round(Math.max(12, Math.min(20, headlineSize * 0.36)));
}

export function bodyColumnCount(role: LayoutRole, boxWidth: number): number {
  if (role === "brief" || role === "sidebar") return 1;
  const target = 250;
  return Math.max(1, Math.min(4, Math.floor(boxWidth / target)));
}

export function headlineLineHeight(size: number): number {
  return size >= 48 ? 0.98 : size >= 28 ? 1.04 : 1.12;
}

export const BODY_LINE_HEIGHT = 1.46;
