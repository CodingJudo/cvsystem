/**
 * File Export Utilities
 * 
 * Handles exporting CV data to Geisli JSON format.
 */

import type { DomainCV } from '@/domain/model/cv';
import type { GeisliCVFile, GeisliCVMetadata, RawCinodeData } from './types';

/**
 * Create a Geisli CV file structure
 */
export function createGeisliFile(
  cv: DomainCV,
  options: {
    metadata?: Partial<GeisliCVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): GeisliCVFile {
  const now = new Date().toISOString();
  
  const metadata: GeisliCVMetadata = {
    savedAt: now,
    importSource: options.metadata?.importSource ?? null,
    importedAt: options.metadata?.importedAt ?? null,
    originalCinodeId: options.metadata?.originalCinodeId ?? null,
    locales: cv.locales,
    ...options.metadata,
  };

  return {
    format: 'geisli-cv',
    version: '1.0',
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
    metadata?: Partial<GeisliCVMetadata>;
    rawCinode?: RawCinodeData | null;
    pretty?: boolean;
  } = {}
): string {
  const file = createGeisliFile(cv, options);
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

/**
 * Download CV as a JSON file
 */
export function downloadCvAsJson(
  cv: DomainCV,
  options: {
    filename?: string;
    metadata?: Partial<GeisliCVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): void {
  const json = serializeToJson(cv, {
    metadata: options.metadata,
    rawCinode: options.rawCinode,
    pretty: true,
  });
  
  const filename = options.filename ?? generateFilename(cv);
  
  // Create blob and download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Copy CV JSON to clipboard
 */
export async function copyCvToClipboard(
  cv: DomainCV,
  options: {
    metadata?: Partial<GeisliCVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): Promise<boolean> {
  try {
    const json = serializeToJson(cv, {
      metadata: options.metadata,
      rawCinode: options.rawCinode,
      pretty: true,
    });
    
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
