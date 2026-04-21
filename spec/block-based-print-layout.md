CV Print Pagination Engine – Full Implementation Plan
0. Purpose

Create a pure TypeScript pagination engine for printing CVs that:

Accepts structured CV data and layout config.

Uses a pluggable measurement mechanism (React DOM or other) to get pixel heights.

Produces a page model (list of pages with ordered blocks) that React can render for print/PDF.

Is decoupled from CSS page-break heuristics (break-before, break-inside, etc.).

This doc is meant to be directly usable by a coding agent.

1. Core Concepts

Section – a logical segment of the CV (cover, experience, education+courses, commitments, competence).

Content Block – smallest unsplittable unit (e.g., one role, one education item, one competence group, or header+short paragraph).

Measurement Service – external mechanism that maps each Content Block to a pixel height at a given width.

Pagination Engine – pure TS module that arranges blocks into pages based on heights and constraints.

React Renderer – consumes Pagination Engine output and renders pages; CSS only enforces A4 size and physical page breaks.

2. Data Model (Types)

Create src/lib/print-layout-engine-types.ts:

// src/lib/print-layout-engine-types.ts

// ---- Section types ----

export type SectionType =
  | 'cover'
  | 'experience'
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

/**
 * Returns print-specific configuration for the given theme.
 * Theme affects the set of available header/footer definitions; sections decide which header/footer they use by referencing HeaderFooterDef.id via SectionSpec.header / SectionSpec.footer.
 */
export function getPrintThemeConfig(themeId: string): PrintThemeConfig;

// ---- Content block specification ----

export type ContentBlockKind =
  | 'coverIntro'
  | 'experienceItem'
  | 'educationItem'
  | 'courseItem'
  | 'commitmentItem'
  | 'competenceGroup'
  | 'custom';

export interface ContentBlockSpec {
  id: string;              // stable ID, e.g. "role-123", "education-abc"
  kind: ContentBlockKind;
  sectionId: string;       // the SectionSpec.id

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
  id: string;              // e.g. "cover", "experience"
  type: SectionType;
  enabled: boolean;
  order: number;           // section order in the CV

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
  pageNumber: number;       // global, 1-based index
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

3. DomainCV → Sections & Blocks (Builder)

Create src/lib/build-sections-from-cv.ts.

**Section composition and order:** buildSectionsFromCv(cv) is the single source of truth for: which sections exist in the printed CV, their order (SectionSpec.order), and which content blocks each section contains. The theme does not reorder or filter sections in this version. If a section should be omitted, it must be controlled either by the CV data (e.g. no visible items → no section) or by the builder’s logic. A future extension could introduce theme-specific section ordering, but that is outside the current scope. (Users will be able to specify what goes into which block in a later iteration; for now we use a single combined section `educationCourses`.)

**Header/footer:** Section header and footer refs (`SectionSpec.header`, `SectionSpec.footer`) are not set by this builder. A separate builder for header/footer definitions and attaching them to sections will be added in the next iteration. Theme controls the set of available header/footer definitions through getPrintThemeConfig(themeId): { headers, footers }. Sections decide which header/footer they use by referencing these HeaderFooterDef.ids.

Assumptions on DomainCV (from cv.ts):

cv.roles: work experience items { id, visible, ... }

cv.educations: education items { id, visible, ... }

cv.trainings: course/certification items { id, visible, ... }

cv.commitments: presentations/publications, { id, visible, ... }

cv.skills: skills with level { id, level, visible? }

cv.printBreakBefore: manual page-break hints, grouped by category:

{ experience: string[], education: string[], 'courses-certification': string[], commitments: string[] }

cv also has basic properties for cover page: id, name, title, summary, contacts, coverPageGroups, featuredProjects, photoDataUrl, etc.

// src/lib/build-sections-from-cv.ts

import type {
  DomainCV,
  Skill,
  PrintBreakBefore,
} from '@/domain/model/cv';

import type {
  SectionSpec,
  SectionType,
  ContentBlockSpec,
  BlockIndex,
  BuiltLayout,
} from '@/lib/print-layout-engine-types';

function shouldForceBreakBeforeItem(
  group: keyof PrintBreakBefore,
  itemId: string,
  printBreakBefore?: PrintBreakBefore | null,
): boolean {
  if (!printBreakBefore) return false;
  const ids = printBreakBefore[group];
  if (!ids || ids.length === 0) return false;
  return ids.includes(itemId);
}

// ---- Cover section ----

// Cover is always one page. Use the solution that introduces the least code (no special overflow handling required).

function buildCoverSection(cv: DomainCV): SectionSpec {
  const sectionId: SectionType = 'cover';

  const block: ContentBlockSpec = {
    id: 'cover-main',
    kind: 'coverIntro',
    sectionId,
    allowSplitAcrossPages: false,
    payload: {
      cvId: cv.id,
      name: cv.name,
      title: cv.title,
      summary: cv.summary,
      contacts: cv.contacts ?? null,
      coverPageGroups: cv.coverPageGroups ?? null,
      featuredProjects: (cv.featuredProjects ?? []).filter((p) => p.visible),
      photoDataUrl: cv.photoDataUrl ?? null,
    },
  };

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 0,
    contentBlocks: [block],
  };
}

