'use client';

/**
 * Renders all content blocks off-screen for measurement.
 * The DOM-based MeasurementService queries this container for [data-block-id] and reads heights.
 * No onMeasured callback; measurement is triggered by DomMeasurementService when the caller invokes measureAllBlocks.
 *
 * IMPORTANT: Section titles are included in measurement so pagination accounts for their height.
 */

import type { DomainCV, Locale, RenderSpec } from '@cvsystem/core';
import type { SectionSpec, PageConfig } from '@cvsystem/core';
import { BlockContent } from './print/block-content';
import { getBodySectionTitle } from '@cvsystem/core';

export interface PrintMeasurementRootProps {
  sections: SectionSpec[];
  pageConfig: PageConfig;
  cv: DomainCV;
  locale: Locale;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Theme class name (e.g. 'printTheme--light') to apply styles for accurate measurement */
  themeClassName?: string;
  /** Must match the spec used for final rendering so grouped skill rows measure correctly */
  spec?: RenderSpec | null;
}

const offScreenStyle: React.CSSProperties = {
  position: 'absolute',
  left: -99999,
  top: 0,
  pointerEvents: 'none',
};

export function PrintMeasurementRoot({
  sections,
  pageConfig,
  cv,
  locale,
  containerRef,
  themeClassName,
  spec,
}: PrintMeasurementRootProps) {
  const contentWidthPx =
    pageConfig.widthPx - pageConfig.marginLeftPx - pageConfig.marginRightPx;

  return (
    <div
      ref={containerRef}
      className={`print-measure-root ${themeClassName ?? ''}`}
      style={{
        ...offScreenStyle,
        width: contentWidthPx,
      }}
      aria-hidden
    >
      {sections.map((section) =>
        section.contentBlocks.map((block) => {
          const sectionTitle = getBodySectionTitle(
            sections,
            section.id,
            block.id,
            block,
            locale,
          );
          return (
            <div
              key={block.id}
              data-block-id={block.id}
              data-section-id={section.id}
            >
              {/* Include section titles in measurement so pagination accounts for their height */}
              {sectionTitle && (
                <h2 className="section-title body-section-title">
                  {sectionTitle}
                </h2>
              )}
              <BlockContent block={block} cv={cv} locale={locale} spec={spec} />
            </div>
          );
        }),
      )}
    </div>
  );
}
