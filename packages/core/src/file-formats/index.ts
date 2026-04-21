/**
 * @cvsystem/core — file-formats public API
 *
 * Browser-specific utilities (File, Blob, localStorage, fetch) live in
 * @cvsystem/adapters-browser, not here.
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
  ImportHistoryEntry,
} from './types';
// Value export (const, not a type)
export { IMPORT_HISTORY_KEY } from './types';
// Schema + migration
export { migrateFile } from './cv-file.schema';

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
export type { CinodeExtractor, ImportOptions } from './import';

// Export — core (pure)
export {
  createCVFile,
  serializeToJson,
  generateFilename,
} from './export';
