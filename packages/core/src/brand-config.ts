/**
 * Brand configuration types and neutral defaults.
 *
 * Brand-specific overrides live in brands/<name>/.
 */

// ---- Theme layout types ----

/** A header or footer element definition used by the print layout engine. */
export interface ThemeHeaderFooterDef {
  id: string;
  heightPx: number;
  /** Template identifier used by the React renderer to pick the correct component. */
  templateId: string;
  repeatOn: 'allPages' | 'firstPageOnly' | 'exceptFirstPage';
}

/**
 * Layout configuration for a single print theme.
 * Brands declare this per theme-id in `BrandConfig.themeLayoutConfigs`.
 * The print layout engine merges these values with its own defaults.
 */
export interface ThemeLayoutConfig {
  /** Header element definitions for this theme (empty = no header). */
  headers?: ThemeHeaderFooterDef[];
  /** Footer element definitions for this theme (empty = no footer). */
  footers?: ThemeHeaderFooterDef[];
  /**
   * Page top margin in px — must match the theme's .cv-page padding-top.
   * 20mm at 96dpi = ~76px.
   */
  marginTopPx?: number;
  /**
   * Page bottom margin in px — typically matches the footer height.
   * The paginator reserves this space so content doesn't overflow into the footer.
   */
  marginBottomPx?: number;
  /**
   * Block types that should always start on a new page (e.g. 'education', 'competence').
   * The layout sets data-start-on-new-page="true" on those block wrappers.
   */
  blockStartsNewPage?: string[];
  /**
   * Whether to show a section header above the cover block.
   * Defaults to true when not set; set to false for full-bleed cover designs.
   */
  showHeaderOnCover?: boolean;
  /**
   * Whether to show a footer below the cover block.
   * Defaults to true when not set; set to false for brands with a dedicated cover design.
   */
  showFooterOnCover?: boolean;
}

// ---- Brand config ----

export interface BrandConfig {
  /** Display name shown in page titles and UI (e.g. "Geisli") */
  name: string;
  /** Default print theme ID (must match a theme in /public/themes/cv/) */
  defaultPrintThemeId: string;
  /** Path to header/cover logo served from /public (null = no logo) */
  logoPath: string | null;
  /** Path to footer logo served from /public (null = no footer logo) */
  footerLogoPath: string | null;
  /**
   * Per-theme layout configuration for themes owned by this brand.
   * Key = theme ID (e.g. 'print-geisli'); value = layout overrides.
   * The print engine uses these values instead of hardcoded theme checks.
   */
  themeLayoutConfigs?: Record<string, ThemeLayoutConfig>;
}

/** Neutral base defaults — no logo, light theme. */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  name: 'CV System',
  defaultPrintThemeId: 'print-light',
  logoPath: null,
  footerLogoPath: null,
};
