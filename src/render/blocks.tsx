import type { CSSProperties, ReactNode } from "react";
import type {
  DocumentBlock,
  EditionStyle,
  ResolveMediaUrl,
} from "../document/types";
import { sanitizeArticleHtml } from "../sanitize-html";
import { fontStack } from "../paper-fonts";

export type BlockContext = {
  style: EditionStyle;
  resolveMediaUrl?: ResolveMediaUrl;
};

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function html(value: unknown): { __html: string } {
  return { __html: sanitizeArticleHtml(str(value)) };
}

function media(ctx: BlockContext, url: unknown): string | null {
  const raw = str(url) || null;
  if (!raw) return null;
  return ctx.resolveMediaUrl ? ctx.resolveMediaUrl(raw) : raw;
}

function mastheadDefaults(ctx: BlockContext) {
  const masthead = (ctx.style.masthead ?? {}) as Record<string, unknown>;
  const contact = (masthead.contact ?? {}) as Record<string, unknown>;
  return {
    title: str(masthead.title),
    edition_label: str(masthead.edition_label),
    price: str(masthead.price),
    website: str(contact.website),
    email: str(contact.email),
    phone: str(contact.phone),
  };
}

type ImageFit = "cover" | "contain" | "fill";

const IMAGE_FOCUS: Record<string, string> = {
  top: "50% 0%",
  bottom: "50% 100%",
  left: "0% 50%",
  right: "100% 50%",
  center: "50% 50%",
};

function imageFitStyle(fit: unknown, focus: unknown): CSSProperties {
  const value: ImageFit =
    fit === "contain" || fit === "fill" ? (fit as ImageFit) : "cover";
  return {
    objectFit: value,
    objectPosition: IMAGE_FOCUS[str(focus, "center")] ?? IMAGE_FOCUS.center,
  };
}

function Kicker({ text, color }: { text: string; color: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontFamily: "var(--paper-sans)",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color,
        marginBottom: 6,
      }}
    >
      {text}
    </div>
  );
}

