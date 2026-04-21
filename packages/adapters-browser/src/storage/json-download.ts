import type { DomainCV } from '@cvsystem/core';
import type { CVFile } from '@cvsystem/core';
import { downloadCvAsJson } from '../file-formats-browser';
import type { StorageAdapter, SaveOptions } from '@cvsystem/core';

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
