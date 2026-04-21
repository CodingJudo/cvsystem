# Storage Abstraction — CVStorageAdapter Plan (Phase A2) ✓ COMPLETED

> **Status:** Done. `CVStorageAdapter` lives in `packages/core/src/storage/cv-storage.ts`. `LocalStorageAdapter`, `FirebaseAdapter`, `JsonDownloadAdapter`, and `factory.ts` are in `packages/adapters-browser/src/storage/`. Paths in this document refer to the pre-restructure `src/` layout.

# Storage Abstraction — CVStorageAdapter Plan (Phase A2)

## Goal

Replace the direct `localStorage` calls in `cv-store.tsx` with a pluggable storage adapter. Ship a `LocalStorageAdapter` that preserves current behaviour. The interface is async to support future Firebase/cloud backends.

## Why

- **Direct coupling.** `cv-store.tsx` calls `localStorage.getItem/setItem/removeItem` directly in two `useEffect` hooks (lines ~960-1021) and in `readCvFromStorage()` (lines ~1036-1048). Import history also uses localStorage directly (`IMPORT_HISTORY_KEY` in `import.ts`).
- **Firebase merge.** The Firebase repo will need a `FirestoreAdapter`. Without this abstraction, adopting our store means rewriting its persistence layer.
- **Multi-user future.** The adapter interface accepts optional `userId`/`cvId` context so multi-user support is a non-breaking change.
- **Testability.** A `MemoryAdapter` makes store tests deterministic without jsdom localStorage mocks.

## Interface

```ts
// src/lib/storage/cv-storage.ts

import type { CVFile } from '@/lib/file-formats/types'; // post-rename of GeisliCVFile

/**
 * Optional context for multi-user / multi-document storage adapters.
 * LocalStorageAdapter ignores these; FirestoreAdapter would use them.
 */
export interface CVStorageContext {
  userId?: string;
  cvId?: string;
}

/**
 * Pluggable persistence backend for CV data.
 * All methods are async to support cloud adapters.
 */
export interface CVStorageAdapter {
  /** Load the most recently saved CV file, or null if none exists. */
  load(ctx?: CVStorageContext): Promise<CVFile | null>;

  /** Save a CV file. The adapter decides the storage key/path from ctx. */
  save(file: CVFile, ctx?: CVStorageContext): Promise<void>;

  /** Delete the stored CV data. */
  clear(ctx?: CVStorageContext): Promise<void>;

  /**
   * Subscribe to external changes (e.g. Firestore onSnapshot).
   * Returns an unsubscribe function.
   * Optional — LocalStorageAdapter does NOT implement this (localStorage has no push model).
   */
  subscribe?(
    cb: (file: CVFile | null) => void,
    ctx?: CVStorageContext,
  ): () => void;
}
```

## LocalStorageAdapter

```ts
// src/lib/storage/local-storage-adapter.ts

const DEFAULT_KEY = 'cv-data';

export class LocalStorageAdapter implements CVStorageAdapter {
  private key: string;

  constructor(key = DEFAULT_KEY) {
    this.key = key;
  }

  async load(): Promise<CVFile | null> {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateFile(parsed); // uses schema migration from A1
  }

  async save(file: CVFile): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(file));
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.key);
  }

  // No subscribe — localStorage has no push model.
}
```

**Notes:**
- `ctx` (userId/cvId) is accepted but ignored. Consistent interface, no runtime overhead.
- `load()` runs `migrateFile()` from A1 to handle schema versioning and legacy `"geisli-cv"` format identifiers.
- SSR guard (`typeof window === 'undefined'`) preserves current behaviour.

## MemoryAdapter (for tests)

```ts
// src/lib/storage/memory-adapter.ts

export class MemoryAdapter implements CVStorageAdapter {
  private data: CVFile | null = null;

  async load() { return this.data; }
  async save(file: CVFile) { this.data = file; }
  async clear() { this.data = null; }
}
```

## Store wiring

### Current code to replace

