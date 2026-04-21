/**
 * File Format Detection
 *
 * Utilities to detect whether a JSON file is CV System format or Cinode format.
 */

import type { DetectedFormat, CVFile, ImportFileInfo } from './types';
import { CVFileSchema } from './cv-file.schema';

/**
 * Type guard for objects
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Detect the format of a parsed JSON object
 */
export function detectFormat(data: unknown): DetectedFormat {
  if (!isObject(data)) return 'unknown';

  // Check for cv-system format (current) or legacy 'geisli-cv' identifier
  if (data.format === 'cv-system' || data.format === 'geisli-cv') {
    return 'cv-system';
  }

  // Check for Cinode format (has resume.blocks array)
  if (isObject(data.resume)) {
    const resume = data.resume as Record<string, unknown>;
    if (Array.isArray(resume.blocks)) {
      return 'cinode';
    }
  }

  return 'unknown';
}

/**
 * Validate that a parsed object matches the CV System format structure.
 * Delegates to CVFileSchema for full structural validation.
 */
export function isValidCVFile(data: unknown): data is CVFile {
  if (!isObject(data) || (data.format !== 'cv-system' && data.format !== 'geisli-cv')) return false;
  return CVFileSchema.safeParse(data).success;
}

/**
 * Detect locale from a Cinode JSON file
 */
export function detectCinodeLocale(data: unknown): 'sv' | 'en' | null {
  if (!isObject(data)) return null;

  const languageCountry = data.languageCountry;
  if (typeof languageCountry === 'string') {
    if (languageCountry === 'se' || languageCountry === 'sv') return 'sv';
    if (languageCountry === 'en' || languageCountry === 'gb' || languageCountry === 'us') return 'en';
  }

  // Fallback: check language field
  const language = data.language;
  if (typeof language === 'string') {
    if (language.toLowerCase().includes('svenska')) return 'sv';
    if (language.toLowerCase().includes('english')) return 'en';
  }

  return null;
}

/**
 * Categorize multiple files by their detected locale (for Cinode multi-file import)
 */
export function categorizeFilesByLocale(files: ImportFileInfo[]): {
  sv: ImportFileInfo | null;
  en: ImportFileInfo | null;
  unknown: ImportFileInfo[];
} {
  const result: {
    sv: ImportFileInfo | null;
    en: ImportFileInfo | null;
    unknown: ImportFileInfo[];
  } = {
    sv: null,
    en: null,
    unknown: [],
  };

  for (const file of files) {
    const locale = detectCinodeLocale(file.content);
    file.locale = locale;
    
    if (locale === 'sv' && !result.sv) {
      result.sv = file;
    } else if (locale === 'en' && !result.en) {
      result.en = file;
    } else {
      result.unknown.push(file);
    }
  }

  return result;
}
