/**
 * CV File Format Types
 *
 * Our custom JSON format for saving/loading CV data.
 * Supports metadata, the DomainCV model, and optional raw Cinode data.
 */

import type { DomainCV } from '../domain/model/cv';

/**
 * Metadata about the saved CV file
 */
export interface CVMetadata {
  /** When the file was saved */
  savedAt: string;
  /** Source of the original import (if applicable) */
  importSource: 'cinode' | 'manual' | null;
  /** When the data was originally imported */
  importedAt: string | null;
  /** ID from original Cinode export (if applicable) */
  originalCinodeId: string | null;
  /** Available locales in this CV */
  locales: ('sv' | 'en')[];
}

/**
 * Raw Cinode data preserved for reference/re-import
 */
export interface RawCinodeData {
  sv: unknown;
  en: unknown;
}

/**
 * The CV file format
 */
export interface CVFile {
  /** Format identifier — new files write 'cv-system'; 'geisli-cv' is accepted on import for backwards compatibility */
  format: 'cv-system' | 'geisli-cv';
  /** Format version for future compatibility */
  version: '1.0';
  /** Schema version for migration. Defaults to 1 when absent (legacy files). */
  schemaVersion?: number;
  /** File metadata */
  metadata: CVMetadata;
  /** The CV data */
  cv: DomainCV;
  /** Original Cinode data (optional, for reference) */
  rawCinode?: RawCinodeData | null;
}

/**
 * Detected file format
 */
export type DetectedFormat = 'cv-system' | 'cinode' | 'unknown';

/**
 * Result of importing a file
 */
export interface ImportResult {
  success: boolean;
  /** The imported CV (if successful) */
  cv?: DomainCV;
  /** File metadata (if cv-system format) */
  metadata?: CVMetadata;
  /** Raw Cinode data (preserved for future conflict resolution) */
  rawCinode?: RawCinodeData | null;
  /** Warnings during import */
  warnings: string[];
  /** Errors during import */
  errors: string[];
  /** What format was detected */
  detectedFormat: DetectedFormat;
}

/**
 * Validation error for a single browser File object
 */
export interface FileValidationError {
  file: string;
  error: string;
}

/**
 * Information about imported files (for multi-file Cinode import)
 */
export interface ImportFileInfo {
  name: string;
  size: number;
  content: unknown;
  locale?: 'sv' | 'en' | null;
}

/**
 * Import history entry (stored in localStorage)
 */
export interface ImportHistoryEntry {
  timestamp: string;
  format: DetectedFormat;
  source: 'file' | 'demo';
  files?: string[];
  cvName?: string;
}

/**
 * Key for localStorage import history
 */
export const IMPORT_HISTORY_KEY = 'cv-import-history';
