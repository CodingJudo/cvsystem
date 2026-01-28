/**
 * File Format Detection
 * 
 * Utilities to detect whether a JSON file is Geisli CV format or Cinode format.
 */

import type { DetectedFormat, GeisliCVFile, ImportFileInfo } from './types';

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

  // Check for Geisli format (has format: "geisli-cv")
  if (data.format === 'geisli-cv') {
    return 'geisli-cv';
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
 * Validate that a parsed object matches the Geisli CV format structure
 */
export function isValidGeisliFile(data: unknown): data is GeisliCVFile {
  if (!isObject(data)) return false;
  
  // Required fields
  if (data.format !== 'geisli-cv') return false;
  if (typeof data.version !== 'string') return false;
  if (!isObject(data.metadata)) return false;
  if (!isObject(data.cv)) return false;

  // Validate metadata has required fields
  const metadata = data.metadata as Record<string, unknown>;
  if (typeof metadata.savedAt !== 'string') return false;
  if (!Array.isArray(metadata.locales)) return false;

  // Validate CV has required fields
  const cv = data.cv as Record<string, unknown>;
  if (typeof cv.id !== 'string') return false;
  if (!Array.isArray(cv.locales)) return false;
  if (!isObject(cv.name)) return false;
  if (!Array.isArray(cv.skills)) return false;
  if (!Array.isArray(cv.roles)) return false;

  return true;
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