// ---- Experience section ----

function buildExperienceSection(cv: DomainCV): SectionSpec | null {
  const visibleRoles = cv.roles.filter((role) => role.visible);
  if (visibleRoles.length === 0) return null;

  const sectionId: SectionType = 'experience';

  const blocks: ContentBlockSpec[] = visibleRoles.map((role) => ({
    id: `role-${role.id}`,
    kind: 'experienceItem',
    sectionId,
    groupId: `role-${role.id}`, // keep an entire role on one page
    allowSplitAcrossPages: false,
    forceBreakBefore: shouldForceBreakBeforeItem(
      'experience',
      role.id,
      cv.printBreakBefore ?? undefined,
    ),
    payload: {
      roleId: role.id,
    },
  }));

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 1,
    contentBlocks: blocks,
  };
}

// ---- Education + Courses section ----

function buildEducationCoursesSection(cv: DomainCV): SectionSpec | null {
  const visibleEducations = cv.educations.filter((e) => e.visible);
  const visibleTrainings = cv.trainings.filter((t) => t.visible);

  if (visibleEducations.length === 0 && visibleTrainings.length === 0) {
    return null;
  }

  const sectionId: SectionType = 'educationCourses';
  const blocks: ContentBlockSpec[] = [];

  // Education items first
  for (const edu of visibleEducations) {
    blocks.push({
      id: `education-${edu.id}`,
      kind: 'educationItem',
      sectionId,
      groupId: `education-${edu.id}`,
      allowSplitAcrossPages: false,
      forceBreakBefore: shouldForceBreakBeforeItem(
        'education',
        edu.id,
        cv.printBreakBefore ?? undefined,
      ),
      payload: {
        educationId: edu.id,
      },
    });
  }

  // Then courses/certifications
  for (const training of visibleTrainings) {
    blocks.push({
      id: `training-${training.id}`,
      kind: 'courseItem',
      sectionId,
      groupId: `training-${training.id}`,
      allowSplitAcrossPages: false,
      forceBreakBefore: shouldForceBreakBeforeItem(
        'courses-certification',
        training.id,
        cv.printBreakBefore ?? undefined,
      ),
      payload: {
        trainingId: training.id,
      },
    });
  }

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 2,
    contentBlocks: blocks,
  };
}

// ---- Commitments section ----

function buildCommitmentsSection(cv: DomainCV): SectionSpec | null {
  const visibleCommitments = cv.commitments.filter((c) => c.visible);
  if (visibleCommitments.length === 0) return null;

  const sectionId: SectionType = 'commitments';

  const blocks: ContentBlockSpec[] = visibleCommitments.map((commitment) => ({
    id: `commitment-${commitment.id}`,
    kind: 'commitmentItem',
    sectionId,
    groupId: `commitment-${commitment.id}`,
    allowSplitAcrossPages: false,
    forceBreakBefore: shouldForceBreakBeforeItem(
      'commitments',
      commitment.id,
      cv.printBreakBefore ?? undefined,
    ),
    payload: {
      commitmentId: commitment.id,
    },
  }));

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 3,
    contentBlocks: blocks,
  };
}

// ---- Competence / skills section ----

function buildCompetenceSection(cv: DomainCV): SectionSpec | null {
  if (!cv.skills || cv.skills.length === 0) return null;

  const sectionId: SectionType = 'competence';

  const skillsByLevel = cv.skills.reduce((acc, skill: Skill) => {
    const level = skill.level ?? 0;
    if (!acc[level]) acc[level] = [];
    acc[level].push(skill);
    return acc;
  }, {} as Record<number, Skill[]>);

  const sortedLevels = Object.keys(skillsByLevel)
    .map(Number)
    .sort((a, b) => b - a); // highest level first

  const blocks: ContentBlockSpec[] = sortedLevels.map((level) => ({
    id: `skills-level-${level}`,
    kind: 'competenceGroup',
    sectionId,
    groupId: `skills-level-${level}`,
    allowSplitAcrossPages: false,
    payload: {
      level,
      skillIds: skillsByLevel[level].map((s) => s.id),
    },
  }));

  return {
    id: sectionId,
    type: sectionId,
    enabled: true,
    order: 4,
    contentBlocks: blocks,
  };
}

// ---- Public API ----

