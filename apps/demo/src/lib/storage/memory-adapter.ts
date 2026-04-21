import type { CVFile } from '@/lib/file-formats/types';
import type { CVStorageAdapter, CVStorageContext } from './cv-storage';

/**
 * In-memory storage adapter — primarily for tests.
 *
 * Holds a single CVFile in memory. No persistence across instances.
 * Does not require jsdom or a localStorage mock.
 */
export class MemoryAdapter implements CVStorageAdapter {
  private data: CVFile | null = null;

  async load(_ctx?: CVStorageContext): Promise<CVFile | null> {
    return this.data;
  }

  async save(file: CVFile, _ctx?: CVStorageContext): Promise<void> {
    this.data = file;
  }

  async clear(_ctx?: CVStorageContext): Promise<void> {
    this.data = null;
  }
}
