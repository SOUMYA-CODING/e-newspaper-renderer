import type { CSSProperties } from "react";
import type {
  DocumentPage as DocumentPageData,
  EditionDocument,
  EditionStyle,
  ResolveMediaUrl,
} from "../document/types";
import { renderableBlocks } from "../document/validate";
import { blockPositionStyle, renderBlockBody } from "./blocks";

export type DocumentPageProps = {
  document: EditionDocument;
  page: DocumentPageData;
  style: EditionStyle;
  resolveMediaUrl?: ResolveMediaUrl;
  className?: string;
  outline?: boolean;
};

export function paperVariables(style: EditionStyle): CSSProperties {
  return {
    ["--paper-bg" as string]: style.tokens.background,
    ["--paper-surface" as string]: style.tokens.surface,
    ["--paper-text" as string]: style.tokens.text,
    ["--paper-rule" as string]: style.tokens.rule,
    ["--paper-accent" as string]: style.tokens.accent,
    ["--paper-sans" as string]:
      'Arial, "Helvetica Neue", Helvetica, sans-serif',
  };
}

export function DocumentPage({
  document,
  page,
  style,
  resolveMediaUrl,
  className,
  outline = false,
}: DocumentPageProps) {
  const ctx = { style, resolveMediaUrl };
  const blocks = renderableBlocks(page);

  return (
    <div
      className={className}
      data-page={page.page_number}
      style={{
        position: "relative",
        width: document.page_px.w,
        height: document.page_px.h,
        background: style.tokens.background,
        color: style.tokens.text,
        overflow: "hidden",
        ...paperVariables(style),
      }}
    >
      {blocks.map((block) => (
        <div
          key={block.id}
          data-block-id={block.id}
          data-block-type={block.type}
          style={{
            ...blockPositionStyle(block),
            ...(outline
              ? { outline: `1px dashed ${style.tokens.accent}`, outlineOffset: -1 }
              : null),
          }}
        >
          {renderBlockBody(block, ctx)}
        </div>
      ))}
    </div>
  );
}