export function buildSectionsFromCv(cv: DomainCV): BuiltLayout {
  const sections: SectionSpec[] = [];

  // Cover
  sections.push(buildCoverSection(cv));

  // Experience
  const experience = buildExperienceSection(cv);
  if (experience) sections.push(experience);

  // Education + Courses
  const educationCourses = buildEducationCoursesSection(cv);
  if (educationCourses) sections.push(educationCourses);

  // Commitments
  const commitments = buildCommitmentsSection(cv);
  if (commitments) sections.push(commitments);

  // Competence
  const competence = buildCompetenceSection(cv);
  if (competence) sections.push(competence);

  sections.sort((a, b) => a.order - b.order);

  const blockIndex: BlockIndex = {};
  for (const section of sections) {
    for (const block of section.contentBlocks) {
      blockIndex[block.id] = block;
    }
  }

  return { sections, blockIndex };
}

Example: Result of buildSectionsFromCv

For a CV with:

1 cover, 2 roles, 1 education, 2 trainings, no commitments, 2 skill levels.

buildSectionsFromCv returns a BuiltLayout:

{
  sections: [
  {
    id: "cover",
    type: "cover",
    enabled: true,
    order: 0,
    contentBlocks: [
      {
        id: "cover-main",
        kind: "coverIntro",
        sectionId: "cover",
        allowSplitAcrossPages: false,
        payload: { /* cover data */ }
      }
    ]
  },
  {
    id: "experience",
    type: "experience",
    enabled: true,
    order: 1,
    contentBlocks: [
      { id: "role-role1", kind: "experienceItem", ... },
      { id: "role-role2", kind: "experienceItem", ... },
    ]
  },
  {
    id: "educationCourses",
    type: "educationCourses",
    enabled: true,
    order: 2,
    contentBlocks: [
      { id: "education-edu1", kind: "educationItem", ... },
      { id: "training-train1", kind: "courseItem", ... },
      { id: "training-train2", kind: "courseItem", ... },
    ]
  },
  {
    id: "competence",
    type: "competence",
    enabled: true,
    order: 4,
    contentBlocks: [
      { id: "skills-level-3", kind: "competenceGroup", ... },
      { id: "skills-level-2", kind: "competenceGroup", ... },
    ]
  }
  ],
  blockIndex: {
    "cover-main": { id: "cover-main", kind: "coverIntro", ... },
    "role-role1": { id: "role-role1", kind: "experienceItem", ... },
    "role-role2": { ... },
    "education-edu1": { ... },
    "training-train1": { ... },
    "training-train2": { ... },
    "skills-level-3": { ... },
    "skills-level-2": { ... },
  }
}

4. Measurement Layer
4.1 Interface
// src/lib/measurement-service.ts

import type {
  SectionSpec,
  PageConfig,
  MeasurementsBySection,
} from '@/lib/print-layout-engine-types';

export interface MeasurementService {
  measureAllBlocks(
    sections: SectionSpec[],
    pageConfig: PageConfig,
  ): Promise<MeasurementsBySection>;
}

4.2 React implementation sketch

Create a separate React component used only for measurement (not seen in UI):

It receives SectionSpec[].

It creates a flat list of blocks.

For each block, it renders the correct React content (based on kind and payload) inside a fixed-width container.

The measurement root renders each block into a wrapper element with data-block-id={block.id} and data-section-id={section.id}. The measurement code queries [data-block-id] and uses dataset.blockId as the key into MeasurementsBySection[sectionId][blockId].

After mount, it uses getBoundingClientRect().height to collect heights.

Pseudo-sketch:

// src/components/PrintMeasurementRoot.tsx

import React, { useLayoutEffect, useRef, useState } from 'react';
import type {
  SectionSpec,
  PageConfig,
  MeasurementsBySection,
} from '@/lib/print-layout-engine-types';

// Map block.payload + kind -> actual JSX
function renderBlockContent(block: ContentBlockSpec): React.ReactNode {
  switch (block.kind) {
    case 'experienceItem':
      return <PrintRole roleId={(block.payload as any).roleId} />;
    case 'educationItem':
      return <PrintEducation educationId={(block.payload as any).educationId} />;
    case 'courseItem':
      return <PrintTraining trainingId={(block.payload as any).trainingId} />;
    case 'commitmentItem':
      return <PrintCommitment commitmentId={(block.payload as any).commitmentId} />;
    case 'competenceGroup': {
      const { level, skillIds } = block.payload as any;
      return <PrintSkillGroup level={level} skillIds={skillIds} />;
    }
    case 'coverIntro':
      return <CoverPageFromPayload payload={block.payload} />;
    default:
      return null;
  }
}

interface Props {
  sections: SectionSpec[];
  pageConfig: PageConfig;
  onMeasured: (measurements: MeasurementsBySection) => void;
}

