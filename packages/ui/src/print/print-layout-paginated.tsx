'use client';

/**
 * Thin print layout that uses the pagination engine.
 * Renders the measurement root when sections exist, then paginated pages with BlockRenderer.
 * Uses print-base.css for content styles; theme class is applied by the preview container.
 */

import { Fragment, useRef, useMemo } from 'react';
import { useBrandConfig } from '../contexts/brand-config-context';
import type { DomainCV, Locale, RenderSpec } from '@cvsystem/core';
import type {
  PageConfig,
  SectionSpec,
  ContentBlockSpec,
} from '@cvsystem/core';
import { getPrintThemeConfig, getPageConfigForTheme } from '../lib/print-theme-config';
import { DomMeasurementService } from '../lib/measurement-service-dom';
import { useCvPagination } from '../hooks/useCvPagination';
import { PrintMeasurementRoot } from '../components/PrintMeasurementRoot';
import { BlockRenderer } from '../components/BlockRenderer';
import { CoverPage } from './cover-page';
import { getBodySectionTitle } from '@cvsystem/core';

const PAGE_CONFIG: PageConfig = {
  widthPx: 794,
  heightPx: 1123,
  marginTopPx: 40,
  marginBottomPx: 40,
  marginLeftPx: 40,
  marginRightPx: 40,
};

export interface PaginatedPrintLayoutProps {
  cv: DomainCV;
  locale: Locale;
  themeId?: string;
  /** Theme class (e.g. printTheme--light) for cover sidebar layout; when set, first page uses two-column cover */
  themeClassName?: string;
  /** Active RenderSpec to apply. Controls skill grouping and item visibility. null = default rendering. */
  spec?: RenderSpec | null;
}

export function PaginatedPrintLayout({
  cv,
  locale,
  themeId,
  themeClassName,
  spec = null,
}: PaginatedPrintLayoutProps) {
  const brandConfig = useBrandConfig();
  const resolvedThemeId = themeId ?? brandConfig.defaultPrintThemeId;

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef.current is intentionally read lazily inside the factory closure, not as a dep
  const measurementService = useMemo(
    () => new DomMeasurementService(() => containerRef.current),
    [],
  );

  const { headers, footers } = getPrintThemeConfig(resolvedThemeId, brandConfig);
  const pageConfig = useMemo(
    () => getPageConfigForTheme(resolvedThemeId, brandConfig, PAGE_CONFIG),
    [brandConfig, resolvedThemeId],
  );
  const { result, blockIndex, sections, loading, error } = useCvPagination({
    cv,
    pageConfig,
    themeId: resolvedThemeId,
    headers,
    footers,
    measurementService,
    locale,
    spec,
  });

  const hasOverflow =
    result?.overflowBlocks != null && result.overflowBlocks.length > 0;

  return (
    <>
      {/* Measurement root must stay mounted while sections exist so DOM measurement can run */}
      {sections.length > 0 && (
        <PrintMeasurementRoot
          sections={sections}
          pageConfig={pageConfig}
          cv={cv}
          locale={locale}
          containerRef={containerRef}
          themeClassName={themeClassName}
          spec={spec}
        />
      )}

      {error && (
        <div className="text-destructive p-4" role="alert">
          Error generating layout: {error.message}
        </div>
      )}

      {!error && (loading || !result || !blockIndex) && (
        <div className="p-4 text-muted-foreground" aria-busy="true">
          Generating layout…
        </div>
      )}

      {!error && !loading && result && blockIndex && (
        <div className="cv-print-root" lang={locale}>
          {hasOverflow && (
            <div
              className="text-amber-600 dark:text-amber-400 text-sm p-2 mb-2 print:hidden"
              role="status"
            >
              Some content could not fit on a page cleanly. It has been placed
              on its own page.
            </div>
          )}

          {result.pages.map((page) => {
            const isCoverPage =
              page.pageNumber === 1 &&
              page.sectionId === 'cover' &&
              page.items[0]?.blockId === 'cover-main' &&
              themeClassName;

            if (isCoverPage) {
              const coverBlock = blockIndex[page.items[0].blockId];
              return (
                <div
                  key={page.pageNumber}
                  className="cv-cover-row"
                  data-page-number={page.pageNumber}
                  data-section-id={page.sectionId}
                >
                  <CoverPage
                    cv={cv}
                    locale={locale}
                    themeClassName={themeClassName}
                  />
                  <div className="cv-cover-main-wrapper">
                    {coverBlock && (
                      <BlockRenderer
                        block={coverBlock}
                        cv={cv}
                        locale={locale}
                        spec={spec}
                      />
                    )}
                  </div>
                </div>
              );
            }

            const headerDef = page.header
              ? headers.find((h) => h.id === page.header!.defId)
              : undefined;
            const footerDef = page.footer
              ? footers.find((f) => f.id === page.footer!.defId)
              : undefined;

            return (
              <div
                key={page.pageNumber}
                className="cv-page print-cv"
                data-page-number={page.pageNumber}
                data-section-id={page.sectionId}
                style={
                  (headerDef ?? footerDef)
                    ? {
                        ['--cv-page-header-height' as string]: headerDef
                          ? `${headerDef.heightPx}px`
                          : undefined,
                        ['--cv-page-footer-height' as string]: footerDef
                          ? `${footerDef.heightPx}px`
                          : undefined,
                      }
                    : undefined
                }
              >
                {page.header && (
                  <header
                    className="cv-page-header"
                    data-template-id={page.header.defId}
                    aria-label="Page header"
                  >
                    <span className="cv-page-header-text">Header</span>
                  </header>
                )}
                <div className="cv-page-content">
                  {page.items.map((item) => {
                    const block = blockIndex[item.blockId];
                    if (!block) return null;
                    const sectionTitle = getBodySectionTitle(
                      sections,
                      page.sectionId,
                      item.blockId,
                      block,
                      locale,
                    );
                    return (
                      <Fragment key={item.blockId}>
                        {sectionTitle && (
                          <h2 className="section-title body-section-title">
                            {sectionTitle}
                          </h2>
                        )}
                        <BlockRenderer
                          block={block}
                          cv={cv}
                          locale={locale}
                          spec={spec}
                        />
                      </Fragment>
                    );
                  })}
                </div>
                {page.footer && (
                  <footer
                    className="cv-page-footer"
                    data-template-id={page.footer.defId}
                    aria-label="Page footer"
                  >
                    <div className="cv-page-footer__inner">
                      <span
                        className="cv-page-footer__page-number"
                        aria-hidden="true"
                      >
                        {page.pageNumber}
                      </span>
                      {brandConfig.footerLogoPath && (
                        <img
                          className="cv-page-footer__logo"
                          src={brandConfig.footerLogoPath}
                          alt=""
                          width={75}
                          height={75}
                        />
                      )}
                    </div>
                  </footer>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
