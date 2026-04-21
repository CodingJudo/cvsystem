import type { CVFile } from '@/lib/file-formats/types';

/**
 * Optional context for multi-user / multi-document storage adapters.
 * LocalStorageAdapter ignores these; a FirestoreAdapter would use them.
 */
export interface CVStorageContext {
  userId?: string;
  cvId?: string;
}

/**
 * Pluggable persistence backend for auto-save CV data.
 *
 * All methods are async to support cloud adapters. The interface is intentionally
 * kept narrow — debouncing, conflict resolution, and retry logic are adapter
 * implementation details, not part of the contract.
 *
 * Ship a LocalStorageAdapter for the default case. Pass a MemoryAdapter in tests.
 * A future FirestoreAdapter can implement subscribe() for real-time sync.
 */
export interface CVStorageAdapter {
  /** Load the most recently saved CV file, or null if none exists. */
  load(ctx?: CVStorageContext): Promise<CVFile | null>;

  /** Persist a CV file. The adapter decides the storage key/path from ctx. */
  save(file: CVFile, ctx?: CVStorageContext): Promise<void>;

  /** Delete the stored CV data. */
  clear(ctx?: CVStorageContext): Promise<void>;

  /**
   * Subscribe to external changes (e.g. Firestore onSnapshot).
   * Returns an unsubscribe function.
   * Optional — LocalStorageAdapter does NOT implement this.
   */
  subscribe?(cb: (file: CVFile | null) => void, ctx?: CVStorageContext): () => void;
}