export const PrintMeasurementRoot: React.FC<Props> = ({
  sections,
  pageConfig,
  onMeasured,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const measurements: MeasurementsBySection = {};

    const nodes = containerRef.current.querySelectorAll<HTMLElement>(
      '[data-block-id]',
    );

    nodes.forEach((node) => {
      const blockId = node.dataset.blockId!;
      const sectionId = node.dataset.sectionId!;
      const rect = node.getBoundingClientRect();

      if (!measurements[sectionId]) {
        measurements[sectionId] = {};
      }

      measurements[sectionId][blockId] = {
        blockId,
        heightPx: rect.height,
      };
    });

    onMeasured(measurements);
  }, [sections, pageConfig, onMeasured]);

  const contentWidthPx =
    pageConfig.widthPx - pageConfig.marginLeftPx - pageConfig.marginRightPx;

  return (
    <div
      ref={containerRef}
      className="print-measure-root"
      style={{
        position: 'absolute',
        left: -99999,
        top: 0,
        width: contentWidthPx,
        pointerEvents: 'none',
      }}
    >
      {sections.map((section) =>
        section.contentBlocks.map((block) => (
          <div
            key={block.id}
            data-block-id={block.id}
            data-section-id={section.id}
          >
            {renderBlockContent(block)}
          </div>
        )),
      )}
    </div>
  );
};

4.3 Measurement root positioning

The DOM-based PrintMeasurementRoot is always rendered while measuring, but is visually hidden:

- It is positioned off-screen with: position: absolute; left: -99999px; top: 0; width: contentWidthPx.
- It must not affect layout or pointer events for the rest of the app (use pointerEvents: 'none').
- It must be hidden from print with @media print { .print-measure-root { display: none; } } so the measurement tree never appears in the printed output.

Example:

@media print {
  .print-measure-root {
    display: none;
  }
}

Requirements for the measurement layer:

Every ContentBlockSpec has a corresponding DOM node with data-block-id={block.id}.

measureAllBlocks returns a heightPx > 0 for each block.

Content width is exactly pageConfig.widthPx - marginLeftPx - marginRightPx.

5. Pagination Engine

Create src/lib/paginate-cv.ts.

5.1 Helper: content height limit per page
import type {
  PageConfig,
  HeaderFooterDef,
  HeaderFooterRef,
  SectionSpec,
  MeasurementsBySection,
  CvPaginationResult,
  PageLayout,
  PlacedBlock,
  OverflowDiagnostic,
  ContentBlockSpec,
} from '@/lib/print-layout-engine-types';

function computeContentHeightLimitPx(
  pageConfig: PageConfig,
  header?: HeaderFooterDef,
  footer?: HeaderFooterDef,
): number {
  const base =
    pageConfig.heightPx - pageConfig.marginTopPx - pageConfig.marginBottomPx;
  const headerHeight = header ? header.heightPx : 0;
  const footerHeight = footer ? footer.heightPx : 0;
  return base - headerHeight - footerHeight;
}

5.2 Helper: resolve header/footer definitions
function resolveHeader(
  section: SectionSpec,
  headerDefs: HeaderFooterDef[],
  pageIndexInSection: number, // 0-based
): HeaderFooterRef | undefined {
  if (!section.header) return undefined;

  const def = headerDefs.find((h) => h.id === section.header!.defId);
  if (!def) return undefined;

  const repeatOn = section.header.repeatOn ?? def.repeatOn;

  if (repeatOn === 'firstPageOnly' && pageIndexInSection > 0) {
    return undefined;
  }
  if (repeatOn === 'exceptFirstPage' && pageIndexInSection === 0) {
    return undefined;
  }
  return section.header;
}

function resolveFooter(
  section: SectionSpec,
  footerDefs: HeaderFooterDef[],
  pageIndexInSection: number,
): HeaderFooterRef | undefined {
  if (!section.footer) return undefined;

  const def = footerDefs.find((f) => f.id === section.footer!.defId);
  if (!def) return undefined;

  const repeatOn = section.footer.repeatOn ?? def.repeatOn;

  if (repeatOn === 'firstPageOnly' && pageIndexInSection > 0) {
    return undefined;
  }
  if (repeatOn === 'exceptFirstPage' && pageIndexInSection === 0) {
    return undefined;
  }
  return section.footer;
}

5.3 Core pagination logic
function getBlockMeasurement(
  block: ContentBlockSpec,
  measurements: MeasurementsBySection,
): number {
  const sectionMeasurements = measurements[block.sectionId];
  if (!sectionMeasurements) {
    throw new Error(`No measurements for section ${block.sectionId}`);
  }
  const m = sectionMeasurements[block.id];
  if (!m) {
    throw new Error(`No measurement for block ${block.id}`);
  }
  return m.heightPx;
}

