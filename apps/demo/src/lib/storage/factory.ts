import type { StorageAdapter } from './types';

/**
 * Returns the active StorageAdapter based on NEXT_PUBLIC_STORAGE_ADAPTER.
 *
 * Adapters are dynamically imported so unused adapters (e.g. Firebase) are
 * never included in the JS bundle.
 *
 * To add a new adapter:
 *   1. Implement StorageAdapter in a package (e.g. @cvsystem/adapters-firebase)
 *   2. Add a branch below keyed by a new env var value
 *   3. Document the value in .env.sample
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  const adapterName = process.env.NEXT_PUBLIC_STORAGE_ADAPTER;

  if (adapterName === 'firebase') {
    const { FirebaseAdapter } = await import('@cvsystem/adapters-firebase');
    return new FirebaseAdapter();
  }

  // Default: JSON file download — no configuration required
  const { JsonDownloadAdapter } = await import('./json-download');
  return new JsonDownloadAdapter();
}
