/**
 * Brand configuration.
 *
 * BrandConfig interface and neutral defaults live in @cvsystem/core.
 * The active brand is imported from @cvsystem/example-brand.
 * To use a custom brand, swap this import for your own brand package.
 */

export type { BrandConfig } from '@cvsystem/core';
export { DEFAULT_BRAND_CONFIG } from '@cvsystem/core';

/**
 * Active brand config for this app.
 * This demo uses the example brand — a minimal reference implementation.
 */
export { brandConfig } from '@cvsystem/example-brand';
