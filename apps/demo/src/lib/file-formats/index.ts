/**
 * File Format Utilities
 *
 * Re-exports all file format related utilities for convenient importing.
 * Browser-specific utilities (File, Blob, localStorage) are exported from
 * this barrel but live in browser.ts — do not import them in core code.
 */

// Types
export type {
  CVFile,
  CVMetadata,
  FileValidationError,
  RawCinodeData,
  DetectedFormat,
  ImportResult,
  ImportFileInfo,
} from './types';

// Detection
export {
  detectFormat,
  isValidCVFile,
  detectCinodeLocale,
  categorizeFilesByLocale,
} from './detect';

// Import — core (pure, no browser APIs)
export {
  importFromFileInfos,
  importFromJson,
} from './import';

// Import — browser surface (File, FileReader, localStorage, fetch)
export {
  validateFile,
  validateFiles,
  readFileAsJson,
  readFilesAsJson,
  importFiles,
  loadDemoCV,
  saveImportHistory,
  getImportHistory,
  getLastImport,
  clearImportHistory,
} from './browser';

// History types
export { IMPORT_HISTORY_KEY, type ImportHistoryEntry } from './types';

// Export — core (pure)
export {
  createCVFile,
  serializeToJson,
  generateFilename,
} from './export';

// Export — browser surface (Blob, document, navigator)
export {
  downloadCvAsJson,
  copyCvToClipboard,
} from './browser';
