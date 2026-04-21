import type { CVFile, CVMetadata, RawCinodeData } from '@/lib/file-formats/types';
import type { DomainCV } from '@/domain/model/cv';

export interface SaveOptions {
  metadata?: Partial<CVMetadata>;
  rawCinode?: RawCinodeData | null;
}

/**
 * Storage adapter contract for the Save button.
 *
 * Implement this interface to plug in a custom persistence backend.
 * Select the active adapter via NEXT_PUBLIC_STORAGE_ADAPTER (see .env.sample).
 *
 * - save()  is required
 * - load()  is optional — adapters that support round-trip persistence implement it
 */
export interface StorageAdapter {
  /** Stable identifier shown in logs. e.g. 'json-download' | 'firebase' */
  readonly id: string;

  /** Persist the CV. Called when the user clicks Save. */
  save(cv: DomainCV, options: SaveOptions): Promise<void>;

  /**
   * Load the most recently saved CV, or null if unavailable / not supported.
   * Implementing this is optional.
   */
  load?(): Promise<CVFile | null>;
}
