# Core Package Boundary (Phase A4) ✓ COMPLETED

> **Status:** Done. `@cvsystem/core` is extracted at `packages/core/`. `@cvsystem/adapters-browser` is at `packages/adapters-browser/`. Paths in this document refer to the pre-restructure `src/` layout — the concepts are correct but the file paths have moved.

# Core Package Boundary (Phase A4)

## Goal

Define a logical **core** boundary within the repo — a set of directories whose code contains no React, no Next.js, no browser APIs, and no brand-specific logic. This core is:

- **Portable:** any fork (Firebase repo, open-source user) can consume it as-is.
- **Testable in isolation:** pure functions, no DOM setup needed.
- **The basis for comparison:** when analyzing the Firebase repo, we map their equivalents against this surface.
- **Future npm candidate:** if both repos converge on the same core, extracting it to `@cvsystem/core` becomes a mechanical move.

## What is in core

```
src/domain/model/           ← types, zod schemas, helper functions
src/lib/competence/         ← skill calculation and dedup service
src/lib/conflict/           ← conflict detection and merge
src/lib/file-formats/       ← (partial — see exclusions below)
src/lib/storage/            ← CVStorageAdapter interface only (not implementations)
```

### `src/domain/model/`

| File | Status |
|------|--------|
| `cv.ts` | ✅ Core — pure TS types and helper functions. No imports. |
| `cv.schema.ts` *(new, Phase A1)* | ✅ Core — zod schemas for DomainCV. Only imports zod and `cv.ts`. |

### `src/lib/competence/`

| File | Status |
|------|--------|
| `competence-service.ts` | ✅ Core — pure functions, imports only from `domain/model/cv`. |
| `competence-service.test.ts` | ✅ Core — test file, no React. |

### `src/lib/conflict/`

| File | Status |
|------|--------|
| `types.ts` | ✅ Core — pure types. |
| `detect.ts` | ✅ Core — pure function. |
| `merge.ts` | ✅ Core — pure function. |

### `src/lib/file-formats/` (partial)

| File | Status |
|------|--------|
| `types.ts` | ✅ Core — type definitions only. |
| `detect.ts` | ✅ Core — pure detection logic. |
| `import.ts` | ⚠️ Partial — most logic is pure. Exception: `importFiles(files: File[])` takes browser `File` objects. Extract that surface into `browser.ts`. |
| `export.ts` | ⚠️ Partial — `createGeisliFile`/`serializeToJson` are pure. Exception: `downloadCvAsJson` uses `document.createElement` and `Blob`. Extract to `browser.ts`. |
| `browser.ts` *(new, Phase A3)* | ❌ Not core — browser-specific surface (File, Blob, URL, document). |
| `migrations.ts` *(new, Phase A1)* | ✅ Core — pure migration functions. |
| `cv-file.schema.ts` *(new, Phase A1)* | ✅ Core — zod schema for file envelope. |
| `import-saves.test.ts` | ✅ Core — existing test file. |

### `src/lib/storage/`

| File | Status |
|------|--------|
| `cv-storage.ts` *(new, Phase A2)* | ✅ Core — interface definition only, no implementation. |
| `local-storage-adapter.ts` *(new, Phase A2)* | ❌ Not core — browser localStorage. |
| `memory-adapter.ts` *(new, Phase A2)* | ✅ Core (test utility) — no browser APIs. |

## What is NOT in core

| Path | Reason |
|------|--------|
| `src/domain/cinode/` | Cinode is a Geisli-specific import adapter. It consumes core, but is not part of the shared surface. The Firebase repo doesn't use Cinode. |
| `src/lib/store/` | React Context + hooks + useReducer. Framework-coupled. |
| `src/lib/canvas-export.ts` | Uses `html2canvas`, `Blob`, browser APIs. |
| `src/lib/format/` *(new, Phase A5)* | `getBilingualText`/`formatDate` are pure utilities — technically could be core — but they deal with display logic (locale formatting). Keep as a shared lib, not core. |
| `src/lib/print-theme-config.ts` | Geisli-specific header/footer config. |
| `src/lib/print-themes.ts` | Auto-generated manifest. |
| `src/app/` | Next.js App Router, React components. |
| `src/components/` | React components. |
| `src/hooks/` | React hooks. |
| `public/` | Static assets. |

## Dependency rules

**Core directories may only import from:**
- Each other (within core)
- `zod` (external, pinned in package.json)
- Node built-ins with no browser requirement (e.g. `crypto` for id generation — but currently not used)

