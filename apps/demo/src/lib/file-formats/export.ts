/**
 * File Export Utilities
 *
 * Handles exporting CV data to the cv-system JSON format.
 */

import type { DomainCV } from '@/domain/model/cv';
import type { CVFile, CVMetadata, RawCinodeData } from './types';
import { CURRENT_SCHEMA_VERSION } from './cv-file.schema';

/**
 * Create a CV file structure
 */
export function createCVFile(
  cv: DomainCV,
  options: {
    metadata?: Partial<CVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): CVFile {
  const now = new Date().toISOString();
  
  const metadata: CVMetadata = {
    savedAt: now,
    importSource: options.metadata?.importSource ?? null,
    importedAt: options.metadata?.importedAt ?? null,
    originalCinodeId: options.metadata?.originalCinodeId ?? null,
    locales: cv.locales,
    ...options.metadata,
  };

  return {
    format: 'cv-system',
    version: '1.0',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    metadata,
    cv,
    rawCinode: options.rawCinode ?? null,
  };
}

/**
 * Serialize CV data to JSON string
 */
export function serializeToJson(
  cv: DomainCV,
  options: {
    metadata?: Partial<CVMetadata>;
    rawCinode?: RawCinodeData | null;
    pretty?: boolean;
  } = {}
): string {
  const file = createCVFile(cv, options);
  return JSON.stringify(file, null, options.pretty !== false ? 2 : 0);
}

/**
 * Generate a filename for the CV export
 */
export function generateFilename(cv: DomainCV): string {
  const name = [cv.name.first, cv.name.last]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') || 'cv';
  
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return `${name}-cv-${date}.json`;
}

