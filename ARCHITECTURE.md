# CV System Architecture

## Overview

A pnpm monorepo for managing CVs. Imports from Cinode JSON format, provides a rich editing UI, and exports to print/image formats. The workspace is structured so the pure business logic can be published independently from the browser adapters and brand configuration.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 + CSS variables (`--brand-*` tokens)
- **UI Components**: shadcn/ui (in `apps/demo/src/components/ui/`)
- **State**: React Context + useReducer (`apps/demo/src/lib/store/`)
- **Storage**: localStorage auto-save, JSON file export/import, pluggable `StorageAdapter`
- **Monorepo**: pnpm workspaces

## Workspace Layout

```
/
├── pnpm-workspace.yaml
├── package.json              (workspace root — orchestration scripts only)
├── eslint.config.mjs
├── tsconfig.json             (editor intelligence — path aliases for all packages)
├── packages/
│   ├── core/                 @cvsystem/core      — pure TS, no React/DOM
│   └── adapters-browser/     @cvsystem/adapters-browser  — localStorage, Blob, Firebase
├── brands/
│   └── geisli/               @geisli/brand       — private, Geisli-specific config + assets
├── apps/
│   └── demo/                 (Next.js app, private)
└── spec/                     (feature specifications and planning documents)
```

## Package Boundaries

### `@cvsystem/core` (`packages/core/`)

Pure TypeScript — no React, no DOM, no browser APIs. Safe to run in Node.js or any environment.

```
packages/core/src/
├── domain/model/         DomainCV type, Zod schema, helper functions
├── competence/           skill dedup and calculation service
├── conflict/             import conflict detection and merge
├── file-formats/         import/export logic (pure — no File/Blob/DOM)
├── format/               getBilingualText, formatDate utilities
├── ontology/             SkillNode tree and ontology operations
├── render-spec/          RenderSpec type for audience-aware rendering
├── storage/              CVStorageAdapter interface + MemoryAdapter
├── store/                cvReducer + cv-types (pure reducer, no React)
├── brand-config.ts       BrandConfig interface + DEFAULT_BRAND_CONFIG
└── index.ts              public API surface
```

### `@cvsystem/adapters-browser` (`packages/adapters-browser/`)

Browser-specific adapters. Depends on `@cvsystem/core`. Contains `localStorage`, `Blob`, Firebase, and `File` object usage.

```
packages/adapters-browser/src/
├── file-formats-browser.ts   importFiles(File[]), loadDemoCV — browser File API
├── storage/
│   ├── local-storage-adapter.ts
│   ├── firebase-adapter.ts
│   ├── json-download.ts
│   └── factory.ts            getStorageAdapter() — reads NEXT_PUBLIC_STORAGE_ADAPTER
└── index.ts
```

### `@geisli/brand` (`brands/geisli/`)

Private, Geisli-specific. Provides the `brandConfig` object (name, logo paths, default theme) by extending `DEFAULT_BRAND_CONFIG` from `@cvsystem/core`.

### `apps/demo/` (Next.js app)

The full editing application. Depends on all three packages above.

```
apps/demo/src/
├── app/                    Next.js App Router
│   ├── cv/                 Main CV editing route
│   │   ├── page.tsx
│   │   ├── cv-view.tsx
│   │   ├── role-editor.tsx
│   │   ├── skill-editor.tsx
│   │   ├── training-editor.tsx
│   │   ├── education-editor.tsx
│   │   ├── commitment-editor.tsx
│   │   ├── hobby-project-editor.tsx
│   │   ├── print-layout-paginated.tsx
│   │   └── preview/
│   └── layout.tsx
├── domain/
│   └── cinode/             Cinode JSON → DomainCV (Geisli-specific, not in core)
├── lib/
│   ├── store/              React Context + hooks (cv-store, cv-context, etc.)
│   ├── brand-config.ts     re-exports BrandConfig from @cvsystem/core + brandConfig from @geisli/brand
│   ├── measurement-service-dom.ts
│   ├── print-block-config.ts
│   ├── print-theme-config.ts
│   └── print-themes.ts     (auto-generated)
├── components/
│   ├── ui/                 shadcn/ui primitives
│   └── import/             import dialog + conflict UI
└── hooks/
    └── useCvPagination.ts
```

