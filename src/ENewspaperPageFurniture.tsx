"use client";

import { useRef, type CSSProperties } from "react";
import { useFittedParagraphs } from "./paper-fit";
import {
  type FurnitureBlock,
  type PaperHighlight,
  type PaperMasthead,
  hasInlineFrontPagePanels,
} from "./paper-furniture";
import type { ResolveMediaUrl } from "./types";

export type PaperTokens = {
  background: string;
  surface: string;
  text: string;
  rule: string;
  accent: string;
};

type Families = {
  headline: string;
  body: string;
};

const LABEL_STYLE: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontWeight: 700,
};

function blockPosition(block: FurnitureBlock): CSSProperties {
  return {
    gridColumn: `${block.colStart} / span ${block.colSpan}`,
    gridRow: `${block.rowStart} / span ${block.rowSpan}`,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };
}

function PanelHeading({
  children,
  tokens,
  families,
}: {
  children: string;
  tokens: PaperTokens;
  families: Families;
}) {
  return (
    <div
      style={{
        background: tokens.accent,
        color: tokens.surface,
        padding: "5px 8px",
        fontFamily: families.body,
        textAlign: "center",
        flexShrink: 0,
        ...LABEL_STYLE,
      }}
    >
      {children}
    </div>
  );
}

export function PaperNameplate({
  masthead,
  editionDate,
  tokens,
  families,
  resolveMediaUrl,
}: {
  masthead: PaperMasthead;
  editionDate: string;
  tokens: PaperTokens;
  families: Families;
  resolveMediaUrl: ResolveMediaUrl;
}) {
  const logo = masthead.logoUrl ? resolveMediaUrl(masthead.logoUrl) : null;

  return (
    <header style={{ flexShrink: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "104px 1fr 104px",
          alignItems: "center",
          gap: 12,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logo}
              alt=""
              style={{ maxWidth: 96, maxHeight: 96, objectFit: "contain", display: "block" }}
            />
          ) : null}
        </div>

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <h1
            style={{
              fontFamily: families.headline,
              fontWeight: 800,
              fontSize: 78,
              lineHeight: 0.94,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: tokens.text,
              margin: 0,
              textWrap: "balance",
            }}
          >
            {masthead.title}
          </h1>
          {masthead.tagline ? (
            <p
              style={{
                fontFamily: families.body,
                fontSize: 13,
                letterSpacing: "0.06em",
                color: tokens.text,
                opacity: 0.75,
                margin: "6px 0 0",
              }}
            >
              {masthead.tagline}
            </p>
          ) : null}
        </div>

        <div />
      </div>

      {masthead.editionLabel ? (
        <div
          style={{
            background: tokens.text,
            color: tokens.surface,
            textAlign: "center",
            padding: "4px 0",
            fontFamily: families.body,
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {masthead.editionLabel}
        </div>
      ) : null}

      <PaperEditionBar
        masthead={masthead}
        editionDate={editionDate}
        tokens={tokens}
        families={families}
      />
    </header>
  );
}

export function PaperEditionBar({
  masthead,
  editionDate,
  tokens,
  families,
}: {
  masthead: PaperMasthead;
  editionDate: string;
  tokens: PaperTokens;
  families: Families;
}) {
  const entries = [
    masthead.volume ? `Vol. ${masthead.volume}` : null,
    masthead.issue ? `Issue ${masthead.issue}` : null,
    editionDate,
    masthead.pages ? `Pages: ${masthead.pages}` : null,
    masthead.price ? `Price: ${masthead.price}` : null,
  ].filter((entry): entry is string => Boolean(entry));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-evenly",
        gap: 12,
        borderTop: `1px solid ${tokens.text}`,
        borderBottom: `3px double ${tokens.text}`,
        padding: "5px 0",
        fontFamily: families.body,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: tokens.text,
      }}
    >
      {entries.map((entry) => (
        <span key={entry}>{entry}</span>
      ))}
    </div>
  );
}