// Determines which ContentBlockSpecs form an indivisible pagination unit (groupId, keepWithNext).
// Does not compute height; the pagination loop sums measured heights for the returned blocks.
function buildAtomicUnit(
  blocks: ContentBlockSpec[],
  startIndex: number,
): { unitBlocks: ContentBlockSpec[]; nextIndex: number } {
  const first = blocks[startIndex];
  const unitBlocks: ContentBlockSpec[] = [first];

  // groupId: all consecutive blocks with same groupId must stay together
  if (first.groupId) {
    let i = startIndex + 1;
    while (i < blocks.length && blocks[i].groupId === first.groupId) {
      unitBlocks.push(blocks[i]);
      i++;
    }
    return { unitBlocks, nextIndex: startIndex + unitBlocks.length };
  }

  // keepWithNext: only pair current + next
  if (first.keepWithNext && startIndex + 1 < blocks.length) {
    unitBlocks.push(blocks[startIndex + 1]);
    return { unitBlocks, nextIndex: startIndex + 2 };
  }

  return { unitBlocks, nextIndex: startIndex + 1 };
}

function paginateSection(
  section: SectionSpec,
  pageConfig: PageConfig,
  headerDefs: HeaderFooterDef[],
  footerDefs: HeaderFooterDef[],
  measurements: MeasurementsBySection,
  globalPageStartIndex: number,
): {
  pages: PageLayout[];
  overflowBlocks: OverflowDiagnostic[];
  nextGlobalPageIndex: number;
} {
  const pages: PageLayout[] = [];
  const overflowBlocks: OverflowDiagnostic[] = [];

  let pageIndexInSection = 0;
  let globalPageIndex = globalPageStartIndex;

  const sectionBlocks = section.contentBlocks;

  let i = 0;
  let currentPage: PageLayout | null = null;

  function startNewPage(): void {
    const headerRef = resolveHeader(section, headerDefs, pageIndexInSection);
    const footerRef = resolveFooter(section, footerDefs, pageIndexInSection);

    const headerDef = headerRef
      ? headerDefs.find((h) => h.id === headerRef.defId)
      : undefined;
    const footerDef = footerRef
      ? footerDefs.find((f) => f.id === footerRef.defId)
      : undefined;

    const contentHeightLimitPx = computeContentHeightLimitPx(
      pageConfig,
      headerDef,
      footerDef,
    );

    currentPage = {
      pageNumber: globalPageIndex + 1,
      sectionId: section.id,
      header: headerRef,
      footer: footerRef,
      contentHeightLimitPx,
      usedContentHeightPx: 0,
      items: [],
    };

    pages.push(currentPage);
    pageIndexInSection += 1;
    globalPageIndex += 1;
  }

  // start first page for this section
  startNewPage();

  while (i < sectionBlocks.length) {
    const { unitBlocks, nextIndex } = buildAtomicUnit(sectionBlocks, i);

    // sum heights
    let unitHeight = 0;
    for (const b of unitBlocks) {
      unitHeight += getBlockMeasurement(b, measurements);
    }

    // if forceBreakBefore: start new page first (unless this is first block on first page)
    const hasForceBreakBefore = unitBlocks.some((b) => b.forceBreakBefore);
    if (hasForceBreakBefore && currentPage!.usedContentHeightPx > 0) {
      startNewPage();
    }

    const remainingHeight =
      currentPage!.contentHeightLimitPx - currentPage!.usedContentHeightPx;

    const anyNonSplittable = unitBlocks.some(
      (b) => b.allowSplitAcrossPages !== true,
    );

    if (unitHeight <= remainingHeight) {
      // fits in current page
      let yOffsetPx = currentPage!.usedContentHeightPx;
      for (const b of unitBlocks) {
        const h = getBlockMeasurement(b, measurements);
        currentPage!.items.push({
          blockId: b.id,
          sectionId: b.sectionId,
          yOffsetPx,
          heightPx: h,
          startedNewPage: false,
        });
        yOffsetPx += h;
      }
      currentPage!.usedContentHeightPx += unitHeight;
    } else {
      // doesn't fit
      const pageLimit = currentPage!.contentHeightLimitPx;

      if (unitHeight > pageLimit && anyNonSplittable) {
        // overflowing non-splittable block/group
        overflowBlocks.push({
          blockId: unitBlocks[0].id,
          sectionId: section.id,
          requiredHeightPx: unitHeight,
          availableHeightPx: remainingHeight,
        });

        // still place it on a fresh page for visibility
        startNewPage();
        let yOffsetPx = 0;
        for (const b of unitBlocks) {
          const h = getBlockMeasurement(b, measurements);
          currentPage!.items.push({
            blockId: b.id,
            sectionId: b.sectionId,
            yOffsetPx,
            heightPx: h,
            startedNewPage: true,
          });
          yOffsetPx += h;
        }
        currentPage!.usedContentHeightPx += unitHeight;
      } else {
        // move whole unit to new page
        startNewPage();
        let yOffsetPx = 0;
        for (const b of unitBlocks) {
          const h = getBlockMeasurement(b, measurements);
          currentPage!.items.push({
            blockId: b.id,
            sectionId: b.sectionId,
            yOffsetPx,
            heightPx: h,
            startedNewPage: true,
          });
          yOffsetPx += h;
        }
        currentPage!.usedContentHeightPx += unitHeight;
      }
    }

    i = nextIndex;
  }

  return {
    pages,
    overflowBlocks,
    nextGlobalPageIndex: globalPageIndex,
  };
}

