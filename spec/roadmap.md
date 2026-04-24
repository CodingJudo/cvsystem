# cvsystem Roadmap — Open-Source Release + competence-matrix Integration

> Last updated: 2026-04-21
>
> **Goal:** (1) Make `cvsystem` a standalone, open-sourceable CV engine published as `@cvsystem/*` npm packages.
> (2) Make the Geisli brand a self-contained brand package with zero Geisli-specific code in the demo app.
> (3) Integrate the open-sourced cvsystem into [competence-matrix](https://github.com/geisli/competence-matrix) as the CV engine.

---

## Phase 1 — Ship `@cvsystem/*` v0.1.0

### 1a. RenderSpec editor UI ✅ COMPLETE

All items finished as of 2026-04-21.

- [x] `useCvPagination` accepts `spec?: RenderSpec | null` and calls `applyRenderSpec` before building sections (hidden items no longer appear in the paginated layout)
- [x] `PaginatedPrintLayout` passes `spec` to `useCvPagination`
- [x] `PreviewClient` persists `activeRenderSpecId` to storage on spec change (via `LocalStorageAdapter`)
- [x] `RenderSpecEditor` component built — create/rename/delete specs, hide-item checkboxes per collection, skillDisplay toggle, active-spec indicator (`apps/demo/src/app/cv/render-spec-editor.tsx`)
- [x] `RenderSpecEditor` mounted in `cv-view.tsx`
- [x] `useRenderSpecs` added to `cv-store.tsx` barrel export
- [x] Pre-existing bug fixed: hobby-project skills were not going through `resolveRoleSkills` in `block-content.tsx`
- [x] `spec/render-spec.md` updated to reflect completion

**Remaining gap (low priority):** Per-groupAs `skillOverrides` fine-grained UI — the data model supports it (`spec.skillOverrides`) but there is no editor yet.

---

### 1b. Move `print-geisli.css` and finalize the brand package ✅ COMPLETE

All items finished as of 2026-04-21. Landed in commit `2371d2b`.

- [x] Extend `BrandConfig` in `packages/core/src/brand-config.ts` with `ThemeLayoutConfig` — per-theme layout data (header/footer defs, margins, `blockStartsNewPage`, cover show/hide flags)
- [x] Move Geisli layout data (150px footer, 20mm margin, `blockStartsNewPage: ['education','competence']`, cover flags) from `print-theme-config.ts` / `print-block-config.ts` into `brands/geisli/src/index.ts` under `themeLayoutConfigs['print-geisli']`
- [x] Refactor `apps/demo/src/lib/print-theme-config.ts` — replace `if (themeId === 'print-geisli')` branches with lookups into `brandConfig.themeLayoutConfigs`
- [x] Refactor `apps/demo/src/lib/print-block-config.ts` — replace hardcoded `BLOCK_STARTS_NEW_PAGE_BY_THEME['print-geisli']` and related constants with brand-config lookups
- [x] Replace `DEFAULT_PRINT_THEME_ID` from `print-themes.ts` in `preview-client.tsx` and `theme-selector.tsx` with `brandConfig.defaultPrintThemeId`
- [x] Move `apps/demo/public/themes/cv/print-geisli.css` → `brands/geisli/themes/print-geisli.css`
- [x] Add `apps/demo/scripts/copy-brand-themes.mjs` — copies `brands/*/themes/*.css` to `apps/demo/public/themes/cv/`
- [x] Update `apps/demo/package.json` `predev`/`prebuild` to run `copy-brand-themes.mjs` before `generate-print-theme-manifest.mjs`
- [x] Update `apps/demo/scripts/generate-print-theme-manifest.mjs` to not hardcode `'print-geisli'` as the fallback default (use `PRINT_THEMES[0]` or an env var)
- [x] Regenerate `apps/demo/src/lib/print-themes.ts`
- [x] TypeScript check passes (`npx tsc --noEmit` exit 0)
- [x] All tests pass (`pnpm test` exit 0)

**Key files:**
- `packages/core/src/brand-config.ts`
- `brands/geisli/src/index.ts`
- `apps/demo/src/lib/print-theme-config.ts`
- `apps/demo/src/lib/print-block-config.ts`
- `apps/demo/src/lib/print-themes.ts`
- `apps/demo/src/app/cv/preview/preview-client.tsx`
- `apps/demo/src/app/cv/preview/theme-selector.tsx`
- `apps/demo/scripts/generate-print-theme-manifest.mjs`
- New: `brands/geisli/themes/print-geisli.css`
- New: `apps/demo/scripts/copy-brand-themes.mjs`

---

### 1c. Repackage the Firebase adapter ✅ COMPLETE

All items finished as of 2026-04-21. Landed in commit `2371d2b`.

- [x] Create `packages/adapters-firebase/` → package name `@cvsystem/adapters-firebase`
- [x] Move `packages/adapters-browser/src/storage/firebase-adapter.ts` into the new package
- [x] `packages/adapters-firebase/package.json` — peer dep on `firebase`; depends on `@cvsystem/core`
- [x] Update `apps/demo` factory to import `FirebaseAdapter` from `@cvsystem/adapters-firebase`
- [x] Remove `firebase` from `packages/adapters-browser/package.json`
- [x] `pnpm --filter @cvsystem/adapters-browser build` has no `firebase` dep in output
- [x] TypeScript check passes; all tests pass

**Key files:**
- New: `packages/adapters-firebase/`
- `packages/adapters-browser/src/storage/firebase-adapter.ts` (moved)
- `packages/adapters-browser/src/storage/factory.ts`
- `packages/adapters-browser/package.json`

---

### 1d. Extract `@cvsystem/ui` ✗ DEFERRED to v0.2

**Why deferred:** Three blockers make this high-risk for v0.1:

1. **Server action coupling** — `cv-view.tsx` imports `./actions` (a Next.js server action) and `getStorageAdapter` (app-level factory). Moving it requires making both injectable props, reshaping the component API.
2. **Radix + Tailwind surface area** — shadcn/ui components in `components/ui/` bring Radix primitives and Tailwind as peer deps, significantly widening the package's dependency footprint.
3. **No build pipeline** — extracting a publishable React package requires `tsup` (or equivalent) producing ESM + `.d.ts`. None of the existing packages have that plumbing yet; adding it here alongside a large file migration is high blast radius.

v0.1 ships `@cvsystem/core`, `@cvsystem/adapters-browser`, `@cvsystem/adapters-firebase`. UI extraction is a standalone v0.2 milestone with its own scoping.

**Original goal (preserved for v0.2):** Portable React components in a publishable package so external consumers can use the editors and print layout.

- [ ] Create `packages/ui/` → `@cvsystem/ui`
- [ ] Move from `apps/demo/src/`: `components/`, editor components (`*-editor.tsx`), print layout components, `CVProvider`, `OntologyProvider`, `BlockRenderer`, `BasicMarkdownText`, `PrintMeasurementRoot`, `hooks/useCvPagination.ts`, `canvas-export.ts`, `measurement-service-dom.ts`, `print-theme-config.ts`, `print-block-config.ts`
- [ ] Decouple `cv-view.tsx` from Next.js: inject `storageAdapter` + `onLoadFixtures` as props; replace `next/link`→`<a>`, `next/image`→`<img>`
- [ ] What stays in `apps/demo`: route files, `app/layout.tsx`, `app/page.tsx`, `public/`, `next.config.ts`
- [ ] Peer deps: `react`, `react-dom`, `@cvsystem/core`. No `next/*` imports in `@cvsystem/ui`
- [ ] Add `tsup` build: `pnpm --filter @cvsystem/ui build` produces ESM + `.d.ts`
- [ ] `apps/demo` consumes `@cvsystem/ui` and runs identically

---

### 1e. Documentation and theme SDK ✅ COMPLETE

All items finished as of 2026-04-21. Landed in commits `26b9f86` and `f5e592d`.

- [x] Root `README.md` rewrite — positioning, quick-start, install, minimal wiring example
- [x] `packages/core/README.md` — public API, schema versioning contract, migrations
- [ ] `packages/ui/README.md` — deferred; `@cvsystem/ui` extraction deferred to v0.2 (see 1d)
- [x] `docs/theming.md` — `BrandConfig` surface, CSS var list, Tailwind preset, how to register a theme (using `@geisli/brand` as a worked example)
- [x] `docs/storage-adapters.md` — `CVStorageAdapter` contract, how to implement, reference adapters
- [x] `docs/brands.md` — how to build a brand package
- [x] `CONTRIBUTING.md`
- [x] `LICENSE` (MIT, copyright Coding Judo / John Shaw)
- [x] `CODE_OF_CONDUCT.md`

---

### 1f. Publishing setup ✅ COMPLETE

All items finished as of 2026-04-21.

- [x] Adopt `changesets` (`@changesets/cli`)
- [x] Public packages (MIT, Coding Judo / John Shaw): `@cvsystem/core`, `@cvsystem/adapters-browser`, `@cvsystem/adapters-firebase`, `@cvsystem/example-brand`. Private: `brands/geisli` (proprietary, Geisli Consulting AB), `apps/demo`
- [x] Initial version `0.2.0` published to npm (minor bump from 0.1.0 baseline)
- [x] GitHub Actions: CI on PR (`ci.yml`); release on merge to `main` via changesets (`release.yml`)
- [x] `@cvsystem` npm org created (owner: codingjudo)
- [x] Git history squashed to single orphan commit — eliminates all PII/fixture history
- [x] `brands/geisli/` stripped from history + gitignored; `brands/example/` added as reference brand
- [x] `brands/geisli/LICENSE` confirms proprietary status
- [x] Repo made public at github.com/CodingJudo/cvsystem

---

## Phase 2 — Integrate into competence-matrix

Repo: `/Users/johnshaw/repo/competence-matrix` (private Geisli Firebase app).

### 2a. Convert competence-matrix to pnpm workspace + `@geisli/competence-brand`

- [ ] Restructure into `apps/web/` (current Vite+MUI app) and `packages/brand/`
- [ ] `packages/brand/` — Geisli theme, logos, brand-config (from `brands/geisli/` or imported as private dep)
- [ ] Web app imports brand package when mounting `<CVProvider>` and print layout

### 2b. Bidirectional CV adapter

> Do NOT migrate the Firestore data model in a single step — production docs use `CVData`, a different shape.

- [ ] Install `@cvsystem/core` and `@cvsystem/adapters-firebase` in competence-matrix
- [ ] Create `src/model/cv/adapter.ts`:
  - `cvDataToDomainCV(cvData: CVData): DomainCV` — English-only strings → `{sv: null, en: 'foo'}`, flat competences → `Skill[]`, experiences → `Role[]`, courses → `Training[]`, engagements → `Commitment[]`
  - `domainCVToCVData(cv: DomainCV): CVData` — flatten bilingual to preferred locale, drop ontology/renderSpecs
- [ ] Round-trip tests on 10–20 production-shape fixtures; document acceptable semantic loss per field

**Key files in competence-matrix:**
- `src/model/cv/CVData.ts`
- `src/firebaseCVs.ts`
- `src/model/firebase/CVDoc.ts`
- `firestore.rules`

### 2c. Wire `FirestoreAdapter`

- [ ] Use `@cvsystem/adapters-firebase` directly, or thin `src/services/FirestoreAdapter.ts` composing it with app auth
- [ ] New Firestore doc shape: `{ format: 'cv-system', schemaVersion, cv: DomainCV, metadata, _legacyCVData?: CVData }` during transition
- [ ] Subscribe via `onSnapshot` for multi-device sync
- [ ] Respect existing `@geisli.se` domain restriction in `firestore.rules`

### 2d. Phased production data migration

- [ ] **Phase 1 — Read-time backfill**: synthesize `DomainCV` in-memory from stored `CVData` on every read. No writes. Metric: synthesis count, error rate.
- [ ] **Phase 2 — Dual-write**: saves write both `CVData` (legacy) and `DomainCV` (canonical). Reads prefer `DomainCV` when present.
- [ ] **Phase 3 — Backfill job**: `scripts/migrate-cvs-to-domain.ts` via Firebase Admin SDK. Idempotent via `schemaVersion` guard. Dry-run first; back up Firestore.
- [ ] **Phase 4 — Read-switch**: reads require `DomainCV`; `CVData` becomes derived view.
- [ ] **Phase 5 — Retire CVData**: drop dual-write; delete adapter; remove `_legacyCVData`.

### 2e. Gradual feature adoption

- [ ] **Import path**: Gemini PDF parsing in `linkedinImportService.ts` writes `DomainCV` directly; feed old MUI UI via adapter
- [ ] **Print/PDF export**: replace jsPDF-hardcoded layout with cvsystem HTML-paginated print pipeline
- [ ] **Editor UI**: replace MUI editors with `@cvsystem/ui` editors behind a feature flag (start with contacts/title, grow to full CV)
- [ ] **Ontology + render specs**: roll out once core migration is stable
- [ ] **Drop `CVData`**: once all consumers migrated; delete adapter

### 2f. Preserve competence-matrix-specific features (do NOT upstream)

These stay in competence-matrix and are out of scope for `@cvsystem/*`:
- Gemini-based translation, competence extraction, LinkedIn import
- `CompetenceOverview`, `MatchCompetences`, `CategoryManagement`, admin panels

---

## Utilities already available in `@cvsystem/core` on `main`

| Utility | Path |
|---|---|
| Domain types + Zod schemas | `domain/model/cv.ts`, `domain/model/cv.schema.ts` |
| Schema migrations (v1→v2) | `file-formats/cv-file.schema.ts` |
| Bilingual + date helpers | `format/index.ts` |
| Paginator | `paginate-cv.ts`, `build-sections-from-cv.ts` |
| MIND ontology + custom entries | `ontology/index.ts` |
| `applyRenderSpec`, `resolveRoleSkills` | `render-spec/index.ts` |
| Storage interface + MemoryAdapter | `storage/types.ts`, `storage/memory-adapter.ts` |
| BrandConfig interface + defaults | `brand-config.ts` |
| Conflict detect/merge | `conflict/detect.ts`, `conflict/merge.ts` |
| Competence service | `competence/competence-service.ts` |

In `@cvsystem/adapters-browser`:
- `LocalStorageAdapter`, `JsonDownloadAdapter`, storage factory

In `@cvsystem/adapters-firebase`:
- `FirebaseAdapter` (peer dep: `firebase >=10`)

In `@geisli/brand`:
- `brandConfig` — Geisli brand overrides
- `assets/` — logos, brand-guide
