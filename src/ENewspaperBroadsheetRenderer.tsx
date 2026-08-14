"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import { PAPER_DIMENSIONS, type TemplateFormat } from "./paper-dimensions";
import {
  buildPageGeometry,
  computePageBlocks,
  furnitureGeometry,

  maxLayoutRow,
  storyBoxMetrics,
  type ComputedArticleLayout,
  type FillerBlock,
  type PageGeometry,
} from "./paper-layout";
import {
  buildStoryBody,
  remainderAfterChars,
  resolveEffectiveDensity,
  splitDropcap,
} from "./paper-content";
import {
  BODY_LINE_HEIGHT,
  dekFontSize,
  headlineLineHeight,
} from "./paper-typography";
import { fontStack, usePaperFonts } from "./paper-fonts";
import {
  FitRegistryProvider,
  useFitRegistry,
  useFittedParagraphs,
  useReportCut,
  useReportedCut,
} from "./paper-fit";
import { getGridGap, getPaperMargins } from "./paper-preview";
import {
  buildHighlights,
  buildTopStories,
  parseMasthead,
  planFrontPageFurniture,
  type FurnitureBlock,
} from "./paper-furniture";
import {
  PaperFooter,
  PaperFrontPagePanels,
  PaperHighlightsStrip,
  PaperNameplate,
  PaperRunningHead,
  TopStoriesPanel,
  type PaperTokens,
} from "./ENewspaperPageFurniture";
import type {
  PaperFont,
  PaperPreviewArticle,
  PaperPreviewInput,
  ResolveMediaUrl,
  StoryDensity,
} from "./types";

export type ENewspaperBroadsheetRendererProps = {
  input: PaperPreviewInput;
  format: TemplateFormat;
  tokens: Record<string, unknown>;
  headlineFont: PaperFont;
  bodyFont: PaperFont;
  articles: PaperPreviewArticle[];
  pageNumber: number;
  zoneSchema?: Record<string, unknown>;
  layouts?: ComputedArticleLayout[];
  fillers?: FillerBlock[];
  furniture?: FurnitureBlock[];
  rows?: number;
  allArticles?: PaperPreviewArticle[];
  isFrontPage?: boolean;
  className?: string;
  resolveMediaUrl?: ResolveMediaUrl;
};

const defaultResolveMediaUrl: ResolveMediaUrl = (url) => {
  if (!url?.trim()) return null;
  return url;
};

function formatEditionDate(date: string) {
  try {
    return new Date(date)
      .toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .toUpperCase();
  } catch {
    return date;
  }
}

function StoryImage({
  src,
  tokens,
  height,
  width,
  credit,
  resolveMediaUrl,
}: {
  src: string;
  tokens: PaperTokens;
  height: number;
  width: number;
  credit: string;
  resolveMediaUrl: ResolveMediaUrl;
}) {
  const resolvedSrc = resolveMediaUrl(src);
  if (!resolvedSrc) return null;

  return (
    <figure
      style={{
        margin: "0 0 8px",
        flexShrink: 0,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          maxHeight: height,
          overflow: "hidden",
          background: tokens.surface,
          lineHeight: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedSrc}
          alt=""
          width={Math.max(1, Math.round(width))}
          height={Math.max(1, Math.round(height))}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "cover",
            objectPosition: "center center",
            display: "block",
          }}
        />
      </div>
      <figcaption
        style={{
          fontStyle: "italic",
          fontSize: 9,
          color: tokens.text,
          opacity: 0.65,
          marginTop: 3,
        }}
      >
        {credit}
      </figcaption>
    </figure>
  );
}