**Core directories must NOT import from:**
- `src/app/**`
- `src/components/**`
- `src/hooks/**`
- `src/lib/store/**`
- `src/lib/canvas-export.ts`
- `src/lib/print-theme-config.ts`
- `src/lib/print-themes.ts`
- `src/lib/file-formats/browser.ts`
- `src/lib/storage/local-storage-adapter.ts`
- `src/domain/cinode/**`
- Any browser global (`window`, `document`, `localStorage`, `Blob`, `File`, `URL.createObjectURL`)

**Cinode adapter (`src/domain/cinode/`) may import from core but core may not import from Cinode.**

## Enforcing the boundary with ESLint

Add to `eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const CORE_PATHS = [
  'src/domain/model/**',
  'src/lib/competence/**',
  'src/lib/conflict/**',
  'src/lib/file-formats/types.ts',
  'src/lib/file-formats/detect.ts',
  'src/lib/file-formats/import.ts',
  'src/lib/file-formats/export.ts',
  'src/lib/file-formats/migrations.ts',
  'src/lib/file-formats/cv-file.schema.ts',
  'src/lib/storage/cv-storage.ts',
  'src/lib/storage/memory-adapter.ts',
];

const FORBIDDEN_FROM_CORE = [
  { name: 'react' },
  { name: 'react-dom' },
  { name: 'next/*' },
  { name: '@/app/*' },
  { name: '@/components/*' },
  { name: '@/hooks/*' },
  { name: '@/lib/store/*' },
  { name: '@/lib/canvas-export' },
  { name: '@/lib/print-theme-config' },
  { name: '@/lib/print-themes' },
  { name: '@/lib/file-formats/browser' },
  { name: '@/lib/storage/local-storage-adapter' },
  { name: '@/domain/cinode/*' },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // Core boundary: no React, no Next, no browser, no brand
    files: CORE_PATHS,
    rules: {
      'no-restricted-imports': ['error', { paths: FORBIDDEN_FROM_CORE }],
    },
  },
]);

export default eslintConfig;
```

## Public API surface (what a fork uses from core)

When the base is eventually extracted to a package, these are the exports:

```ts
// Domain model
export type {
  DomainCV, Skill, RoleSkill, Role, HobbyProject,
  Training, Education, Commitment, FeaturedProject,
  CoverPageGroups, PrintBreakBefore, BilingualText,
  Contacts, Locale, TrainingType, CommitmentType,
} from './domain/model/cv';
export { getEffectiveYears, hasOverride, createMinimalCv } from './domain/model/cv';

// Schemas
export { DomainCVSchema, SkillSchema /* ... */ } from './domain/model/cv.schema';

// Competence service
export {
  normalizeSkillName, findSkillByName,
  ensureUniqueSkills, ensureUniqueSkillsCaseInsensitive,
  addSkill, updateSkill, removeSkill,
  addSkillToRole, removeSkillFromRole,
  recalculateYears, normalizeAfterImport,
} from './lib/competence/competence-service';

// Conflict
export type { ConflictAnalysis, ConflictResolution } from './lib/conflict/types';
export { detectConflicts } from './lib/conflict/detect';
export { mergeWithResolutions, createDefaultResolutions } from './lib/conflict/merge';

// File formats (pure only)
export type { CVFile, CVMetadata, DetectedFormat, ImportResult } from './lib/file-formats/types';
export { detectFormat, isValidCVFile } from './lib/file-formats/detect';
export { importFromJson } from './lib/file-formats/import';
export { createCVFile, serializeToJson } from './lib/file-formats/export';
export { migrateToLatest, CURRENT_SCHEMA_VERSION } from './lib/file-formats/migrations';

// Storage adapter interface
export type { CVStorageAdapter, CVStorageContext } from './lib/storage/cv-storage';
```

**Not exported from the core package surface:**
- `LocalStorageAdapter` — platform adapter, provided by the consumer.
- `downloadCvAsJson` — browser utility.
- Cinode extractor — brand-specific.
- Store and hooks — React.

## Checklist for Phase A4 completion

- [ ] `eslint.config.mjs` updated with core-boundary rules.
- [ ] `pnpm lint` passes with zero errors on core files.
- [ ] `src/lib/file-formats/browser.ts` created; `downloadCvAsJson` and file-loading browser code moved there.
- [ ] `export.ts` and `import.ts` no longer contain `Blob`, `File`, `document`, `URL.createObjectURL` (only in `browser.ts`).
- [ ] `src/domain/cinode/` does not have any sibling core file importing from it (verify with lint).
- [ ] All core files pass `pnpm tsc --noEmit` without errors.
