"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { sliceParagraphsToBudget } from "./paper-content";

export type FitOutcome = {
  paragraphs: string[];
  truncated: boolean;
  consumedChars: number;
  measured: boolean;
};

export type FitOptions = {
  multiColumn: boolean;
  dropCap: boolean;
  paragraphSpacing: string;
};

const BINARY_SEARCH_STEPS = 14;
const CHAR_GRANULARITY = 16;

function buildProbeMarkup(paragraphs: string[], options: FitOptions): string {
  return paragraphs
    .map((paragraph, index) => {
      const text = escapeHtml(paragraph);
      if (options.dropCap && index === 0 && paragraph.length > 1) {
        return `<p style="margin:0 0 ${options.paragraphSpacing};break-inside:avoid-column"><span style="float:left;font-weight:700;font-size:3.2em;line-height:0.72;padding-right:6px;padding-top:2px">${text.charAt(
          0
        )}</span>${text.slice(1)}</p>`;
      }
      return `<p style="margin:0 0 ${options.paragraphSpacing};break-inside:avoid-column">${text}</p>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fitParagraphsToBox(
  host: HTMLElement,
  paragraphs: string[],
  maxHeight: number,
  options: FitOptions
): { paragraphs: string[]; truncated: boolean; consumedChars: number } {
  const totalChars = paragraphs.reduce((sum, p) => sum + p.length + 1, 0);
  if (totalChars === 0 || maxHeight <= 0) {
    return { paragraphs: [], truncated: totalChars > 0, consumedChars: 0 };
  }

  const parent = host.parentElement;
  if (!parent || host.clientWidth <= 0) {
    return { paragraphs, truncated: false, consumedChars: totalChars };
  }

  const probe = host.cloneNode(false) as HTMLElement;
  probe.removeAttribute("id");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.left = "-100000px";
  probe.style.top = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.boxSizing = "border-box";
  probe.style.width = `${host.clientWidth}px`;
  probe.style.height = `${maxHeight}px`;
  probe.style.maxHeight = `${maxHeight}px`;
  probe.style.overflow = "hidden";
  if (options.multiColumn) probe.style.columnFill = "auto";
  parent.appendChild(probe);

  const overflows = () =>
    options.multiColumn
      ? probe.scrollWidth > probe.clientWidth + 1
      : probe.scrollHeight > probe.clientHeight + 1;

  const applyBudget = (budget: number) => {
    const slice = sliceParagraphsToBudget(paragraphs, budget);
    probe.innerHTML = buildProbeMarkup(slice.paragraphs, options);
    return slice;
  };

  try {
    const whole = applyBudget(totalChars);
    if (!overflows()) {
      return { paragraphs: whole.paragraphs, truncated: false, consumedChars: totalChars };
    }

    let low = 0;
    let high = totalChars;
    let best = { paragraphs: [] as string[], truncated: true, consumedChars: 0 };

    for (let step = 0; step < BINARY_SEARCH_STEPS && high - low > CHAR_GRANULARITY; step++) {
      const mid = Math.floor((low + high) / 2);
      const slice = applyBudget(mid);
      if (overflows()) {
        high = mid;
      } else {
        low = mid;
        best = { paragraphs: slice.paragraphs, truncated: true, consumedChars: slice.consumedChars };
      }
    }

    return best;
  } finally {
    probe.remove();
  }
}

export type UseFittedParagraphsArgs = {
  hostRef: RefObject<HTMLElement | null>;
  paragraphs: string[];
  estimatedCapacity: number;
  multiColumn: boolean;
  dropCap: boolean;
  paragraphSpacing?: string;
  enabled?: boolean;
  signature: string;
};

export function useFittedParagraphs({
  hostRef,
  paragraphs,
  estimatedCapacity,
  multiColumn,
  dropCap,
  paragraphSpacing = "0.62em",
  enabled = true,
  signature,
}: UseFittedParagraphsArgs): FitOutcome {
  const fontsReady = useDocumentFontsReady();
  const paragraphsRef = useRef(paragraphs);
  paragraphsRef.current = paragraphs;

  const [outcome, setOutcome] = useState<FitOutcome>(() => {
    const slice = sliceParagraphsToBudget(paragraphs, estimatedCapacity);
    return { ...slice, measured: false };
  });

  useEffect(() => {
    const slice = sliceParagraphsToBudget(paragraphsRef.current, estimatedCapacity);
    setOutcome({ ...slice, measured: false });
  }, [signature, estimatedCapacity]);

  const measure = useCallback(() => {
    const host = hostRef.current;
    const currentParagraphs = paragraphsRef.current;
    if (!host || !enabled || currentParagraphs.length === 0) return;
    const maxHeight = host.clientHeight;
    if (maxHeight <= 0) return;

    const result = fitParagraphsToBox(host, currentParagraphs, maxHeight, {
      multiColumn,
      dropCap,
      paragraphSpacing,
    });

    setOutcome((prev) => {
      if (
        prev.measured &&
        prev.consumedChars === result.consumedChars &&
        prev.truncated === result.truncated
      ) {
        return prev;
      }
      return { ...result, measured: true };
    });
  }, [hostRef, enabled, multiColumn, dropCap, paragraphSpacing]);

  useLayoutEffect(() => {
    if (!enabled) return;
    measure();
  }, [measure, enabled, signature, fontsReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !enabled || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(host);
    return () => observer.disconnect();
  }, [hostRef, enabled, measure]);

  return outcome;
}

export function useDocumentFontsReady(): boolean {
  const [ready, setReady] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.fonts?.status === "loaded";
  });

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) {
      setReady(true);
      return;
    }
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

type FitRegistryValue = {
  report: (articleId: string, consumedChars: number) => void;
  get: (articleId: string) => number | undefined;
};

const FitRegistryContext = createContext<FitRegistryValue | null>(null);

export function useFitRegistry(): FitRegistryValue {
  const store = useRef(new Map<string, number>());
  const [, setVersion] = useState(0);

  return useMemo(
    () => ({
      report: (articleId: string, consumedChars: number) => {
        if (store.current.get(articleId) === consumedChars) return;
        store.current.set(articleId, consumedChars);
        setVersion((v) => v + 1);
      },
      get: (articleId: string) => store.current.get(articleId),
    }),
    []
  );
}

export const FitRegistryProvider = FitRegistryContext.Provider;

export function useReportedCut(articleId: string): number | undefined {
  const registry = useContext(FitRegistryContext);
  return registry?.get(articleId);
}

export function useReportCut(articleId: string, consumedChars: number, active: boolean) {
  const registry = useContext(FitRegistryContext);
  useEffect(() => {
    if (!active || !registry) return;
    registry.report(articleId, consumedChars);
  }, [registry, articleId, consumedChars, active]);
}
