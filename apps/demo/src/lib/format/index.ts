/**
 * Shared display utilities.
 *
 * Pure functions for formatting CV data for display. No React, no browser APIs.
 */

import type { BilingualText, Locale } from '@/domain/model/cv';

/**
 * Return the localised string from a BilingualText object,
 * falling back to the other locale if the requested one is absent.
 */
export function getBilingualText(text: BilingualText | null | undefined, locale: Locale): string {
  if (!text) return '';
  const value = text[locale];
  if (value) return value;
  const fallback = locale === 'sv' ? text.en : text.sv;
  return fallback ?? '';
}

/**
 * Format an ISO date string for display (e.g. "jan 2024").
 * Returns an empty string for null/undefined input.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
