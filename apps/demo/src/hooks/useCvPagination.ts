'use client';

/**
 * Canonical pagination hook: builds sections from CV, measures blocks, runs pagination.
 * Consumer must render PrintMeasurementRoot with the returned sections and the same
 * containerRef used to create the MeasurementService so measurement can complete.
 */

import { useEffect, useState, startTransition } from 'react';
import { buildSectionsFromCv } from '@/lib/build-sections-from-cv';
import { attachHeaderFooterToSections } from '@/lib/print-theme-config';
import { paginateCv, logPaginationDebug } from '@/lib/paginate-cv';
import { applyRenderSpec } from '@/lib/render-spec';
import type { DomainCV, RenderSpec } from '@/domain/model/cv';
import type {
  SectionSpec,
  PageConfig,
  HeaderFooterDef,
  MeasurementsBySection,
  CvPaginationResult,
  BlockIndex,
  PaginationConfig,
} from '@/lib/print-layout-engine-types';
import type { Locale } from '@/domain/model/cv';
import type { MeasurementService } from '@/lib/measurement-service';

export interface UseCvPaginationOptions {
  cv: DomainCV;
  pageConfig: PageConfig;
  /** Theme id (e.g. print-light, or a brand theme like print-geisli); used to attach header/footer refs to body sections */
  themeId: string;
  headers: HeaderFooterDef[];
  footers: HeaderFooterDef[];
  measurementService: MeasurementService;
  /** Pagination granularity (e.g. paragraph mode for splitting role descriptions). Default: paragraph. */
  paginationConfig?: PaginationConfig;
  /** Locale used when splitting descriptions into paragraphs; should match render locale. */
  locale?: Locale;
  /** Active RenderSpec to apply before building sections. null = full CV, no filtering. */
  spec?: RenderSpec | null;
}

export interface UseCvPaginationResult {
  result: CvPaginationResult | null;
  blockIndex: BlockIndex | null;
  /** Sections built from CV; use these to render PrintMeasurementRoot so measurement can run. */
  sections: SectionSpec[];
  loading: boolean;
  error: Error | null;
}

export function useCvPagination(
  options: UseCvPaginationOptions,
): UseCvPaginationResult {
  const {
    cv,
    pageConfig,
    themeId,
    headers,
    footers,
    measurementService,
    paginationConfig,
    locale,
    spec,
  } = options;
  const [blockIndex, setBlockIndex] = useState<BlockIndex | null>(null);
  const [sections, setSections] = useState<SectionSpec[]>([]);
  const [result, setResult] = useState<CvPaginationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const resolvedLocale = locale ?? cv.locales?.[0] ?? 'sv';
    const config: PaginationConfig = {
      granularity: paginationConfig?.granularity ?? 'paragraph',
      locale: resolvedLocale,
    };

    // Apply spec filtering before building sections so hidden items are excluded from layout.
    const rendered = applyRenderSpec(cv, spec ?? null, resolvedLocale);
    const filteredCv: DomainCV = {
      ...cv,
      roles: rendered.roles,
      hobbyProjects: rendered.hobbyProjects,
      trainings: rendered.trainings,
      educations: rendered.educations,
      commitments: rendered.commitments,
    };

    const { sections: builtSections, blockIndex: builtIndex } =
      buildSectionsFromCv(filteredCv, config);
    const sectionsWithHeaderFooter = attachHeaderFooterToSections(
      builtSections,
      themeId,
    );
    startTransition(() => {
      setSections(sectionsWithHeaderFooter);
      setBlockIndex(builtIndex);
      setResult(null);
      setError(null);
      setLoading(builtSections.length === 0 ? false : true);
    });
  }, [cv, themeId, paginationConfig?.granularity, locale, spec]);

  useEffect(() => {
    if (sections.length === 0) {
      startTransition(() => {
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const m: MeasurementsBySection =
          await measurementService.measureAllBlocks(sections, pageConfig);
        if (cancelled) return;

        const paginationResult = paginateCv(
          pageConfig,
          sections,
          headers,
          footers,
          m,
        );

        const debugEnabled = typeof window !== 'undefined' && (
          new URLSearchParams(window.location.search).get('debugCvPagination') === '1' ||
          (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_CV_PAGINATION') === '1') ||
          (window as unknown as { __DEBUG_CV_PAGINATION?: boolean }).__DEBUG_CV_PAGINATION === true
        );
        logPaginationDebug(
          paginationResult,
          sections,
          m,
          pageConfig,
          headers,
          footers,
          debugEnabled,
        );

        if (!cancelled) {
          setResult(paginationResult);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sections, pageConfig, headers, footers, measurementService]);

  return { result, blockIndex, sections, loading, error };
}
