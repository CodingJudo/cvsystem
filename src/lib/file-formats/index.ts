/**
 * File Format Utilities
 * 
 * Re-exports all file format related utilities for convenient importing.
 */

// Types
export type {
  GeisliCVFile,
  GeisliCVMetadata,
  RawCinodeData,
  DetectedFormat,
  ImportResult,
  ImportFileInfo,
} from './types';

// Detection
export {
  detectFormat,
  isValidGeisliFile,
  detectCinodeLocale,
  categorizeFilesByLocale,
} from './detect';

// Import
export {
  readFileAsJson,
  readFilesAsJson,
  importFiles,
  importFromJson,
  loadDemoCV,
  validateFile,
  validateFiles,
  saveImportHistory,
  getImportHistory,
  getLastImport,
  clearImportHistory,
  type FileValidationError,
} from './import';

// History types
export { IMPORT_HISTORY_KEY, type ImportHistoryEntry } from './types';

// Export
export {
  createGeisliFile,
  serializeToJson,
  generateFilename,
  downloadCvAsJson,
  copyCvToClipboard,
} from './export';
