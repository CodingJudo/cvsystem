import type { StorageAdapter } from '@cvsystem/core';

/**
 * Returns the active StorageAdapter based on NEXT_PUBLIC_STORAGE_ADAPTER.
 *
 * Adapters are dynamically imported so unused adapters are never included in the JS bundle.
 * Firebase support is provided by @cvsystem/adapters-firebase (not this package).
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  // Default: JSON file download — no configuration required
  const { JsonDownloadAdapter } = await import('./json-download');
  return new JsonDownloadAdapter();
}
