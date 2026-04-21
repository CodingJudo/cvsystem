# Storage Adapters

cvsystem decouples persistence from the domain model via the `StorageAdapter` and `CVStorageAdapter` interfaces. Swap adapters by changing an env var — no app code changes needed.

## Two adapter interfaces

| Interface | Signature | When to use |
|---|---|---|
| `StorageAdapter` | `save(cv, options)` / `load()` | Simple save/load wired to a single backend |
| `CVStorageAdapter` | `save(file, ctx?)` / `load(ctx?)` / `clear(ctx?)` | Multi-user / multi-CV systems; accepts `userId`/`cvId` context |

Both live in `@cvsystem/core`.

## Reference adapters

### LocalStorageAdapter (`@cvsystem/adapters-browser`)

Persists a `CVFile` in browser `localStorage`. SSR-safe (no-ops when `window` is undefined). Runs `migrateFile()` on load so old schema versions upgrade automatically.

```ts
import { LocalStorageAdapter } from '@cvsystem/adapters-browser';

const adapter = new LocalStorageAdapter();            // key: 'cv-data' (default)
const adapter = new LocalStorageAdapter('my-cv-key'); // custom key

const file = await adapter.load();    // CVFile | null
await adapter.save(file, ctx?);
await adapter.clear();
```

### JsonDownloadAdapter (`@cvsystem/adapters-browser`)

Triggers a JSON file download on `save()`. `load()` returns `null` (download-only). Used as the default when no `NEXT_PUBLIC_STORAGE_ADAPTER` is set.

```ts
import { JsonDownloadAdapter } from '@cvsystem/adapters-browser';

const adapter = new JsonDownloadAdapter();
await adapter.save(file); // → downloads cv-<name>-<date>.json
```

### FirebaseAdapter (`@cvsystem/adapters-firebase`)

Saves the CV to Cloud Firestore at path `cvs/{cv.id}`. `firebase` is a peer dependency.

```ts
import { FirebaseAdapter } from '@cvsystem/adapters-firebase';

const adapter = new FirebaseAdapter();
await adapter.save(cv, { metadata: { source: 'manual' } });
```

Required environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Note: `photoDataUrl` is stripped before saving — base64 images can exceed Firestore's 1 MiB per-document limit.

### MemoryAdapter (`@cvsystem/core`)

In-memory only. Useful for tests and SSR placeholders.

```ts
import { MemoryAdapter } from '@cvsystem/core';

const adapter = new MemoryAdapter();
await adapter.save(file);
const loaded = await adapter.load(); // same file
```

## Selecting the adapter at runtime (demo app)

Set `NEXT_PUBLIC_STORAGE_ADAPTER` in `.env.local`:

```env
# Default (no value): JSON download
NEXT_PUBLIC_STORAGE_ADAPTER=firebase
```

The factory at `apps/demo/src/lib/storage/factory.ts` dynamically imports the chosen adapter so unused adapters are never bundled.

## Implementing a custom adapter

Implement `CVStorageAdapter` from `@cvsystem/core`:

```ts
import type { CVFile, CVStorageAdapter, CVStorageContext } from '@cvsystem/core';
import { migrateFile } from '@cvsystem/core';

export class MyAdapter implements CVStorageAdapter {
  readonly id = 'my-adapter';

  async load(ctx?: CVStorageContext): Promise<CVFile | null> {
    const raw = await myBackend.get(ctx?.cvId ?? 'default');
    if (!raw) return null;
    return migrateFile(JSON.parse(raw)) as CVFile; // always migrate on load
  }

  async save(file: CVFile, ctx?: CVStorageContext): Promise<void> {
    await myBackend.set(ctx?.cvId ?? 'default', JSON.stringify(file));
  }

  async clear(ctx?: CVStorageContext): Promise<void> {
    await myBackend.delete(ctx?.cvId ?? 'default');
  }
}
```

Rules:
1. Always run `migrateFile()` on raw data from the backend before returning — the stored schema may be older.
2. The `ctx` parameter (`{ userId?, cvId? }`) is optional; ignore it for single-user adapters.
3. `load()` must return `null` (not throw) when no data is found.
4. Do not store `photoDataUrl` in remote backends without size checks — base64 images are large.

## CVStorageContext

```ts
interface CVStorageContext {
  userId?: string;
  cvId?: string;
}
```

Passed by the store when saving/loading in multi-user contexts. Single-user adapters can ignore it.
