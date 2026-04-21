// @cvsystem/adapters-browser — public API

// File format browser utilities (File, FileReader, Blob, fetch, localStorage)
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
  downloadCvAsJson,
  copyCvToClipboard,
} from './file-formats-browser';

// Storage adapters
export { LocalStorageAdapter, DEFAULT_CV_STORAGE_KEY } from './storage/local-storage-adapter';
export { JsonDownloadAdapter } from './storage/json-download';
export { getStorageAdapter } from './storage/factory';