function FittedBody({
  articleId,
  paragraphs,
  estimatedCapacity,
  bodyFamily,
  tokens,
  fontSize,
  columns,
  dropCap,
  reportCut,
  fitSignature,
}: {
  articleId: string;
  paragraphs: string[];
  estimatedCapacity: number;
  bodyFamily: string;
  tokens: PaperTokens;
  fontSize: number;
  columns: number;
  dropCap: boolean;
  reportCut: boolean;
  fitSignature: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const multiColumn = columns > 1;

  const fit = useFittedParagraphs({
    hostRef,
    paragraphs,
    estimatedCapacity,
    multiColumn,
    dropCap,
    enabled: paragraphs.length > 0,
    signature: `${articleId}:${fontSize}:${columns}:${fitSignature}`,
  });

  useReportCut(articleId, fit.consumedChars, reportCut);

  const style: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    fontFamily: bodyFamily,
    fontSize,
    lineHeight: BODY_LINE_HEIGHT,
    color: tokens.text,
    textAlign: "justify",
    textJustify: "inter-word",
    hyphens: "auto",
    hyphenateLimitChars: "8 4 4",
    ...({
      hyphenateLimitLines: 2,
      WebkitHyphenateLimitLines: 2,
    } as CSSProperties),
    orphans: 2,
    widows: 2,
    columnCount: multiColumn ? columns : undefined,
    columnGap: multiColumn ? 16 : undefined,
    columnFill: multiColumn ? "auto" : undefined,
    columnRule: multiColumn ? `1px solid ${tokens.rule}` : undefined,
  };

  return (
    <div ref={hostRef} style={style}>
      {fit.paragraphs.map((paragraph, index) => {
        const { dropcap, rest } =
          dropCap && index === 0 ? splitDropcap(paragraph) : { dropcap: null, rest: paragraph };
        return (
          <p
            key={`${articleId}-p-${index}`}
            style={{ margin: "0 0 0.62em", breakInside: "avoid-column" }}
          >
            {dropcap ? (
              <span
                style={{
                  float: "left",
                  fontWeight: 700,
                  fontSize: "3.2em",
                  lineHeight: 0.72,
                  paddingRight: 6,
                  paddingTop: 2,
                  color: tokens.accent,
                }}
              >
                {dropcap}
              </span>
            ) : null}
            {rest}
          </p>
        );
      })}
    </div>
  );
}

function JumpLine({
  page,
  tokens,
  bodyFamily,
}: {
  page: number;
  tokens: PaperTokens;
  bodyFamily: string;
}) {
  return (
    <p
      style={{
        margin: "4px 0 0",
        flexShrink: 0,
        fontFamily: bodyFamily,
        fontStyle: "italic",
        fontWeight: 700,
        fontSize: 10,
        color: tokens.accent,
        textAlign: "right",
      }}
    >
      Continued on Page {page} →
    </p>
  );
}