export function paginateCv(
  pageConfig: PageConfig,
  sections: SectionSpec[],
  headerDefs: HeaderFooterDef[],
  footerDefs: HeaderFooterDef[],
  measurements: MeasurementsBySection,
): CvPaginationResult {
  const enabledSections = sections.filter((s) => s.enabled);
  enabledSections.sort((a, b) => a.order - b.order);

  const pages: PageLayout[] = [];
  const overflowBlocks: OverflowDiagnostic[] = [];

  let globalPageIndex = 0;

  for (const section of enabledSections) {
    const {
      pages: sectionPages,
      overflowBlocks: sectionOverflow,
      nextGlobalPageIndex,
    } = paginateSection(
      section,
      pageConfig,
      headerDefs,
      footerDefs,
      measurements,
      globalPageIndex,
    );

    pages.push(...sectionPages);
    overflowBlocks.push(...sectionOverflow);
    globalPageIndex = nextGlobalPageIndex;
  }

  return {
    pages,
    overflowBlocks: overflowBlocks.length > 0 ? overflowBlocks : undefined,
  };
}

Example: Simple pagination case

Given:

Page content height limit = 1000px.

Experience section with 3 role blocks:

role-1: 400px

role-2: 400px

role-3: 400px

Pagination result:

Page 1: role-1 & role-2 (800px used).

Page 2: role-3 (400px used).

6. React Integration

6.1 Recommended pattern: useCvPagination hook

The recommended integration pattern is to use the useCvPagination hook, which encapsulates:

- Building sections and blockIndex from DomainCV (buildSectionsFromCv).
- Measuring all blocks via a MeasurementService (including mounting the hidden measurement root when using DOM measurement).
- Running paginateCv and exposing CvPaginationResult and blockIndex.
- Managing loading and error state.

PrintLayout is a thin component that consumes the hook and renders the paginated pages. PrintLayout does not manually instantiate PrintMeasurementRoot or call paginateCv directly; it only uses the hook’s result.

The hook is responsible for ensuring the hidden measurement root is mounted when measurement is in progress (either inside the hook or via a known internal component), so that DOM measurement can complete. Do not guard the entire tree with loading in a way that unmounts the measurement root.

6.2 useCvPagination (main API)

Create src/hooks/useCvPagination.ts.

The hook is the main API for pagination. It accepts options and returns result, blockIndex, loading, and error. Internally it:

- Calls buildSectionsFromCv(cv) to get { sections, blockIndex }.
- Uses the MeasurementService to get MeasurementsBySection (the hook or its measurement layer ensures the hidden PrintMeasurementRoot is mounted when using DOM measurement).
- Calls paginateCv(...) to compute CvPaginationResult.
- Manages loading and error state.

import { useEffect, useState } from 'react';
import { buildSectionsFromCv } from '@/lib/build-sections-from-cv';
import { paginateCv } from '@/lib/paginate-cv';
import type { DomainCV } from '@/domain/model/cv';
import type {
  SectionSpec,
  PageConfig,
  HeaderFooterDef,
  MeasurementsBySection,
  CvPaginationResult,
  BlockIndex,
} from '@/lib/print-layout-engine-types';
import type { MeasurementService } from '@/lib/measurement-service';

interface UseCvPaginationOptions {
  cv: DomainCV;
  pageConfig: PageConfig;
  headers: HeaderFooterDef[];
  footers: HeaderFooterDef[];
  measurementService: MeasurementService;
}

interface UseCvPaginationResult {
  result: CvPaginationResult | null;
  blockIndex: BlockIndex | null;
  loading: boolean;
  error: Error | null;
}

