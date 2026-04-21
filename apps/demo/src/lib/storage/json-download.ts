import type { DomainCV } from '@/domain/model/cv';
import type { CVFile } from '@/lib/file-formats/types';
import { downloadCvAsJson } from '@/lib/file-formats/browser';
import type { StorageAdapter, SaveOptions } from './types';

/**
 * Default adapter: triggers a browser file download of the CV as JSON.
 * No configuration required.
 */
export class JsonDownloadAdapter implements StorageAdapter {
  readonly id = 'json-download';

  async save(cv: DomainCV, options: SaveOptions): Promise<void> {
    downloadCvAsJson(cv, {
      metadata: options.metadata,
      rawCinode: options.rawCinode,
    });
  }

  async load(): Promise<CVFile | null> {
    return null; // Browser download is write-only
  }
}
