"use client";

import type { EditionStyle } from "../document/types";
import { fontStack } from "../paper-fonts";

export type FitState = "good" | "tight" | "overflow" | "empty";

export type StoryFitInput = {
  paragraphs: string[];
  boxWidth: number;
  boxHeight: number;
  fontSize: number;
  lineHeight?: number;
  columns?: number;
  columnGap?: number;
  fontFamily: string;
};

export type StoryFitResult = {
  state: FitState;
  fitted: string[];
  overflow: string[];
  usedRatio: number;
  measuredHeight: number;
};

const PROBE_ID = "np-story-fit-probe";
const TIGHT_RATIO = 0.55;

function probeHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let host = document.getElementById(PROBE_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = PROBE_ID;
    host.setAttribute("aria-hidden", "true");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.visibility = "hidden";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);
  }
  return host;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyProbeStyle(host: HTMLElement, input: StoryFitInput) {
  const columns = Math.max(1, input.columns ?? 1);
  host.style.width = `${input.boxWidth}px`;
  host.style.height = "auto";
  host.style.fontFamily = input.fontFamily;
  host.style.fontSize = `${input.fontSize}px`;
  host.style.lineHeight = String(input.lineHeight ?? 1.46);
  host.style.textAlign = "justify";
  host.style.hyphens = "auto";
  host.style.columnCount = String(columns);
  host.style.columnGap = `${input.columnGap ?? 16}px`;
}

function measure(host: HTMLElement, paragraphs: string[]): number {
  host.innerHTML = paragraphs
    .map((p) => `<p style="margin:0 0 .62em">${escapeHtml(p)}</p>`)
    .join("");
  return host.scrollHeight;
}

export function fitStory(input: StoryFitInput): StoryFitResult {
  const paragraphs = input.paragraphs.filter((p) => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return { state: "empty", fitted: [], overflow: [], usedRatio: 0, measuredHeight: 0 };
  }

  const host = probeHost();
  if (!host) {
    return {
      state: "good",
      fitted: paragraphs,
      overflow: [],
      usedRatio: 1,
      measuredHeight: 0,
    };
  }

  applyProbeStyle(host, input);

  const full = measure(host, paragraphs);
  if (full <= input.boxHeight) {
    return {
      state: full / input.boxHeight < TIGHT_RATIO ? "good" : "good",
      fitted: paragraphs,
      overflow: [],
      usedRatio: full / input.boxHeight,
      measuredHeight: full,
    };
  }

  let low = 0;
  let high = paragraphs.length;
  let best = 0;
  let bestHeight = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const height = measure(host, paragraphs.slice(0, mid));
    if (height <= input.boxHeight) {
      best = mid;
      bestHeight = height;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const fitted = paragraphs.slice(0, best);
  const overflow = paragraphs.slice(best);
  const state: FitState =
    best === 0 ? "overflow" : best < Math.ceil(paragraphs.length / 2) ? "tight" : "good";

  return {
    state,
    fitted,
    overflow,
    usedRatio: bestHeight / input.boxHeight,
    measuredHeight: bestHeight,
  };
}

export function bodyFontFamily(style: EditionStyle): string {
  return fontStack(style.body_font);
}
