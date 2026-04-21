/**
 * Print layout engine types.
 * Used by build-sections-from-cv, measurement, pagination, and React integration.
 */

// ---- Pagination granularity ----

export type PaginationGranularity = 'block' | 'paragraph';

export interface PaginationConfig {
  granularity: PaginationGranularity;
  /** Locale used when splitting descriptions into paragraphs (e.g. for paragraph mode). */
  locale?: 'sv' | 'en';
}

// ---- Section types ----

export type SectionType =
  | 'cover'
  | 'experience'
  | 'hobbyProjects'
  | 'educationCourses'
  | 'commitments'
  | 'competence';

// Page configuration for an A4 (or other) size
export interface PageConfig {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
}

// ---- Header / Footer metadata ----

export interface HeaderFooterDef {
  id: string;
  heightPx: number;
  templateId: string; // used by React to pick a component/template
  repeatOn: 'allPages' | 'firstPageOnly' | 'exceptFirstPage';
}

export interface HeaderFooterRef {
  defId: string;
  repeatOn?: 'allPages' | 'firstPageOnly' | 'exceptFirstPage';
}

/** Theme-controlled header/footer definitions. Pagination uses this to know which headers/footers exist. */
export interface PrintThemeConfig {
  headers: HeaderFooterDef[];
  footers: HeaderFooterDef[];
}

// ---- Content block specification ----

export type ContentBlockKind =
  | 'coverIntro'
  | 'experienceItem'
  | 'experienceParagraph'
  | 'experienceListItem'
  | 'hobbyProjectItem'
  | 'educationItem'
  | 'educationParagraph'
  | 'courseItem'
  | 'commitmentItem'
  | 'competenceGroup'
  | 'custom';

export interface ContentBlockSpec {
  id: string; // stable ID, e.g. "role-123", "education-abc"
  kind: ContentBlockKind;
  sectionId: string; // the SectionSpec.id

  // Layout hints:
  // - keepWithNext: this block must move together with the next one
  // - groupId: all blocks with same groupId must stay on the same page
  // - allowSplitAcrossPages: only true for very tall blocks you accept splitting
  // - forceBreakBefore: explicit manual break before this block (e.g. via cv.printBreakBefore)
  keepWithNext?: boolean;
  groupId?: string;
  allowSplitAcrossPages?: boolean;
  forceBreakBefore?: boolean;

  // Arbitrary domain data needed for rendering
  payload: unknown;
}

// ---- Section spec ----

export interface SectionSpec {
  id: string; // e.g. "cover", "experience"
  type: SectionType;
  enabled: boolean;
  order: number; // section order in the CV

  header?: HeaderFooterRef;
  footer?: HeaderFooterRef;

  contentBlocks: ContentBlockSpec[];
}

// ---- Measurement result ----

export interface BlockMeasurement {
  blockId: string;
  heightPx: number;
}

export interface MeasurementsBySection {
  // blockId -> measurement
  [sectionId: string]: Record<string, BlockMeasurement>;
}

// ---- Pagination result ----

export interface PlacedBlock {
  blockId: string;
  sectionId: string;
  /** Advisory/debug: expected vertical offset from top of content area. Renderer may ignore; use normal flow layout. */
  yOffsetPx: number;
  heightPx: number;
  startedNewPage?: boolean;
}

export interface PageLayout {
  pageNumber: number; // global, 1-based index
  sectionId: string;

  header?: HeaderFooterRef;
  footer?: HeaderFooterRef;

  contentHeightLimitPx: number;
  usedContentHeightPx: number;

  items: PlacedBlock[];
}

export interface OverflowDiagnostic {
  blockId: string;
  sectionId: string;
  requiredHeightPx: number;
  availableHeightPx: number;
}

export interface CvPaginationResult {
  pages: PageLayout[];
  overflowBlocks?: OverflowDiagnostic[];
}

// blockId -> ContentBlockSpec (for looking up kind + payload when rendering)
export type BlockIndex = Record<string, ContentBlockSpec>;

export interface BuiltLayout {
  sections: SectionSpec[];
  blockIndex: BlockIndex;
}
