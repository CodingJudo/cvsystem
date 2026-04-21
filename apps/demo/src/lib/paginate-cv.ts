/**
 * Pure TypeScript pagination engine for CV print layout.
 * Arranges content blocks into pages based on measured heights and constraints.
 */

import type {
  PageConfig,
  HeaderFooterDef,
  HeaderFooterRef,
  SectionSpec,
  MeasurementsBySection,
  CvPaginationResult,
  PageLayout,
  OverflowDiagnostic,
  ContentBlockSpec,
} from '@/lib/print-layout-engine-types';

function blockLabel(section: SectionSpec, blockId: string): string {
  const block = section.contentBlocks.find((b) => b.id === blockId);
  if (!block) return blockId;
  return `${block.kind}:${blockId}`;
}

/**
 * Logs pagination result and measurements for debugging.
 * Pass `enabled = true` to activate (callers detect debug mode from their own environment).
 */
export function logPaginationDebug(
  result: CvPaginationResult,
  sections: SectionSpec[],
  measurements: MeasurementsBySection,
  pageConfig: PageConfig,
  headerDefs: HeaderFooterDef[],
  footerDefs: HeaderFooterDef[],
  enabled = false,
): void {
  if (!enabled) return;

  const sectionById = new Map(sections.map((s) => [s.id, s]));

  console.group('[CV Pagination] Page config');
  console.log('pageHeightPx', pageConfig.heightPx, 'marginTop', pageConfig.marginTopPx, 'marginBottom', pageConfig.marginBottomPx);
  console.log('content area (no header/footer)', pageConfig.heightPx - pageConfig.marginTopPx - pageConfig.marginBottomPx);
  console.groupEnd();

  console.group('[CV Pagination] Measurements by section');
  for (const [sectionId, byBlock] of Object.entries(measurements)) {
    const section = sectionById.get(sectionId);
    const entries = Object.entries(byBlock).map(([blockId, m]) => {
      const label = section ? blockLabel(section, blockId) : blockId;
      return `${label}=${Math.round(m.heightPx)}px`;
    });
    const total = Object.values(byBlock).reduce((s, m) => s + m.heightPx, 0);
    console.log(sectionId, `total=${Math.round(total)}px`, entries);
  }
  console.groupEnd();

  console.group('[CV Pagination] Pages and content');
  for (const page of result.pages) {
    const section = sectionById.get(page.sectionId);
    const headerDef = page.header ? headerDefs.find((h) => h.id === page.header!.defId) : undefined;
    const footerDef = page.footer ? footerDefs.find((f) => f.id === page.footer!.defId) : undefined;
    const limit = page.contentHeightLimitPx;
    const used = page.usedContentHeightPx;
    const slack = limit - used;

    console.group(`Page ${page.pageNumber} (${page.sectionId}) limit=${Math.round(limit)}px used=${Math.round(used)}px slack=${Math.round(slack)}px header=${headerDef?.heightPx ?? 0} footer=${footerDef?.heightPx ?? 0}`);

    for (const item of page.items) {
      const label = section ? blockLabel(section, item.blockId) : item.blockId;
      console.log(`  ${label} height=${Math.round(item.heightPx)}px y=${Math.round(item.yOffsetPx)}px`);
    }
    console.groupEnd();
  }
  console.groupEnd();

  if (result.overflowBlocks?.length) {
    console.warn('[CV Pagination] Overflow blocks', result.overflowBlocks);
  }
}

export function computeContentHeightLimitPx(
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

export function resolveHeader(
  section: SectionSpec,
  headerDefs: HeaderFooterDef[],
  pageIndexInSection: number,
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

export function resolveFooter(
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

/**
 * Determines which ContentBlockSpecs form an indivisible pagination unit (groupId, keepWithNext).
 */
export function buildAtomicUnit(
  blocks: ContentBlockSpec[],
  startIndex: number,
): { unitBlocks: ContentBlockSpec[]; nextIndex: number } {
  const first = blocks[startIndex];
  const unitBlocks: ContentBlockSpec[] = [first];

  if (first.groupId) {
    let i = startIndex + 1;
    while (i < blocks.length && blocks[i].groupId === first.groupId) {
      unitBlocks.push(blocks[i]);
      i++;
    }
    return { unitBlocks, nextIndex: startIndex + unitBlocks.length };
  }

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

  startNewPage();

  while (i < sectionBlocks.length) {
    const { unitBlocks, nextIndex } = buildAtomicUnit(sectionBlocks, i);

    let unitHeight = 0;
    for (const b of unitBlocks) {
      unitHeight += getBlockMeasurement(b, measurements);
    }

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
      const pageLimit = currentPage!.contentHeightLimitPx;

      if (unitHeight > pageLimit && anyNonSplittable) {
        overflowBlocks.push({
          blockId: unitBlocks[0].id,
          sectionId: section.id,
          requiredHeightPx: unitHeight,
          availableHeightPx: remainingHeight,
        });

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