export function PaperRunningHead({
  masthead,
  editionDate,
  pageNumber,
  sectionName,
  sectionStyle,
  tokens,
  families,
}: {
  masthead: PaperMasthead;
  editionDate: string;
  pageNumber: number;
  sectionName: string;
  sectionStyle: {
    sectionItalic: boolean;
    sectionTransform: "uppercase" | "lowercase";
    sectionFamily: string;
    rule: string;
  };
  tokens: PaperTokens;
  families: Families;
}) {
  return (
    <header style={{ flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 4,
          borderBottom: `1px solid ${tokens.rule}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span
            style={{
              fontFamily: families.headline,
              fontWeight: 800,
              fontSize: 22,
              color: tokens.accent,
            }}
          >
            P{pageNumber}
          </span>
          <span
            style={{
              fontFamily: families.headline,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {masthead.title}
          </span>
        </div>
        <span
          style={{
            fontFamily: families.body,
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          {editionDate}
        </span>
      </div>
      <h2
        style={{
          fontFamily: sectionStyle.sectionFamily,
          fontStyle: sectionStyle.sectionItalic ? "italic" : "normal",
          textTransform: sectionStyle.sectionTransform,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1,
          letterSpacing: sectionStyle.sectionTransform === "uppercase" ? "0.02em" : undefined,
          color: tokens.text,
          margin: "4px 0 8px",
        }}
      >
        {sectionName}
      </h2>
      <div style={{ borderTop: sectionStyle.rule, marginBottom: 12 }} />
    </header>
  );
}

export function PaperHighlightsStrip({
  title,
  highlights,
  tokens,
  families,
  resolveMediaUrl,
}: {
  title: string;
  highlights: PaperHighlight[];
  tokens: PaperTokens;
  families: Families;
  resolveMediaUrl: ResolveMediaUrl;
}) {
  if (highlights.length === 0) return null;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: `128px repeat(${highlights.length}, minmax(0, 1fr))`,
        gap: 10,
        alignItems: "stretch",
        borderBottom: `3px double ${tokens.text}`,
        paddingBottom: 10,
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: tokens.text,
          color: tokens.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 8,
          fontFamily: families.body,
          ...LABEL_STYLE,
        }}
      >
        {title}
      </div>

      {highlights.map((highlight) => {
        const image = highlight.image ? resolveMediaUrl(highlight.image) : null;
        return (
          <div
            key={`${highlight.page}-${highlight.title}`}
            style={{ display: "flex", gap: 8, minWidth: 0 }}
          >
            {image ? (
              <div
                style={{
                  width: 62,
                  height: 46,
                  flexShrink: 0,
                  overflow: "hidden",
                  background: tokens.surface,
                  lineHeight: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt=""
                  width={62}
                  height={46}
                  decoding="async"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center center",
                    display: "block",
                  }}
                />
              </div>
            ) : null}
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: families.body,
                  fontSize: 10,
                  lineHeight: 1.25,
                  color: tokens.text,
                  overflow: "hidden",
                }}
              >
                {highlight.title}
              </span>
              <span
                style={{
                  fontFamily: families.body,
                  fontSize: 8,
                  color: tokens.text,
                  opacity: 0.6,
                  marginTop: "auto",
                }}
              >
                Page {String(highlight.page).padStart(2, "0")}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function TopStoriesPanel({
  block,
  title,
  stories,
  tokens,
  families,
}: {
  block: FurnitureBlock;
  title: string;
  stories: Array<{ title: string; page: number }>;
  tokens: PaperTokens;
  families: Families;
}) {
  return (
    <aside style={{ ...blockPosition(block), border: `1px solid ${tokens.rule}` }}>
      <PanelHeading tokens={tokens} families={families}>
        {title}
      </PanelHeading>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {stories.map((story, index) => (
          <li
            key={`${story.page}-${story.title}`}
            style={{
              display: "flex",
              gap: 6,
              borderBottom: index === stories.length - 1 ? undefined : `1px solid ${tokens.rule}`,
              paddingBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: families.headline,
                fontWeight: 800,
                fontSize: 13,
                color: tokens.accent,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontFamily: families.body,
                  fontSize: 10,
                  lineHeight: 1.3,
                  color: tokens.text,
                }}
              >
                {story.title}
              </span>
              <span
                style={{
                  fontFamily: families.body,
                  fontSize: 8,
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Page {String(story.page).padStart(2, "0")}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function EditorialPanel({
  block,
  title,
  body,
  tokens,
  families,
}: {
  block: FurnitureBlock;
  title: string;
  body: string;
  tokens: PaperTokens;
  families: Families;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fit = useFittedParagraphs({
    hostRef,
    paragraphs: [body],
    estimatedCapacity: body.length,
    multiColumn: false,
    dropCap: false,
    signature: `${block.kind}:${body.length}:${block.rowSpan}`,
  });

  return (
    <aside
      style={{
        ...blockPosition(block),
        border: `1px solid ${tokens.rule}`,
        background: tokens.surface,
      }}
    >
      <PanelHeading tokens={tokens} families={families}>
        {title}
      </PanelHeading>
      <div
        ref={hostRef}
        style={{
          padding: 8,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          fontFamily: families.body,
          fontSize: 10.5,
          lineHeight: 1.5,
          color: tokens.text,
          textAlign: "justify",
          hyphens: "auto",
        }}
      >
        {fit.paragraphs.map((paragraph, index) => (
          <p key={`${block.kind}-${index}`} style={{ margin: 0 }}>
            {paragraph}
          </p>
        ))}
      </div>
    </aside>
  );
}

export function QuotePanel({
  block,
  title,
  text,
  attribution,
  tokens,
  families,
}: {
  block: FurnitureBlock;
  title: string;
  text: string;
  attribution: string | null;
  tokens: PaperTokens;
  families: Families;
}) {
  return (
    <aside
      style={{
        ...blockPosition(block),
        border: `1px solid ${tokens.rule}`,
        background: tokens.surface,
      }}
    >
      <PanelHeading tokens={tokens} families={families}>
        {title}
      </PanelHeading>
      <blockquote
        style={{
          margin: 0,
          padding: 10,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: families.headline,
            fontSize: 26,
            lineHeight: 0.6,
            color: tokens.accent,
          }}
        >
          &ldquo;
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: families.headline,
            fontStyle: "italic",
            fontSize: 13,
            lineHeight: 1.4,
            color: tokens.text,
          }}
        >
          {text}
        </p>
        {attribution ? (
          <cite
            style={{
              fontFamily: families.body,
              fontSize: 9,
              fontStyle: "normal",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {attribution}
          </cite>
        ) : null}
      </blockquote>
    </aside>
  );
}

export function PaperFrontPagePanels({
  masthead,
  tokens,
  families,
}: {
  masthead: PaperMasthead;
  tokens: PaperTokens;
  families: Families;
}) {
  if (!hasInlineFrontPagePanels(masthead)) return null;

  const panelCount =
    (masthead.quote ? 1 : 0) +
    (masthead.editorial ? 1 : 0) +
    (masthead.standsFor.length > 0 ? 1 : 0);

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.max(1, panelCount)}, minmax(0, 1fr))`,
        gap: 10,
        marginTop: 10,
        marginBottom: 4,
        flexShrink: 0,
      }}
    >
      {masthead.quote ? (
        <aside
          style={{
            border: `1px solid ${tokens.rule}`,
            background: tokens.surface,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            maxHeight: 118,
            overflow: "hidden",
          }}
        >
          <PanelHeading tokens={tokens} families={families}>
            {masthead.quote.title}
          </PanelHeading>
          <blockquote
            style={{
              margin: 0,
              padding: "8px 10px",
              overflow: "hidden",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: families.headline,
                fontStyle: "italic",
                fontSize: 11,
                lineHeight: 1.35,
                color: tokens.text,
              }}
            >
              &ldquo;{masthead.quote.text}&rdquo;
            </p>
            {masthead.quote.attribution ? (
              <cite
                style={{
                  display: "block",
                  marginTop: 4,
                  fontFamily: families.body,
                  fontSize: 8,
                  fontStyle: "normal",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                {masthead.quote.attribution}
              </cite>
            ) : null}
          </blockquote>
        </aside>
      ) : null}

      {masthead.editorial ? (
        <aside
          style={{
            border: `1px solid ${tokens.rule}`,
            background: tokens.surface,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            maxHeight: 118,
            overflow: "hidden",
          }}
        >
          <PanelHeading tokens={tokens} families={families}>
            {masthead.editorial.title}
          </PanelHeading>
          <div
            style={{
              padding: "8px 10px",
              overflow: "hidden",
              fontFamily: families.body,
              fontSize: 9.5,
              lineHeight: 1.45,
              color: tokens.text,
              textAlign: "justify",
            }}
          >
            {masthead.editorial.body}
          </div>
        </aside>
      ) : null}

      {masthead.standsFor.length > 0 ? (
        <aside
          style={{
            border: `1px solid ${tokens.rule}`,
            background: tokens.surface,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            maxHeight: 118,
            overflow: "hidden",
          }}
        >
          <PanelHeading tokens={tokens} families={families}>
            {masthead.standsForTitle}
          </PanelHeading>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              overflow: "hidden",
            }}
          >
            {masthead.standsFor.map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  gap: 5,
                  fontFamily: families.body,
                  fontSize: 9,
                  lineHeight: 1.25,
                  color: tokens.text,
                }}
              >
                <span style={{ color: tokens.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ minWidth: 0 }}>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}

export function StandsForPanel({
  block,
  title,
  items,
  tokens,
  families,
}: {
  block: FurnitureBlock;
  title: string;
  items: string[];
  tokens: PaperTokens;
  families: Families;
}) {
  return (
    <aside
      style={{
        ...blockPosition(block),
        border: `1px solid ${tokens.rule}`,
        background: tokens.surface,
      }}
    >
      <PanelHeading tokens={tokens} families={families}>
        {title}
      </PanelHeading>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {items.map((item) => (
          <li
            key={item}
            style={{
              display: "flex",
              gap: 6,
              fontFamily: families.body,
              fontSize: 10,
              lineHeight: 1.3,
              color: tokens.text,
            }}
          >
            <span style={{ color: tokens.accent, fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span style={{ minWidth: 0 }}>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PaperFooter({
  masthead,
  pageNumber,
  tokens,
  families,
}: {
  masthead: PaperMasthead;
  pageNumber: number;
  tokens: PaperTokens;
  families: Families;
}) {
  const { contact } = masthead;
  const entries = [contact.phone, contact.email, contact.address, contact.website].filter(
    (entry): entry is string => Boolean(entry)
  );

  return (
    <footer style={{ flexShrink: 0, marginTop: 10 }}>
      {contact.note && masthead.showContactNote ? (
        <p
          style={{
            margin: "0 0 6px",
            textAlign: "center",
            fontFamily: families.body,
            fontSize: 9.5,
            fontStyle: "italic",
            color: tokens.text,
            opacity: 0.75,
          }}
        >
          {contact.note}
        </p>
      ) : null}

      {entries.length > 0 ? (
        <div
          style={{
            background: tokens.text,
            color: tokens.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 10,
            padding: "5px 8px",
            fontFamily: families.body,
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {entries.map((entry) => (
            <span key={entry}>{entry}</span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          borderTop: entries.length > 0 ? undefined : `1px solid ${tokens.text}`,
          textAlign: "center",
          textTransform: "uppercase",
          color: tokens.text,
          opacity: 0.6,
          fontSize: 9,
          letterSpacing: "0.2em",
          fontFamily: families.body,
          paddingTop: 6,
        }}
      >
        {masthead.title} · Page {pageNumber}
        {masthead.pages ? ` of ${masthead.pages}` : ""}
      </div>
    </footer>
  );
}