function Figure({
  src,
  caption,
  height,
  tokens,
  fill,
  fit,
  focus,
}: {
  src: string | null;
  caption: string;
  height: number;
  tokens: EditionStyle["tokens"];
  fill?: boolean;
  fit?: unknown;
  focus?: unknown;
}) {
  if (!src) return null;
  return (
    <figure
      style={
        fill
          ? { margin: 0, height: "100%", display: "flex", flexDirection: "column" }
          : { margin: "0 0 8px" }
      }
    >
      <img
        src={src}
        alt=""
        style={{
          display: "block",
          width: "100%",
          height: fill ? "100%" : height,
          flex: fill ? 1 : undefined,
          minHeight: 0,
          background: tokens.surface,
          ...imageFitStyle(fit, focus),
        }}
      />
      {caption ? (
        <figcaption
          style={{
            fontFamily: "var(--paper-sans)",
            fontSize: 10,
            lineHeight: 1.35,
            color: tokens.text,
            opacity: 0.7,
            paddingTop: 4,
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function PanelShell({
  title,
  tokens,
  children,
  accentHeader,
}: {
  title: string;
  tokens: EditionStyle["tokens"];
  children: ReactNode;
  accentHeader?: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${tokens.rule}`,
        background: tokens.surface,
      }}
    >
      {title ? (
        <div
          style={{
            fontFamily: "var(--paper-sans)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            padding: "6px 10px",
            textAlign: "center",
            background: accentHeader ? tokens.accent : "transparent",
            color: accentHeader ? "#ffffff" : tokens.text,
            borderBottom: accentHeader ? "none" : `2px solid ${tokens.text}`,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, padding: "9px 10px" }}>{children}</div>
    </div>
  );
}

type StoryLayout =
  | "stacked"
  | "image-top"
  | "image-left"
  | "image-right"
  | "image-bottom"
  | "image-inset";

const STORY_LAYOUTS: StoryLayout[] = [
  "stacked",
  "image-top",
  "image-left",
  "image-right",
  "image-bottom",
  "image-inset",
];

function storyLayout(value: unknown): StoryLayout {
  return STORY_LAYOUTS.includes(value as StoryLayout)
    ? (value as StoryLayout)
    : "stacked";
}

function StoryBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, headline_font, body_font } = ctx.style;
  const headlineSize = num(p.headline_size, 30);
  const bodySize = num(p.body_size, 12);
  const bodyColumns = Math.max(1, num(p.body_columns, 1));
  const showImage = p.show_image !== false;
  const showDek = p.show_dek !== false;
  const showBody = p.show_body !== false;
  const showByline = p.show_byline !== false;
  const image = showImage ? media(ctx, p.image) : null;
  const layout = image ? storyLayout(p.layout) : "stacked";
  const side = layout === "image-left" || layout === "image-right";
  const imageRatio = Math.min(0.75, Math.max(0.2, num(p.image_ratio, 0.42)));
  const align = str(p.headline_align) === "center" ? "center" : "left";

  const headline = (
    <h2
      style={{
        margin: "0 0 8px",
        fontFamily: fontStack(headline_font),
        fontWeight: 800,
        fontSize: headlineSize,
        lineHeight: 1.05,
        letterSpacing: "-.012em",
        color: tokens.text,
        textWrap:
          str(p.headline_wrap) === "balance" ? "balance" : "pretty",
        hyphens: "auto",
        textAlign: align,
      }}
    >
      {str(p.headline)}
    </h2>
  );

  const dek =
    showDek && p.dek ? (
      <p
        style={{
          margin: "0 0 10px",
          paddingBottom: 8,
          borderBottom: `1px solid ${tokens.rule}`,
          fontFamily: fontStack(headline_font),
          fontSize: Math.round(headlineSize * 0.4),
          lineHeight: 1.3,
          color: tokens.text,
          opacity: 0.8,
          textAlign: align,
        }}
      >
        {str(p.dek)}
      </p>
    ) : null;

  const byline =
    showByline && p.byline ? (
      <div
        style={{
          fontFamily: "var(--paper-sans)",
          fontSize: 10.5,
          letterSpacing: ".06em",
          color: tokens.text,
          opacity: 0.65,
          paddingBottom: 6,
          marginBottom: 8,
          borderBottom: `1px solid ${tokens.rule}`,
          textAlign: align,
        }}
      >
        {str(p.byline)}
      </div>
    ) : null;

  const head = (
    <>
      <Kicker text={str(p.kicker)} color={tokens.accent} />
      {headline}
      {dek}
      {byline}
    </>
  );

  const figure = image ? (
    <Figure
      src={image}
      caption={str(p.caption)}
      height={side ? 0 : num(p.image_h, 180)}
      tokens={tokens}
      fill={side}
      fit={p.image_fit}
      focus={p.image_focus}
    />
  ) : null;

  const body = showBody ? (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        fontFamily: fontStack(body_font),
        fontSize: bodySize,
        lineHeight: 1.46,
        color: tokens.text,
        textAlign: "justify",
        hyphens: "auto",
        columnCount: side ? 1 : bodyColumns,
        columnGap: 16,
        columnRule: `1px solid ${tokens.rule}`,
      }}
      dangerouslySetInnerHTML={html(p.body_text)}
    />
  ) : (
    <div style={{ flex: 1, minHeight: 0 }} />
  );

  const jump = block.jump_to_page ? (
    <div
      style={{
        fontFamily: "var(--paper-sans)",
        fontSize: 10.5,
        color: tokens.accent,
        textAlign: "right",
        paddingTop: 6,
      }}
    >
      Continued on Page {block.jump_to_page}
    </div>
  ) : null;

  if (side) {
    const imageFirst = layout === "image-left";
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {head}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: imageFirst
              ? `${imageRatio * 100}% 1fr`
              : `1fr ${imageRatio * 100}%`,
            gap: 12,
          }}
        >
          {imageFirst ? (
            <>
              <div style={{ minWidth: 0 }}>{figure}</div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                {body}
              </div>
            </>
          ) : (
            <>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                {body}
              </div>
              <div style={{ minWidth: 0 }}>{figure}</div>
            </>
          )}
        </div>
        {jump}
      </div>
    );
  }

  if (layout === "image-inset") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {head}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            fontFamily: fontStack(body_font),
            fontSize: bodySize,
            lineHeight: 1.46,
            color: tokens.text,
            textAlign: "justify",
            hyphens: "auto",
            columnCount: bodyColumns,
            columnGap: 16,
            columnRule: `1px solid ${tokens.rule}`,
          }}
        >
          <div
            style={{
              float: "right",
              width: `${imageRatio * 100}%`,
              marginLeft: 12,
              marginBottom: 8,
            }}
          >
            {figure}
          </div>
          {showBody ? (
            <div dangerouslySetInnerHTML={html(p.body_text)} />
          ) : null}
        </div>
        {jump}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {layout === "image-top" ? (
        <>
          {figure}
          {head}
          {body}
        </>
      ) : layout === "image-bottom" ? (
        <>
          {head}
          {body}
          {figure}
        </>
      ) : (
        <>
          {head}
          {figure}
          {body}
        </>
      )}
      {jump}
    </div>
  );
}

function MastheadBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = { ...ctx.style.masthead, ...(block.props ?? {}) } as Record<string, unknown>;
  const { tokens, headline_font } = ctx.style;
  const logo = media(ctx, p.logo_url);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        borderBottom: `1px solid ${tokens.text}`,
        color: tokens.text,
      }}
    >
      {logo ? (
        <img src={logo} alt="" style={{ maxHeight: "60%", objectFit: "contain" }} />
      ) : (
        <div
          style={{
            fontFamily: fontStack(headline_font),
            fontWeight: 800,
            fontSize: num(p.name_size, 62),
            lineHeight: 1,
          }}
        >
          {str(p.title, "Masthead")}
        </div>
      )}
      {p.tagline ? (
        <div
          style={{
            fontFamily: "var(--paper-sans)",
            fontSize: 11,
            letterSpacing: ".4em",
            textTransform: "uppercase",
            paddingLeft: ".4em",
            marginTop: 8,
            opacity: 0.75,
          }}
        >
          {str(p.tagline)}
        </div>
      ) : null}
    </div>
  );
}

function EditionBarBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens } = ctx.style;
  const defaults = mastheadDefaults(ctx);
  const ownLeft = arr(p.left).map((v) => str(v)).filter(Boolean);
  const ownRight = arr(p.right).map((v) => str(v)).filter(Boolean);
  const left = ownLeft.length > 0 ? ownLeft : [defaults.edition_label].filter(Boolean);
  const right =
    ownRight.length > 0
      ? ownRight
      : [defaults.price, defaults.website].filter(Boolean);
  const cell = (items: string[]) => items.join("  |  ");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--paper-sans)",
        fontSize: 11.5,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: tokens.text,
        borderBottom: `2px solid ${tokens.text}`,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span>{cell(left)}</span>
      <span>{cell(right)}</span>
    </div>
  );
}

type HighlightImagePosition = "top" | "bottom" | "left" | "right";

function highlightImagePosition(value: unknown): HighlightImagePosition {
  return value === "bottom" || value === "left" || value === "right"
    ? value
    : "top";
}

function HighlightsBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, headline_font } = ctx.style;
  const items = arr(p.items) as Record<string, unknown>[];
  const showTitle = p.show_title === true;
  const title = str(p.title, "Today's highlights");
  const showImages = p.show_images === true;
  const position = highlightImagePosition(p.image_position);
  const imageHeight = num(p.image_h, 64);
  const imageRatio = Math.min(0.6, Math.max(0.2, num(p.image_ratio, 0.35)));
  const sideImage = position === "left" || position === "right";

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: showTitle
          ? `auto repeat(${Math.max(1, items.length)}, 1fr)`
          : `repeat(${Math.max(1, items.length)}, 1fr)`,
        borderBottom: `2px solid ${tokens.text}`,
      }}
    >
      {showTitle ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            background: tokens.accent,
            color: "#ffffff",
            fontFamily: "var(--paper-sans)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            maxWidth: 130,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      ) : null}
      {items.map((item, i) => {
        const image = showImages ? media(ctx, item.image) : null;

        const picture = image ? (
          <img
            src={image}
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: sideImage ? "100%" : imageHeight,
              minHeight: 0,
              background: tokens.surface,
              ...imageFitStyle(
                item.image_fit ?? p.image_fit,
                item.image_focus ?? p.image_focus
              ),
            }}
          />
        ) : null;

        const text = (
          <div style={{ minWidth: 0 }}>
            <Kicker text={str(item.section)} color={tokens.accent} />
            <div
              style={{
                fontFamily: fontStack(headline_font),
                fontWeight: 700,
                fontSize: 17,
                lineHeight: 1.15,
                color: tokens.text,
              }}
            >
              {str(item.headline)}
            </div>
            {item.page ? (
              <div
                style={{
                  fontFamily: "var(--paper-sans)",
                  fontWeight: 700,
                  fontSize: 11,
                  marginTop: 5,
                  color: tokens.text,
                }}
              >
                {str(item.page)}
              </div>
            ) : null}
          </div>
        );

        return (
          <div
            key={i}
            style={{
              padding: "10px 14px",
              borderLeft:
                i === 0 && !showTitle ? "none" : `1px solid ${tokens.rule}`,
              minWidth: 0,
              display: sideImage && picture ? "grid" : "flex",
              flexDirection: sideImage ? undefined : "column",
              gridTemplateColumns:
                sideImage && picture
                  ? position === "left"
                    ? `${imageRatio * 100}% 1fr`
                    : `1fr ${imageRatio * 100}%`
                  : undefined,
              gap: picture ? 8 : 0,
              alignItems: sideImage ? "start" : undefined,
            }}
          >
            {picture && (position === "top" || position === "left") ? picture : null}
            {text}
            {picture && (position === "bottom" || position === "right")
              ? picture
              : null}
          </div>
        );
      })}
    </div>
  );
}

function QuoteBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, headline_font } = ctx.style;
  return (
    <PanelShell title={str(p.title)} tokens={tokens}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div
          style={{
            fontFamily: fontStack(headline_font),
            fontSize: 40,
            lineHeight: 0.7,
            color: tokens.accent,
          }}
        >
          &ldquo;
        </div>
        <div
          style={{
            fontFamily: fontStack(headline_font),
            fontSize: num(p.size, 19),
            lineHeight: 1.3,
            fontWeight: 700,
            marginTop: 8,
            color: tokens.text,
          }}
        >
          {str(p.text)}
        </div>
        <div
          style={{
            marginTop: "auto",
            paddingTop: 10,
            borderTop: `1px solid ${tokens.rule}`,
            fontFamily: "var(--paper-sans)",
            fontSize: 11,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: tokens.text,
            opacity: 0.7,
          }}
        >
          {str(p.attribution)}
        </div>
      </div>
    </PanelShell>
  );
}

function ListPanelBlock({
  block,
  ctx,
  accentHeader,
}: {
  block: DocumentBlock;
  ctx: BlockContext;
  accentHeader?: boolean;
}) {
  const p = block.props ?? {};
  const { tokens, headline_font, body_font } = ctx.style;
  const items = arr(p.items) as Record<string, unknown>[];

  return (
    <PanelShell title={str(p.title)} tokens={tokens} accentHeader={accentHeader}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "7px 0",
              borderBottom:
                i === items.length - 1 ? "none" : `1px dotted ${tokens.rule}`,
            }}
          >
            {item.headline ? (
              <div
                style={{
                  fontFamily: fontStack(headline_font),
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: 1.18,
                  marginBottom: 3,
                  color: tokens.text,
                }}
              >
                {str(item.headline)}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: fontStack(body_font),
                fontSize: 11.5,
                lineHeight: 1.4,
                color: tokens.text,
                opacity: 0.85,
              }}
            >
              {str(item.text)}
            </div>
            {item.page ? (
              <div
                style={{
                  fontFamily: "var(--paper-sans)",
                  fontWeight: 700,
                  fontSize: 10.5,
                  marginTop: 4,
                  color: tokens.text,
                }}
              >
                {str(item.page)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function EditorialBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, headline_font, body_font } = ctx.style;
  return (
    <PanelShell title={str(p.title)} tokens={tokens} accentHeader>
      <div>
        <h3
          style={{
            margin: "0 0 8px",
            fontFamily: fontStack(headline_font),
            fontWeight: 700,
            fontSize: num(p.headline_size, 17),
            lineHeight: 1.18,
            color: tokens.text,
          }}
        >
          {str(p.headline)}
        </h3>
        <div
          style={{
            fontFamily: fontStack(body_font),
            fontSize: num(p.body_size, 11.5),
            lineHeight: 1.5,
            textAlign: "justify",
            hyphens: "auto",
            color: tokens.text,
          }}
          dangerouslySetInnerHTML={html(p.body_text)}
        />
      </div>
    </PanelShell>
  );
}

function NoticeBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, body_font } = ctx.style;
  const rows = arr(p.rows) as Record<string, unknown>[];
  return (
    <PanelShell title={str(p.title)} tokens={tokens}>
      <dl style={{ margin: 0, fontFamily: fontStack(body_font), fontSize: 11.5 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 0 : 8 }}>
            <dt
              style={{
                fontFamily: "var(--paper-sans)",
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: tokens.text,
              }}
            >
              {str(row.label)}
            </dt>
            <dd style={{ margin: "2px 0 0", color: tokens.text, opacity: 0.85 }}>
              {str(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </PanelShell>
  );
}

function AdBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens, headline_font } = ctx.style;
  const image = media(ctx, p.image);

  if (image) {
    return (
      <img
        src={image}
        alt=""
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          ...imageFitStyle(p.image_fit, p.image_focus),
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 4,
        border: `2px solid ${tokens.text}`,
        background: tokens.surface,
        padding: "8px 16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--paper-sans)",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: tokens.text,
          opacity: 0.6,
        }}
      >
        {str(p.kicker, "Advertisement")}
      </div>
      <div
        style={{
          fontFamily: fontStack(headline_font),
          fontWeight: 700,
          fontSize: num(p.headline_size, 20),
          color: tokens.text,
        }}
      >
        {str(p.headline)}
      </div>
      {p.text ? (
        <div style={{ fontSize: 11.5, lineHeight: 1.4, color: tokens.text }}>
          {str(p.text)}
        </div>
      ) : null}
    </div>
  );
}

function ImageBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens } = ctx.style;
  const src = media(ctx, p.image);
  if (!src) {
    return <div style={{ height: "100%", background: tokens.surface }} />;
  }
  return (
    <figure style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      <img
        src={src}
        alt=""
        style={{
          display: "block",
          width: "100%",
          flex: 1,
          minHeight: 0,
          ...imageFitStyle(p.image_fit, p.image_focus),
        }}
      />
      {p.caption ? (
        <figcaption
          style={{
            fontFamily: "var(--paper-sans)",
            fontSize: 10,
            lineHeight: 1.35,
            paddingTop: 4,
            color: tokens.text,
            opacity: 0.7,
          }}
        >
          {str(p.caption)}
        </figcaption>
      ) : null}
    </figure>
  );
}

function FolioBlock({ block, ctx }: { block: DocumentBlock; ctx: BlockContext }) {
  const p = block.props ?? {};
  const { tokens } = ctx.style;
  const defaults = mastheadDefaults(ctx);
  const left = str(p.left) || defaults.title;
  const center = str(p.center) || defaults.website;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${tokens.rule}`,
        fontFamily: "var(--paper-sans)",
        fontSize: 10,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: tokens.text,
        opacity: 0.7,
      }}
    >
      <span>{left}</span>
      <span>{center}</span>
      <span>{str(p.right)}</span>
    </div>
  );
}

function RuleBlock({ ctx }: { ctx: BlockContext }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", height: 1, background: ctx.style.tokens.text }} />
    </div>
  );
}

function FillerBlock({ ctx }: { ctx: BlockContext }) {
  return <div style={{ height: "100%", background: ctx.style.tokens.surface }} />;
}

export function renderBlockBody(
  block: DocumentBlock,
  ctx: BlockContext
): ReactNode {
  switch (block.type) {
    case "story":
      return <StoryBlock block={block} ctx={ctx} />;
    case "masthead":
      return <MastheadBlock block={block} ctx={ctx} />;
    case "edition_bar":
      return <EditionBarBlock block={block} ctx={ctx} />;
    case "highlights":
      return <HighlightsBlock block={block} ctx={ctx} />;
    case "quote":
      return <QuoteBlock block={block} ctx={ctx} />;
    case "editorial":
      return <EditorialBlock block={block} ctx={ctx} />;
    case "briefs":
      return <ListPanelBlock block={block} ctx={ctx} accentHeader />;
    case "panel":
      return <ListPanelBlock block={block} ctx={ctx} />;
    case "notice":
      return <NoticeBlock block={block} ctx={ctx} />;
    case "ad":
      return <AdBlock block={block} ctx={ctx} />;
    case "image":
      return <ImageBlock block={block} ctx={ctx} />;
    case "folio":
      return <FolioBlock block={block} ctx={ctx} />;
    case "rule":
      return <RuleBlock ctx={ctx} />;
    case "filler":
    default:
      return <FillerBlock ctx={ctx} />;
  }
}

export function blockPositionStyle(block: DocumentBlock): CSSProperties {
  return {
    position: "absolute",
    left: block.x,
    top: block.y,
    width: block.w,
    height: block.h,
    overflow: "hidden",
  };
}
