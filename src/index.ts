export type {
  TemplateFormat,
  StoryDensity,
  LayoutRole,
  PaperFont,
  PaperPreviewArticle,
  PaperPreviewInput,
  PaperRenderArticleSnapshot,
  PaperRenderTemplate,
  PaperRenderTheme,
  PaperRenderFont,
  PaperRenderEdition,
  PaperRenderBundle,
  ResolveMediaUrl,
} from "./types";

export {
  PAPER_DIMENSIONS,
  DEFAULT_PAPER_MARGINS,
  DEFAULT_GRID_GAP,
  PAPER_ROW_UNIT,
  MASTHEAD_RESERVE,
  FOOTER_RESERVE,
  asTemplateFormat,
  pageRowCapacity,
  pageContentWidth,
  pageContentHeight,
  columnSpanWidth,
  rowSpanHeight,
  type PaperMargins,
} from "./paper-dimensions";

export {
  headlineFontSize,
  bodyFontSize,
  kickerFontSize,
  dekFontSize,
  bodyColumnCount,
  headlineLineHeight,
  BODY_LINE_HEIGHT,
} from "./paper-typography";

export {
  fitParagraphsToBox,
  useFittedParagraphs,
  useDocumentFontsReady,
  useFitRegistry,
  FitRegistryProvider,
  useReportedCut,
  useReportCut,
  type FitOutcome,
  type FitOptions,
} from "./paper-fit";

export {
  usePaperFonts,
  waitForPaperFonts,
  googleFontHref,
  fontStack,
} from "./paper-fonts";

export {
  getPaperMargins,
  getGridGap,
  stripHtml,
  snapshotToPreviewArticle,
  buildPaperPreviewFromRenderBundle,
  canPreviewPaper,
} from "./paper-preview";

export {
  zoneHintsFromSchema,
  computePageLayouts,
  computePageBlocks,
  buildPageGeometry,
  storyBoxMetrics,
  storyFitRatio,
  storyFitReport,
  furnitureGeometry,
  roleForArticle,
  imageHeightFor,
  imageAspectRatio,
  maxLayoutRow,
  paginateByPageNumber,
  paginateBroadsheet,
  buildEditionPages,
  type ZoneHint,
  type ComputedArticleLayout,
  type FillerBlock,
  type PageGeometry,
  type StoryBoxMetrics,
  type StoryFitReport,
  type StoryFitState,
  type EditionPage,
  type BroadsheetPage,
} from "./paper-layout";

export {
  extractColumnParagraphs,
  stripRichEmbeds,
  truncatePlain,
  resolveEffectiveDensity,
  buildStoryBody,
  splitDropcap,
  bodyCharBudget,
  leadParagraphLimit,
  estimateCharCapacity,
  sliceParagraphsToBudget,
  remainderAfterChars,
  totalBodyChars,
  plainDek,
  type StoryBody,
  type TextBoxMetrics,
} from "./paper-content";

export {
  buildPaperEditionPages,
  usePaperEditionPages,
  usePaperEditionPagesFromInput,
  resolveUploadedPdfUrl,
  type PaperEditionPagesResult,
} from "./use-paper-edition-pages";

export { sanitizeArticleHtml, looksLikeHtml } from "./sanitize-html";

export {
  ENewspaperBroadsheetRenderer,
  type ENewspaperBroadsheetRendererProps,
} from "./ENewspaperBroadsheetRenderer";

export {
  ENewspaperPaperViewer,
  ENewspaperPrintPages,
  type ENewspaperPaperViewerProps,
  type ENewspaperPrintPagesProps,
} from "./ENewspaperPaperViewer";

export {
  ENewspaperPageComposer,
  type ENewspaperPageComposerProps,
  type ComposerPatch,
} from "./ENewspaperPageComposer";

export {
  parseMasthead,
  buildHighlights,
  buildTopStories,
  planFrontPageFurniture,
  hasInlineFrontPagePanels,
  type FurnitureKind,
  type FurnitureBlock,
  type FurnitureGeometry,
  type PaperContact,
  type PaperEditorial,
  type PaperQuote,
  type PaperHighlight,
  type PaperMasthead,
} from "./paper-furniture";

export {
  PaperNameplate,
  PaperEditionBar,
  PaperRunningHead,
  PaperHighlightsStrip,
  PaperFrontPagePanels,
  TopStoriesPanel,
  EditorialPanel,
  QuotePanel,
  StandsForPanel,
  PaperFooter,
  type PaperTokens,
} from "./ENewspaperPageFurniture";
