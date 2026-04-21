import type { DomainCV, CVFile, StorageAdapter, SaveOptions } from '@cvsystem/core';
import { createCVFile } from '@cvsystem/core';

/**
 * Firebase adapter: saves the CV to Cloud Firestore.
 *
 * Prerequisites: install `firebase` in the consuming application.
 *
 * Required environment variables (see .env.sample in apps/demo):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * Document path: cvs/{cv.id}
 *
 * Note: photoDataUrl is stripped before saving — base64 images can exceed
 * Firestore's 1 MiB per-document limit.
 */
export class FirebaseAdapter implements StorageAdapter {
  readonly id = 'firebase';

  async save(cv: DomainCV, options: SaveOptions): Promise<void> {
    // Dynamic imports so Firebase SDK is only bundled when this adapter is active
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

    const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
    const db = getFirestore(app);

    const file = createCVFile(cv, {
      metadata: options.metadata
        ? { ...options.metadata, savedAt: new Date().toISOString() }
        : undefined,
      rawCinode: options.rawCinode,
    });

    // Strip photo: base64 strings can exceed Firestore's 1 MiB document limit
    const safeFile = sanitizeForFirestore({
      ...file,
      cv: { ...file.cv, photoDataUrl: null },
    });

    await setDoc(
      doc(db, 'cvs', cv.id),
      { ...(safeFile as Record<string, unknown>), _updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async load(): Promise<CVFile | null> {
    // Stub: load requires knowing which document to fetch (needs auth context).
    // A follow-up can add a cvId constructor parameter once Firebase Auth is wired in.
    return null;
  }
}

function sanitizeForFirestore(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj));
}

function getFirebaseConfig() {
  return {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}
