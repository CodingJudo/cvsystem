export type { StorageAdapter, SaveOptions } from './types';
export { getStorageAdapter } from './factory';

export type { CVStorageAdapter, CVStorageContext } from './cv-storage';
export { LocalStorageAdapter, DEFAULT_CV_STORAGE_KEY } from './local-storage-adapter';
export { MemoryAdapter } from './memory-adapter';
