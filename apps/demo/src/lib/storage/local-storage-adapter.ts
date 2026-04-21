import type { CVFile } from '@/lib/file-formats/types';
import { migrateFile } from '@/lib/file-formats/cv-file.schema';
import type { CVStorageAdapter, CVStorageContext } from './cv-storage';

export const DEFAULT_CV_STORAGE_KEY = 'cv-data';

/**
 * Persists CV data in browser localStorage.
 *
 * - Reads through migrateFile() on load so old schema versions are upgraded.
 * - SSR-safe: all methods no-op when window is undefined.
 * - ctx (userId/cvId) is accepted but ignored — single-user, single-key.
 */
export class LocalStorageAdapter implements CVStorageAdapter {
  private key: string;

  constructor(key = DEFAULT_CV_STORAGE_KEY) {
    this.key = key;
  }

  async load(_ctx?: CVStorageContext): Promise<CVFile | null> {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return migrateFile(JSON.parse(raw)) as CVFile;
    } catch {
      return null;
    }
  }

  async save(file: CVFile, _ctx?: CVStorageContext): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(file));
    } catch {
      // Ignore quota errors etc.
    }
  }

  async clear(_ctx?: CVStorageContext): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignore
    }
  }
}
