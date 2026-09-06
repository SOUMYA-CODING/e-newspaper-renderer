export {
  DOCUMENT_SCHEMA_VERSION,
  BLOCK_TYPES,
  type BlockType,
  type PaperFormat,
  type DocumentBlock,
  type DocumentPage as DocumentPageData,
  type PageMargins,
  type EditionDocument,
  type FontDescriptor,
  type ThemeTokens,
  type EditionStyle,
  type RenderBundle,
  type ResolveMediaUrl,
} from "./document/types";

export {
  DocumentSchemaError,
  DEFAULT_MARGINS,
  isBlockType,
  assertSupportedDocument,
  resolveMargins,
  sortedPages,
  pageByNumber,
  renderableBlocks,
  documentIsEmpty,
  contentWidth,
  columnWidth,
  columnX,
  spanWidth,
} from "./document/validate";

export {
  PAPER_DIMENSIONS,
  DEFAULT_PAPER_MARGINS,
  DEFAULT_GRID_GAP,
  asPaperFormat,
  pageContentWidth,
  pageContentHeight,
  columnSpanWidth,
  rowSpanHeight,
} from "./paper-dimensions";

export { usePaperFonts, waitForPaperFonts, googleFontHref, fontStack } from "./paper-fonts";

export { sanitizeArticleHtml, looksLikeHtml } from "./sanitize-html";

export {
  DocumentPage,
  paperVariables,
  type DocumentPageProps,
} from "./render/DocumentPage";

export {
  DocumentViewer,
  type DocumentViewerProps,
} from "./render/DocumentViewer";

export {
  DocumentPrint,
  RENDER_READY_ATTRIBUTE,
  type DocumentPrintProps,
} from "./render/DocumentPrint";

export {
  renderBlockBody,
  blockPositionStyle,
  type BlockContext,
} from "./render/blocks";

export {
  fitStory,
  bodyFontFamily,
  type FitState,
  type StoryFitInput,
  type StoryFitResult,
} from "./measure/fitStory";

export {
  autoArrange,
  type ArrangeArticle,
  type ArrangeOptions,
} from "./arrange/autoArrange";