function StoryCell({
  layout,
  geometry,
  tokens,
  headlineFamily,
  bodyFamily,
  presetStyle,
  editionDensity,
  showImages,
  agency,
  gap,
  resolveMediaUrl,
}: {
  layout: ComputedArticleLayout;
  geometry: PageGeometry;
  tokens: PaperTokens;
  headlineFamily: string;
  bodyFamily: string;
  presetStyle: { headlineTransform: "uppercase" | "none"; headlineWeight: number; headlineFamily: string };
  editionDensity: StoryDensity | undefined;
  showImages: boolean;
  agency: string;
  gap: number;
  resolveMediaUrl: ResolveMediaUrl;
}) {
  const { article, role } = layout;
  const density = resolveEffectiveDensity(article, role, editionDensity);
  const isContinuation = Boolean(layout.isContinuation);

  const hasImage =
    !isContinuation &&
    density !== "textonly" &&
    density !== "headline" &&
    Boolean(article.image) &&
    (article.show_image ?? showImages);

  const metrics = storyBoxMetrics(
    layout,
    geometry,
    density,
    hasImage,
    presetStyle.headlineTransform === "uppercase"
  );
  const body = buildStoryBody(article, role, density);

  const reportedCut = useReportedCut(article.article_id);
  const paragraphs = isContinuation
    ? remainderAfterChars(body, reportedCut ?? layout.continuationOffset ?? 0)
    : body.paragraphs;

  const isLead = role === "lead";
  const showDek = Boolean(body.dek) && !isContinuation && metrics.showDek;
  const headlineSize = isContinuation
    ? Math.round(metrics.headlineSize * 0.62)
    : metrics.headlineSize;

  return (
    <article
      style={{
        gridColumn: `${layout.colStart} / span ${layout.colSpan}`,
        gridRow: `${layout.rowStart} / span ${layout.rowSpan}`,
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        paddingBottom: 10,
        borderBottom: isLead || role === "feature"
          ? `2px solid ${tokens.text}`
          : `1px solid ${tokens.rule}`,
        borderLeft: layout.colStart > 1 ? `1px solid ${tokens.rule}` : undefined,
        marginLeft: layout.colStart > 1 ? -gap / 2 : undefined,
        paddingLeft: layout.colStart > 1 ? gap / 2 : undefined,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      data-story-role={role}
    >
      {isContinuation ? (
        <span
          style={{
            display: "block",
            fontFamily: bodyFamily,
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: tokens.accent,
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          Continued from Page {layout.continuedFromPage ?? 1}
        </span>
      ) : null}

      <h2
        style={{
          fontFamily: presetStyle.headlineFamily,
          fontWeight: presetStyle.headlineWeight,
          fontSize: headlineSize,
          lineHeight: headlineLineHeight(headlineSize),
          letterSpacing:
            headlineSize > 56 ? "-0.028em" : headlineSize > 32 ? "-0.018em" : "-0.005em",
          textTransform: presetStyle.headlineTransform,
          color: tokens.text,
          margin: "0 0 6px",
          flexShrink: 0,
          textWrap: "balance",
          overflowWrap: "break-word",
        }}
      >
        {article.title}
      </h2>

      {showDek ? (
        <p
          style={{
            flexShrink: 0,
            fontFamily: bodyFamily,
            fontStyle: "italic",
            fontSize: dekFontSize(headlineSize),
            lineHeight: 1.34,
            color: tokens.text,
            opacity: 0.82,
            margin: "0 0 8px",
          }}
        >
          {body.dek}
        </p>
      ) : null}

      {isLead && !isContinuation ? (
        <p
          style={{
            flexShrink: 0,
            fontFamily: bodyFamily,
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: tokens.text,
            opacity: 0.7,
            margin: "0 0 6px",
          }}
        >
          {agency}
        </p>
      ) : null}

      {hasImage && article.image && metrics.imageHeight > 24 ? (
        <StoryImage
          src={article.image}
          tokens={tokens}
          width={metrics.boxWidth}
          height={metrics.imageHeight}
          credit={agency}
          resolveMediaUrl={resolveMediaUrl}
        />
      ) : null}

      {paragraphs.length > 0 ? (
        <FittedBody
          articleId={article.article_id}
          paragraphs={paragraphs}
          estimatedCapacity={metrics.estimatedCapacity}
          bodyFamily={bodyFamily}
          tokens={tokens}
          fontSize={metrics.bodySize}
          columns={metrics.bodyColumns}
          dropCap={isLead && !isContinuation}
          reportCut={!isContinuation}
          fitSignature={`${reportedCut ?? layout.continuationOffset ?? 0}:${paragraphs.length}:${paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0)}`}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0 }} />
      )}

      {layout.jumpToPage ? (
        <JumpLine page={layout.jumpToPage} tokens={tokens} bodyFamily={bodyFamily} />
      ) : null}
    </article>
  );
}

function FillerCell({
  filler,
  tokens,
  bodyFamily,
  label,
}: {
  filler: FillerBlock;
  tokens: PaperTokens;
  bodyFamily: string;
  label: string;
}) {
  return (
    <div
      style={{
        gridColumn: `${filler.colStart} / span ${filler.colSpan}`,
        gridRow: `${filler.rowStart} / span ${filler.rowSpan}`,
        minWidth: 0,
        minHeight: 0,
        border: `1px solid ${tokens.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: bodyFamily,
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: tokens.text,
        opacity: 0.4,
      }}
      data-filler="true"
    >
      {label}
    </div>
  );
}

export function ENewspaperBroadsheetRenderer({
  input,
  format,
  tokens: rawTokens,
  headlineFont,
  bodyFont,
  articles,
  pageNumber,
  zoneSchema,
  layouts: layoutsProp,
  fillers: fillersProp,
  furniture: furnitureProp,
  rows: rowsProp,
  allArticles,
  isFrontPage = false,
  className,
  resolveMediaUrl = defaultResolveMediaUrl,
}: ENewspaperBroadsheetRendererProps) {
  usePaperFonts(headlineFont, bodyFont);
  const fitRegistry = useFitRegistry();

  const dims = PAPER_DIMENSIONS[format];
  const margins = getPaperMargins(input.layout_config);
  const gap = getGridGap(input.layout_config);
  const showImages = input.layout_config.show_images !== false;
  const editionDensity = input.layout_config.density as StoryDensity | undefined;
  const columns = Math.max(1, Math.min(6, input.body_columns || 3));
  const showFillers = input.layout_config.show_fillers === true;
  const fillerLabel = String(input.layout_config.filler_label ?? "Advertisement");

  const tokens = useMemo<PaperTokens>(
    () => ({
      background: String(rawTokens.background ?? "#f4f1ea"),
      surface: String(rawTokens.surface ?? "#ffffff"),
      text: String(rawTokens.text ?? "#1a1a1a"),
      rule: String(rawTokens.rule ?? "#cccccc"),
      accent: String(rawTokens.accent ?? "#b91c1c"),
    }),
    [rawTokens]
  );

  const headlineFamily = fontStack(headlineFont);
  const bodyFamily = fontStack(bodyFont);
  const families = useMemo(
    () => ({ headline: headlineFamily, body: bodyFamily }),
    [headlineFamily, bodyFamily]
  );

  const masthead = useMemo(
    () => parseMasthead(input.masthead_config, input.title),
    [input.masthead_config, input.title]
  );

  const preset = ((input.layout_config.preset as string) || "orissa") as
    | "orissa"
    | "classic"
    | "modern";
  const SANS = '"Helvetica Neue", Arial, sans-serif';
  const presetStyle = {
    orissa: {
      sectionItalic: true,
      sectionTransform: "lowercase" as const,
      sectionFamily: headlineFamily,
      rule: `3px double ${tokens.text}`,
      headlineFamily,
      headlineTransform: "uppercase" as const,
      headlineWeight: 800,
    },
    classic: {
      sectionItalic: false,
      sectionTransform: "uppercase" as const,
      sectionFamily: headlineFamily,
      rule: `3px double ${tokens.text}`,
      headlineFamily,
      headlineTransform: "none" as const,
      headlineWeight: 700,
    },
    modern: {
      sectionItalic: false,
      sectionTransform: "lowercase" as const,
      sectionFamily: SANS,
      rule: `1px solid ${tokens.text}`,
      headlineFamily: SANS,
      headlineTransform: "none" as const,
      headlineWeight: 700,
    },
  }[preset];

  const pageArticles = useMemo(
    () => articles.filter((a) => a.zone_id !== "masthead"),
    [articles]
  );

  const editionArticles = allArticles ?? input.articles;
  const highlights = useMemo(
    () =>
      isFrontPage && masthead.showHighlights
        ? buildHighlights(editionArticles, pageNumber)
        : [],
    [isFrontPage, masthead.showHighlights, editionArticles, pageNumber]
  );
  const topStories = useMemo(
    () => (isFrontPage ? buildTopStories(editionArticles, pageNumber) : []),
    [isFrontPage, editionArticles, pageNumber]
  );

  const geometryBase = useMemo(
    () => buildPageGeometry(format, columns, input.layout_config, rowsProp),
    [format, columns, input.layout_config, rowsProp]
  );

  const furniture = useMemo<FurnitureBlock[]>(
    () =>
      isFrontPage
        ? planFrontPageFurniture(
            masthead,
            furnitureGeometry(geometryBase),
            topStories.length
          )
        : [],
    [isFrontPage, masthead, geometryBase, topStories.length]
  );

  const blocks = useMemo(() => {
    if (layoutsProp) {
      return {
        layouts: layoutsProp,
        fillers: fillersProp ?? [],
        furniture: furnitureProp ?? [],
      };
    }
    const computed = computePageBlocks(pageArticles, columns, zoneSchema, {
      targetRows: geometryBase.rows,
      justify: input.layout_config.justify_vertical !== false,
      reserved: furniture,
    });
    return { layouts: computed.layouts, fillers: computed.fillers, furniture: computed.furniture };
  }, [
    layoutsProp,
    fillersProp,
    furnitureProp,
    pageArticles,
    columns,
    zoneSchema,
    geometryBase.rows,
    input.layout_config,
    furniture,
  ]);

  const rows = Math.max(geometryBase.rows, maxLayoutRow(blocks.layouts));
  const geometry: PageGeometry = useMemo(
    () => ({ ...geometryBase, rows }),
    [geometryBase, rows]
  );

  const lead = pageArticles.find((a) => a.is_lead) ?? pageArticles[0];
  const sectionName = masthead.section ?? "News";
  const editionDate = formatEditionDate(input.edition_date);

  const furnitureFor = (kind: FurnitureBlock["kind"]) =>
    blocks.furniture.find((block) => block.kind === kind);

  const topStoriesBlock = furnitureFor("top-stories");

  return (
    <FitRegistryProvider value={fitRegistry}>
      <div
        className={className}
        style={{
          width: dims.width,
          height: dims.height,
          background: tokens.background,
          boxSizing: "border-box",
          padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
          fontFamily: bodyFamily,
          color: tokens.text,
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
        }}
        data-paper-format={format}
        data-paper-page={pageNumber}
        lang={String(input.layout_config.lang ?? "en")}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {isFrontPage ? (
            <PaperNameplate
              masthead={masthead}
              editionDate={editionDate}
              tokens={tokens}
              families={families}
              resolveMediaUrl={resolveMediaUrl}
            />
          ) : (
            <PaperRunningHead
              masthead={masthead}
              editionDate={editionDate}
              pageNumber={pageNumber}
              sectionName={sectionName}
              sectionStyle={presetStyle}
              tokens={tokens}
              families={families}
            />
          )}

          {isFrontPage && highlights.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <PaperHighlightsStrip
                title={masthead.highlightsTitle}
                highlights={highlights}
                tokens={tokens}
                families={families}
                resolveMediaUrl={resolveMediaUrl}
              />
            </div>
          ) : null}

          {isFrontPage ? (
            <PaperFrontPagePanels masthead={masthead} tokens={tokens} families={families} />
          ) : null}

          {blocks.layouts.length === 0 && furniture.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px dashed ${tokens.rule}`,
                fontSize: 14,
                opacity: 0.6,
              }}
            >
              No articles on page {pageNumber}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gap: `${gap}px`,
              }}
            >
              {topStoriesBlock ? (
                <TopStoriesPanel
                  block={topStoriesBlock}
                  title={masthead.topStoriesTitle}
                  stories={topStories}
                  tokens={tokens}
                  families={families}
                />
              ) : null}

              {blocks.layouts.map((layout) => (
                <StoryCell
                  key={`${layout.article.article_id}-${layout.colStart}-${layout.rowStart}-${layout.isContinuation ? "c" : "s"}`}
                  layout={layout}
                  geometry={geometry}
                  tokens={tokens}
                  headlineFamily={headlineFamily}
                  bodyFamily={bodyFamily}
                  presetStyle={presetStyle}
                  editionDensity={editionDensity}
                  showImages={showImages}
                  agency={masthead.agency}
                  gap={gap}
                  resolveMediaUrl={resolveMediaUrl}
                />
              ))}
              {(showFillers ? blocks.fillers : []).map((filler) => (
                <FillerCell
                  key={`filler-${filler.colStart}-${filler.rowStart}`}
                  filler={filler}
                  tokens={tokens}
                  bodyFamily={bodyFamily}
                  label={fillerLabel}
                />
              ))}
            </div>
          )}

          <PaperFooter
            masthead={masthead}
            pageNumber={pageNumber}
            tokens={tokens}
            families={families}
          />
        </div>
      </div>
    </FitRegistryProvider>
  );
}