## Key Types (`@cvsystem/core`)

```typescript
interface DomainCV {
  id: string;
  locales: ('sv' | 'en')[];
  name: { first: string; last: string };
  title: BilingualText;      // { sv?, en? }
  summary: BilingualText;
  skills: Skill[];
  roles: Role[];             // Work experience
  trainings: Training[];     // Courses & certifications
  educations: Education[];
  commitments: Commitment[]; // Presentations, publications
  hobbyProjects: HobbyProject[];
  ontology?: SkillOntology;
  renderSpec?: RenderSpec;
  printBreakBefore?: PrintBreakBefore;
}
```

## State Management (`apps/demo/src/lib/store/`)

- `CVProvider` wraps the app, provides context
- `useCVState()` — read current CV
- `useRoles()`, `useSkills()`, `useTrainings()`, `useEducations()`, `useCommitments()` — CRUD hooks
- Auto-saves to localStorage via `LocalStorageAdapter`
- The underlying `cvReducer` is pure and lives in `@cvsystem/core`

## Data Flow

```
Cinode JSON files → apps/demo/src/domain/cinode/extract.ts → DomainCV
                                                                  ↓
                                                    cv-store (CVProvider)
                                                          ↓
                                              localStorage (auto-save via LocalStorageAdapter)
                                                          ↓
                                              StorageAdapter.save()
                                                ├─ JsonDownloadAdapter → browser file download
                                                └─ FirebaseAdapter    → Firestore: cvs/{cv.id}
```

## Storage Adapter (`@cvsystem/adapters-browser`)

The Save button routes through `getStorageAdapter()` from `@cvsystem/adapters-browser`. The active adapter is selected at runtime via `NEXT_PUBLIC_STORAGE_ADAPTER`.

| `NEXT_PUBLIC_STORAGE_ADAPTER` | Behaviour | Extra config required |
|-------------------------------|-----------|----------------------|
| (unset, default) | `JsonDownloadAdapter` — browser file download | None |
| `firebase` | `FirebaseAdapter` — writes to Cloud Firestore | `NEXT_PUBLIC_FIREBASE_*` |

## File Formats

1. **Cinode JSON**: Source format from Cinode system (Swedish/English exports)
2. **CV System JSON**: `{ "format": "cv-system", "version": "1.0", "cv": {...}, "metadata": {...} }`
   - Legacy `"geisli-cv"` format is auto-migrated on import

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirect to /cv |
| `/cv` | Main editing interface |
| `/cv/preview` | Print preview with HTML download |

## Brand Configuration

`BrandConfig` interface and `DEFAULT_BRAND_CONFIG` live in `@cvsystem/core`. Geisli overrides them in `@geisli/brand`. The active config is re-exported from `apps/demo/src/lib/brand-config.ts`.

CSS brand tokens are `--brand-primary`, `--brand-secondary`, `--brand-accent`, `--brand-neutral`, `--brand-complement`. Defined in `apps/demo/src/app/globals.css`; `brands/geisli/assets/` contains the Geisli-specific values (applied via `brands/geisli/globals-override.css`).

## Scripts

```bash
# From workspace root
pnpm dev          # Start demo app (delegates to apps/demo)
pnpm build        # Build demo app
pnpm test         # Run all workspace tests
pnpm lint         # ESLint across all packages

# Targeted
pnpm --filter demo dev
pnpm --filter @cvsystem/core test:run
pnpm --filter demo exec tsc --noEmit
```

## Adding New CV Sections

1. Add type to `packages/core/src/domain/model/cv.ts`
2. Add extraction in `apps/demo/src/domain/cinode/extract.ts`
3. Add reducer actions in `packages/core/src/store/cv-reducer.ts` and hook in `apps/demo/src/lib/store/`
4. Create editor component in `apps/demo/src/app/cv/`
5. Add to `cv-view.tsx` and `print-layout-paginated.tsx`
