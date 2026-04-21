/**
 * Block types for print layout (Phase 2+).
 * Used for page-break config and theme targeting.
 *
 * All theme-specific values come from brandConfig.themeLayoutConfigs so no
 * Geisli-specific constants live in this file.
 */

import { brandConfig } from '@/lib/brand-config';

export type BlockType =
  | 'experience'
  | 'education'
  | 'courses-certification'
  | 'commitments'
  | 'competence';

/**
 * Returns whether the given block should start on a new page for the theme.
 * Block list comes from brandConfig.themeLayoutConfigs[themeId].blockStartsNewPage.
 */
export function blockStartsNewPage(themeId: string | undefined, blockType: BlockType): boolean {
  if (!themeId) return false;
  const list = brandConfig.themeLayoutConfigs?.[themeId]?.blockStartsNewPage;
  return Array.isArray(list) && list.includes(blockType);
}

/**
 * Returns whether a section header should be shown on the cover page for this theme.
 * Defaults to true when the theme has no explicit config.
 */
export function showHeaderOnCover(themeId: string | undefined): boolean {
  if (!themeId) return true;
  const value = brandConfig.themeLayoutConfigs?.[themeId]?.showHeaderOnCover;
  return value !== false;
}

/**
 * Returns whether a footer should be shown on the cover page for this theme.
 * Defaults to true when the theme has no explicit config.
 */
export function showFooterOnCover(themeId: string | undefined): boolean {
  if (!themeId) return true;
  const value = brandConfig.themeLayoutConfigs?.[themeId]?.showFooterOnCover;
  return value !== false;
}
