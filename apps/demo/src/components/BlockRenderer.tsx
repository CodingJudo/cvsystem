'use client';

/**
 * Renders a single content block for the paginated print layout.
 * Maps block.kind to the correct React content (same logic as measurement root).
 * Use with blockIndex[item.blockId] and flow layout inside the page content area.
 */

import type { DomainCV, Locale, RenderSpec } from '@/domain/model/cv';
import type { ContentBlockSpec } from '@/lib/print-layout-engine-types';
import { BlockContent } from '@/components/print/block-content';

export interface BlockRendererProps {
  block: ContentBlockSpec;
  cv: DomainCV;
  locale: Locale;
  spec?: RenderSpec | null;
}

/**
 * Renders the block using BlockContent. Layout uses normal flow; yOffsetPx from
 * PlacedBlock is advisory/debug and may be ignored.
 */
export function BlockRenderer({ block, cv, locale, spec }: BlockRendererProps) {
  return <BlockContent block={block} cv={cv} locale={locale} spec={spec} />;
}