export function useCvPagination(
  options: UseCvPaginationOptions,
): UseCvPaginationResult {
  const { cv, pageConfig, headers, footers, measurementService } = options;
  const [blockIndex, setBlockIndex] = useState<BlockIndex | null>(null);
  const [sections, setSections] = useState<SectionSpec[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementsBySection | null>(null);
  const [result, setResult] = useState<CvPaginationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const { sections: builtSections, blockIndex: builtIndex } = buildSectionsFromCv(cv);
    setSections(builtSections);
    setBlockIndex(builtIndex);
    setMeasurements(null);
    setResult(null);
    setLoading(true);
    setError(null);
  }, [cv]);

  useEffect(() => {
    if (!sections.length) return;

    let cancelled = false;

    async function run() {
      try {
        const m = await measurementService.measureAllBlocks(sections, pageConfig);
        if (cancelled) return;

        setMeasurements(m);

        const paginationResult = paginateCv(
          pageConfig,
          sections,
          headers,
          footers,
          m,
        );

        if (!cancelled) {
          setResult(paginationResult);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sections, pageConfig, headers, footers, measurementService]);

  return { result, blockIndex, loading, error };
}

Usage: get headers and footers from the theme, then pass them into the hook:

const { headers, footers } = getPrintThemeConfig(themeId);

const { result, blockIndex, loading, error } = useCvPagination({
  cv,
  pageConfig,
  headers,
  footers,
  measurementService: new DomMeasurementService(),
});

6.3 PrintLayout (thin consumer)

PrintLayout only consumes the hook and renders the result. It does not instantiate PrintMeasurementRoot or call paginateCv directly. The hook is responsible for rendering the hidden measurement root when measuring.

// src/components/PrintLayout.tsx

import React from 'react';
import { useCvPagination } from '@/hooks/useCvPagination';
import { BlockRenderer } from '@/components/BlockRenderer';
import type { DomainCV } from '@/domain/model/cv';
import type { PageConfig } from '@/lib/print-layout-engine-types';
import { getPrintThemeConfig } from '@/lib/print-theme-config';
import { DomMeasurementService } from '@/lib/measurement-service-dom';

const pageConfig: PageConfig = {
  widthPx: 794,
  heightPx: 1123,
  marginTopPx: 40,
  marginBottomPx: 40,
  marginLeftPx: 40,
  marginRightPx: 40,
};

export const PrintLayout: React.FC<{ cv: DomainCV; themeId: string }> = ({
  cv,
  themeId,
}) => {
  const { headers, footers } = getPrintThemeConfig(themeId);

  const { result, blockIndex, loading, error } = useCvPagination({
    cv,
    pageConfig,
    headers,
    footers,
    measurementService: new DomMeasurementService(),
  });

  if (error) {
    return <div>Error generating layout: {error.message}</div>;
  }

  if (loading || !result || !blockIndex) {
    // NOTE: useCvPagination is responsible for rendering the hidden measurement root
    return <div>Generating layout…</div>;
  }

  return (
    <div className="cv-print-root">
      {result.pages.map((page) => (
        <div key={page.pageNumber} className="cv-page">
          {/* header/footer if needed */}

          <div className="cv-page-content">
            {page.items.map((item) => {
              const block = blockIndex[item.blockId];
              if (!block) return null;
              return (
                <BlockRenderer
                  key={item.blockId}
                  block={block}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

6.4 BlockRenderer (blockId → ContentBlockSpec → JSX)

BlockRenderer receives the ContentBlockSpec (from blockIndex[item.blockId]) and renders the correct React component based on block.kind. Same logic as in PrintMeasurementRoot.renderBlockContent (used for measurement).

**Layout:** Render blocks in DOM order using standard flow layout inside the page content area. The pagination engine ensures the total height of blocks per page does not exceed the content height; no absolute positioning is required. PlacedBlock.yOffsetPx is advisory/debug (expected vertical offset from top of content area) and may be ignored; it can be used for diagnostics or future overlay-style layouts if needed.

const BlockRenderer: React.FC<{ block: ContentBlockSpec }> = ({ block }) => {
  switch (block.kind) {
    case 'coverIntro':
      return <CoverPageFromPayload payload={block.payload} />;
    case 'experienceItem':
      return <PrintRole roleId={(block.payload as any).roleId} />;
    case 'educationItem':
      return <PrintEducation educationId={(block.payload as any).educationId} />;
    case 'courseItem':
      return <PrintTraining trainingId={(block.payload as any).trainingId} />;
    case 'commitmentItem':
      return <PrintCommitment commitmentId={(block.payload as any).commitmentId} />;
    case 'competenceGroup': {
      const { level, skillIds } = block.payload as any;
      return <PrintSkillGroup level={level} skillIds={skillIds} />;
    }
    default:
      return null;
  }
};

6.5 CSS (simplified)

@media print {
  .cv-page {
    page-break-after: always;
    width: 210mm;
    min-height: 297mm;
  }
}

6.6 Overflow handling

If CvPaginationResult.overflowBlocks is non-empty, the pagination engine has detected one or more content blocks that exceed the available page content height and could not be cleanly placed according to the rules.

The engine will still place these blocks on their own pages to ensure all content is rendered.

The UI layer should surface a warning when this occurs (e.g. “Some content could not fit on a page cleanly”), and may provide additional diagnostics (block ID, section, page number) for debugging or author correction.

Why this matters

Overflow means at least one of these is true:

- A block is taller than the available page content height.
- A block/group is marked as non-splittable but physically cannot fit.
- The layout config (fonts, margins, headers) makes the content impossible to place cleanly.

In all cases:

- Failing hard would break printing entirely.
- Silently ignoring it leads to broken PDFs with clipped content and no explanation.

So the correct behavior is: render anyway and report the problem.

What the engine guarantees

The pagination engine guarantees:

- No infinite loops.
- No missing content.
- A deterministic layout even in overflow cases.

Specifically: if an atomic unit does not fit, it is placed on a fresh page and an OverflowDiagnostic is emitted. This makes overflow a diagnostic condition, not a fatal error.

What the UI should do

Pagination should be fault-tolerant, not silent. When overflowBlocks is non-empty, the engine still produces a usable layout, but the UI should surface a warning so the issue is visible and actionable.

7. Phases, Requirements, and Verification
Phase 0 – Data Model & Builder

Tasks

Implement print-layout-engine-types.ts.

Implement build-sections-from-cv.ts (returns BuiltLayout: { sections, blockIndex }).

Connect buildSectionsFromCv(cv) in a dev-only route or Storybook story that logs/visualizes the sections/blocks.

Requirements

Sections exist in correct order: cover (0), experience (1), educationCourses (2), commitments (3), competence (4).

Number of ContentBlockSpec items per section matches visible DomainCV entries.

blockIndex is populated: every block from every section appears in blockIndex keyed by block.id.

Manual break hints (cv.printBreakBefore) are correctly mapped to forceBreakBefore.

Verification

Unit tests with fixed DomainCV fixtures:

buildSectionsFromCv returns BuiltLayout with expected section IDs and orders.

contentBlocks.length per section matches visible data.

blockIndex[block.id] equals the block for all blocks across sections.

Specific IDs appear with forceBreakBefore === true when in printBreakBefore.

Phase 1 – Measurement Service

Tasks

Implement MeasurementService interface.

Implement DomMeasurementService with hidden PrintMeasurementRoot component.

Ensure measurement is stable and unit-tested where possible.

Requirements

Every ContentBlockSpec yields a positive heightPx.

Content width used for measurement equals pageConfig.widthPx - margins.

Measurement errors (missing DOM node, etc.) are surfaced with clear exceptions.

Verification

Debug route that:

Renders PrintMeasurementRoot with a CV.

Logs MeasurementsBySection to console or UI.

Check visually that:

Long descriptions produce larger heightPx than short ones.

Changing font size in CSS changes measured heights.

Phase 2 – Pagination Engine

Tasks

Implement paginateCv and helpers.

Implement unit tests with synthetic data.

Requirements

Blocks are assigned to pages with no duplicates or omissions.

groupId keeps grouped blocks on the same page.

keepWithNext ensures paired blocks stay together.

forceBreakBefore starts a new page before a block if it's not first on a page.

Overflow (block taller than page) generates overflowBlocks diagnostics.

Verification (unit tests)

Single page

3 small blocks, total height < limit → all on page 1.

Multiple pages

Enough blocks to exceed limit → correct partitioning, sum of all items equals block count.

Grouping

Two blocks with same groupId, one without:

Combined height of grouped blocks > remaining space but single block would fit.

Group moves together to next page.

Force break

forceBreakBefore on second block:

If first page has space but we want a visual break, second block starts a new page.

Overflow

One block with height > limit and allowSplitAcrossPages !== true:

Appears in overflowBlocks.

Phase 3 – React Integration

Tasks

Implement useCvPagination hook.

Replace old PrintLayout internals to use:

buildSectionsFromCv

MeasurementService.measureAllBlocks

paginateCv

Map blockId to actual JSX for printing.

Requirements

Print preview displays correct number of pages.

Ordering of sections and blocks matches current design.

Page composition is stable and repeatable (no layout flicker once measurement is done).

When result.overflowBlocks is non-empty, the UI surfaces a warning (e.g. “Some content could not fit on a page cleanly”) so overflow is visible and actionable.

Verification

Compare new output vs old CSS-driven output for several example CVs:

Short CV (fits on 1 page).

CV with experience spanning multiple pages.

CV with many courses and skills.

Confirm previously observed bugs are gone:

No random blank pages between sections.

No orphaned competence header at bottom of a page.

Phase 4 – CSS Cleanup & Finalization

Tasks

Remove or neutralize CSS rules that implement logic (e.g. in print-geisli.css / print-layout.tsx):

break-before: page on blocks.

break-inside: avoid on large containers that conflict with JS pagination.

Keep only:

Physical page breaks (.cv-page { page-break-after: always; }).

Styling, margins, typography.

Requirements

Turning off old CSS break rules does not change pagination (only JS controls it).

Visual appearance remains consistent or improved.

Verification

Toggle old break CSS rules on/off in dev:

Rendering stays unchanged.

Print real PDFs and compare to target layout (your PDF reference).

**Phase 4 done:** Old break rules (break-before, break-inside, break-after) removed or neutralized in print-geisli.css and print-layout.tsx. Only physical page breaks in globals.css (`.cv-print-root .cv-page { page-break-after: always }`) and the JS pagination engine control layout. Cover row override in print-base.css ensures `.cv-cover-row .cover-page` has no break in print.