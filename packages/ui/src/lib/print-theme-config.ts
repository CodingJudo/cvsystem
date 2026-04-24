/**
 * Theme-controlled print config (header/footer definitions).
 * Pagination uses this to know which headers/footers exist.
 * Sections reference HeaderFooterDef.id via SectionSpec.header / SectionSpec.footer.
 *
 * Layout values (footer height, margins) are declared per theme in BrandConfig.themeLayoutConfigs
 * (brands/geisli/src/index.ts) so no Geisli-specific code lives here.
 */

import type {
  PrintThemeConfig,
  SectionSpec,
  HeaderFooterRef,
  HeaderFooterDef,
  PageConfig,
} from '@cvsystem/core';
import type { BrandConfig } from '@cvsystem/core';

/**
 * Returns print-specific configuration for the given theme.
 * Header/footer definitions come from brandConfig.themeLayoutConfigs.
 */
export function getPrintThemeConfig(themeId: string, brandConfig: BrandConfig): PrintThemeConfig {
  const layout = brandConfig.themeLayoutConfigs?.[themeId];
  if (layout) {
    return {
      headers: (layout.headers ?? []) as HeaderFooterDef[],
      footers: (layout.footers ?? []) as HeaderFooterDef[],
    };
  }
  return { headers: [], footers: [] };
}

/**
 * Returns page config for pagination. Margins come from brandConfig.themeLayoutConfigs;
 * base values are used for themes with no brand layout config.
 */
export function getPageConfigForTheme(themeId: string, brandConfig: BrandConfig, base: PageConfig): PageConfig {
  const layout = brandConfig.themeLayoutConfigs?.[themeId];
  if (!layout) return base;
  return {
    ...base,
    ...(layout.marginTopPx !== undefined ? { marginTopPx: layout.marginTopPx } : {}),
    ...(layout.marginBottomPx !== undefined ? { marginBottomPx: layout.marginBottomPx } : {}),
  };
}

/** Section types that use body header/footer (not cover). */
const BODY_SECTION_TYPES = new Set([
  'experience',
  'hobbyProjects',
  'educationCourses',
  'commitments',
  'competence',
]);

/**
 * Attaches header/footer refs to body sections from the theme config.
 * Cover section is left without header/footer; body sections get the theme's first header/footer when available.
 */
export function attachHeaderFooterToSections(
  sections: SectionSpec[],
  themeId: string,
  brandConfig: BrandConfig,
): SectionSpec[] {
  const config = getPrintThemeConfig(themeId, brandConfig);
  const firstHeader = config.headers[0];
  const firstFooter = config.footers[0];
  if (!firstHeader && !firstFooter) return sections;

  return sections.map((section) => {
    if (!BODY_SECTION_TYPES.has(section.type)) return section;
    const header: HeaderFooterRef | undefined = firstHeader
      ? { defId: firstHeader.id, repeatOn: firstHeader.repeatOn }
      : undefined;
    const footer: HeaderFooterRef | undefined = firstFooter
      ? { defId: firstFooter.id, repeatOn: firstFooter.repeatOn }
      : undefined;
    return { ...section, header, footer };
  });
}