`cv-store.tsx` lines ~957-1048 contain:
1. **Load on mount** (useEffect with `[]` deps): reads `localStorage.getItem(STORAGE_KEY)`, checks format, dispatches `LOAD_FROM_STORAGE` + `INIT`.
2. **Auto-save on change** (useEffect with `[state.cv, ...]` deps): writes `localStorage.setItem(STORAGE_KEY, ...)`.
3. **`readCvFromStorage()`**: standalone function for preview to read the same data.

### New design

```tsx
interface CVProviderProps {
  children: ReactNode;
  initialCv: DomainCV;
  storage?: CVStorageAdapter; // defaults to LocalStorageAdapter
}

export function CVProvider({ children, initialCv, storage }: CVProviderProps) {
  const adapterRef = useRef(storage ?? new LocalStorageAdapter());
  const [state, dispatch] = useReducer(cvReducer, initialState);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    adapterRef.current.load().then((file) => {
      if (cancelled) return;
      if (file?.cv) {
        const normalized = normalizeCv(file.cv);
        dispatch({ type: 'LOAD_FROM_STORAGE', cv: normalized, metadata: file.metadata, rawCinode: file.rawCinode });
        dispatch({ type: 'INIT', cv: normalized });
      } else {
        dispatch({ type: 'INIT', cv: normalizeCv(initialCv) });
      }
    }).catch(() => {
      dispatch({ type: 'INIT', cv: normalizeCv(initialCv) });
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-save on change (debounced for cloud adapters)
  useEffect(() => {
    if (!state.isInitialized || !state.cv) return;
    const file: CVFile = {
      format: 'cv-system',
      version: '1.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: state.metadata ?? { /* defaults */ },
      cv: state.cv,
      rawCinode: state.rawCinode,
    };
    adapterRef.current.save(file).catch(() => { /* ignore */ });
  }, [state.cv, state.isInitialized, state.metadata, state.rawCinode]);

  // ...
}
```

### `readCvFromStorage()` replacement

For the preview page (`preview-client.tsx`), expose the adapter:

```ts
// Simple helper that takes an adapter instead of touching localStorage directly
export async function loadCvFromAdapter(adapter: CVStorageAdapter): Promise<DomainCV | null> {
  const file = await adapter.load();
  return file?.cv ? normalizeCv(file.cv) : null;
}
```

Preview initializes with a `LocalStorageAdapter` by default, same as today.

## Import history

`import.ts` uses `IMPORT_HISTORY_KEY` in `localStorage` for import history. This is a separate concern from CV data persistence. Options:

1. **Leave it in localStorage.** Import history is ephemeral and local-only. No need to abstract it.
2. **Add a separate `ImportHistoryAdapter`.** Only if the Firebase fork needs it — unlikely.

**Decision:** Leave import history in localStorage for now. It's not on the critical path for the merge.

## Debouncing

- `LocalStorageAdapter.save()` is effectively instant. No debounce needed.
- Future `FirestoreAdapter.save()` should debounce internally (e.g., 1-2 seconds) to avoid excessive writes. The adapter interface stays simple; debouncing is an implementation detail of the adapter, not the store.

## Files to create/modify

| Action | File |
|--------|------|
| Create | `src/lib/storage/cv-storage.ts` — interface |
| Create | `src/lib/storage/local-storage-adapter.ts` |
| Create | `src/lib/storage/memory-adapter.ts` |
| Modify | `src/lib/store/cv-store.tsx` — accept `storage` prop, replace localStorage calls |
| Modify | `src/app/cv/preview/preview-client.tsx` — use `loadCvFromAdapter` instead of `readCvFromStorage` |
| Modify | `src/app/cv/canvas/canvas-client.tsx` — same |

## Testing

- Unit test `LocalStorageAdapter` with a jsdom/mock localStorage.
- Unit test `MemoryAdapter` (trivial, but confirms the interface contract).
- Integration test: `CVProvider` with `MemoryAdapter` — load, save, clear cycle.
- Existing store tests should pass unchanged (they don't test persistence directly).
