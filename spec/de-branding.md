# De-Branding — Geisli Extraction Checklist (Phase A3) ✓ COMPLETED

> **Status:** Done. `BrandConfig` + `DEFAULT_BRAND_CONFIG` are in `packages/core/src/brand-config.ts`. Geisli overrides are in `brands/geisli/src/index.ts`. CSS variables renamed from `--geisli-*` to `--brand-*`. `GeisliCVFile` renamed to `CVFile`. Format identifier migrated from `"geisli-cv"` to `"cv-system"`. Logo assets at `brands/geisli/assets/` and `apps/demo/public/brands/geisli/`.

# De-Branding — Geisli Extraction Checklist (Phase A3)

## Goal

Transform this repo from "Geisli CV System" into a brand-neutral **CV System** base. Geisli branding moves into a self-contained `brands/geisli/` package. Any future company (or open-source user) can fork the base and drop in their own brand directory. The Geisli fork continues to work exactly as today.

## Key finding

Geisli branding was added in a single commit on top of a generic system. Brand logic is **not** entangled with business logic — it is almost entirely CSS variables, theme files, a few string literals, and type names. The deepest coupling is the persisted file-format identifier `"geisli-cv"`, which needs a migration shim. All other changes are mechanical renames.

**No personal data is in git history.** Fixtures are in `.gitignore`. Safe to open-source the base after this phase.

---

## Part 1: CSS variables and colors

### 1.1 `src/app/globals.css`

Two sets of duplicate Geisli color variables (lines 12–17 and 59–64):

```css
/* Lines 12-17 (block 1) */
--color-geisli-accent:     #FF6B00
--color-geisli-primary:    #8C52FF
--color-geisli-secondary:  #101B29
--color-geisli-neutral:    #FFFFFF
--color-geisli-complement: #E1E3E8

/* Lines 59-64 (block 2) */
--geisli-accent:     #FF6B00
--geisli-primary:    #8C52FF
--geisli-secondary:  #101B29
--geisli-neutral:    #FFFFFF
--geisli-complement: #E1E3E8
```

**Action:** Replace both blocks with generic aliases in the base CSS:

```css
/* Base: neutral fallbacks (overridden by brand theme) */
--brand-accent:     #6366F1;
--brand-primary:    #6366F1;
--brand-secondary:  #1E293B;
--brand-neutral:    #FFFFFF;
--brand-complement: #F1F5F9;

/* Legacy aliases — remove after all components migrated */
--geisli-accent:     var(--brand-accent);
--geisli-primary:    var(--brand-primary);
--geisli-secondary:  var(--brand-secondary);
--geisli-neutral:    var(--brand-neutral);
--geisli-complement: var(--brand-complement);
```

Then `brands/geisli/globals-override.css` sets the actual Geisli values:

```css
:root {
  --brand-accent:     #FF6B00;
  --brand-primary:    #8C52FF;
  --brand-secondary:  #101B29;
  --brand-neutral:    #FFFFFF;
  --brand-complement: #E1E3E8;
}
```

The `--geisli-*` legacy aliases keep all existing component code working during transition. Remove them once components are migrated (see 1.2).

### 1.2 Component references to `var(--geisli-*)`

Total occurrences: ~50 across these files:

| File | Occurrences |
|------|-------------|
| `src/app/cv/hobby-project-editor.tsx` | ~20 |
| `src/components/import/import-dropzone.tsx` | ~10 |
| `src/components/import/conflict-card.tsx` | ~8 |
| `src/components/import/conflict-resolver.tsx` | ~4 |
| `src/components/import/import-dialog.tsx` | ~3 |
| `src/app/cv/cover-page-groups-editor.tsx` | ~3 |
| `src/app/cv/title-editor.tsx` | ~3 |
| `src/app/cv/summary-editor.tsx` | ~2 |

**Action:** Global find-and-replace across `src/`:
- `var(--geisli-accent)` → `var(--brand-accent)`
- `var(--geisli-primary)` → `var(--brand-primary)`
- `var(--geisli-secondary)` → `var(--brand-secondary)`
- `var(--geisli-neutral)` → `var(--brand-neutral)`
- `var(--geisli-complement)` → `var(--brand-complement)`

After this, remove the legacy alias block from `globals.css`.

---

## Part 2: Print themes and theme configuration

### 2.1 Rename `print-geisli.css` → stays in `brands/geisli/`

Current location: `/public/themes/cv/print-geisli.css`  
New location: `/public/themes/cv/print-geisli.css` — **keep the same path for now**. The theme manifest auto-discovers files in this directory by filename. Geisli keeps its theme file under the Geisli name. The base ships `print-light.css` and `print-dark.css` as the neutral defaults.

What changes: the **default theme** must not be hard-coded to `'print-geisli'`.

### 2.2 `src/lib/print-themes.ts` (auto-generated)

Line 33:
```ts
export const DEFAULT_PRINT_THEME_ID = PRINT_THEMES.find(t => t.id === 'print-geisli')?.id ?? PRINT_THEMES[0]?.id ?? 'print-geisli';
```

**Action:** Make the default configurable via `src/lib/brand-config.ts` (see Part 5). The generator script (`scripts/generate-print-theme-manifest.mjs`) should not hard-code the default — it should read from a config or fall back to the first available theme.

### 2.3 `src/lib/print-theme-config.ts`

Lines 42 and 54 both `if (themeId === 'print-geisli')`.

**Action:** This file is already data-driven per theme ID — the Geisli-specific config (`GEISLI_HEADERS`, `GEISLI_FOOTERS`, margins) is correct to keep. The only change: this file stays as a **Geisli-specific config** that the Geisli brand provides. In the base, `getPrintThemeConfig` falls through to empty defaults; Geisli overrides via a registered theme config.

Longer term: make `getPrintThemeConfig` take a registry (injected at startup) rather than a hard-coded `if/else`. For now, the `print-geisli` checks stay in the file since they're not causing harm.

### 2.4 `src/lib/print-block-config.ts`

Lines 22, 39, 53: all reference `'print-geisli'` as keys in config maps.

**Action:** Same as 2.3 — these are data values (strings used as map keys), not business logic. Geisli keeps its config here; the base just has no entry for `'print-geisli'` and falls to defaults. No change required for de-branding — just document that these are brand-specific entries.

### 2.5 Comment in `src/hooks/useCvPagination.ts` line 29

```ts
/** Theme id (e.g. print-geisli); used to attach header/footer refs */
```

**Action:** Update comment to `(e.g. print-light, print-dark, or a brand theme like print-geisli)`.

---

## Part 3: File format identifier

### 3.1 The problem

`"geisli-cv"` is the persisted format identifier in:
- `src/lib/file-formats/types.ts` line 39: `format: 'geisli-cv'`
- `src/lib/file-formats/detect.ts` line 23: `if (data.format === 'geisli-cv')`
- `src/lib/file-formats/detect.ts` line 45: `if (data.format !== 'geisli-cv')`
- `src/lib/file-formats/export.ts` line 32: sets `format: 'geisli-cv'`
- `src/lib/store/cv-store.tsx` lines 970, 1004, 1042: checks and writes `'geisli-cv'`

Every existing saved file in localStorage (and any exported JSON) uses this identifier. **Renaming without a shim breaks all existing data.**

### 3.2 Migration shim

New format identifier: `'cv-system'`

```ts
// src/lib/file-formats/detect.ts

const LEGACY_FORMAT_IDS = ['geisli-cv'] as const;
const CURRENT_FORMAT_ID = 'cv-system' as const;

export function detectFormat(data: unknown): DetectedFormat {
  if (!isObject(data)) return 'unknown';
  if (data.format === CURRENT_FORMAT_ID) return 'cv-system';
  if (LEGACY_FORMAT_IDS.includes(data.format as never)) return 'cv-system'; // treat legacy as cv-system
  if (isObject(data.resume) && Array.isArray((data.resume as Record<string,unknown>).blocks)) return 'cinode';
  return 'unknown';
}
```

On import, any file with `format: 'geisli-cv'` is silently upgraded to `format: 'cv-system'` before processing. On save/export, always write `format: 'cv-system'`.

### 3.3 Type renames

| Old name | New name | Files |
|----------|----------|-------|
| `GeisliCVFile` | `CVFile` | `types.ts`, `import.ts`, `export.ts`, `cv-store.tsx`, `storage-abstraction` |
| `GeisliCVMetadata` | `CVMetadata` | `types.ts`, `import.ts`, `cv-store.tsx` |
| `DetectedFormat` values | `'cv-system'` replaces `'geisli-cv'` | `types.ts`, `detect.ts`, `import.ts` |

**Action:** Rename via global replace. The type renames are purely internal — they don't affect the persisted format (the JSON field is `"format": "cv-system"`, not the TypeScript type name).

---

## Part 4: Assets and static files

### 4.1 Geisli logo files

Current paths:
- `/public/themes/cv/geisli-logo.svg`
- `/public/themes/cv/geisli-logo-footer.png`

Referenced in: `src/app/cv/print-layout-paginated.tsx` (logo path in print footer).

**Action:**
- Move files to `/public/brands/geisli/` (out of the shared themes directory).
- Update path in `print-layout-paginated.tsx` to come from brand config (see Part 5) rather than being hard-coded.
- The base ships with no logo. A fork sets `brandConfig.logoPath` and `brandConfig.footerLogoPath`.

### 4.2 `Design:explaination.ini`

Geisli brand style guide (colors, fonts, usage). Has no effect on the build.

**Action:** Move to `brands/geisli/brand-guide.ini`. Add `brands/` directory structure (see Part 6).

---

## Part 5: Brand configuration system

Create `src/lib/brand-config.ts` as the single place a fork customizes identity:

```ts
// src/lib/brand-config.ts

export interface BrandConfig {
  /** Display name of the company/brand (used in page titles, etc.) */
  name: string;
  /** Default print theme ID */
  defaultPrintThemeId: string;
  /** Path to the header logo (null = no logo) */
  logoPath: string | null;
  /** Path to the footer logo (null = no footer logo) */
  footerLogoPath: string | null;
}

/** Base defaults — neutral, no logo, light theme */
export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  name: 'CV System',
  defaultPrintThemeId: 'print-light',
  logoPath: null,
  footerLogoPath: null,
};

/** Active config — overridden by the brand package */
export const brandConfig: BrandConfig = {
  ...DEFAULT_BRAND_CONFIG,
  // Geisli fork overrides this file with:
  // name: 'Geisli',
  // defaultPrintThemeId: 'print-geisli',
  // logoPath: '/brands/geisli/geisli-logo.svg',
  // footerLogoPath: '/brands/geisli/geisli-logo-footer.png',
};
```

Consumers:
- `src/app/layout.tsx` → uses `brandConfig.name` for page title.
- `src/lib/print-themes.ts` generator → reads `brandConfig.defaultPrintThemeId` for the default.
- `src/app/cv/print-layout-paginated.tsx` → uses `brandConfig.footerLogoPath`.

A fork either edits `brand-config.ts` directly (for a simple fork) or imports a brand package that sets the values (for a monorepo approach later).

---

## Part 6: Directory structure after de-branding

```
/
├── brands/
│   └── geisli/
│       ├── brand-guide.ini          # moved from Design:explaination.ini
│       └── (other brand assets)
├── public/
│   ├── brands/
│   │   └── geisli/
│   │       ├── geisli-logo.svg      # moved from /public/themes/cv/
│   │       └── geisli-logo-footer.png
│   └── themes/cv/
│       ├── print-dark.css           # neutral, stays
│       ├── print-geisli.css         # Geisli brand theme, stays (discoverable by name)
│       └── print-light.css          # neutral, stays
└── src/
    └── lib/
        └── brand-config.ts          # new: brand identity config
```

---

## Part 7: Page metadata

`src/app/layout.tsx` line 17:

```ts
title: "CV System - Geisli",
```

**Action:** Replace with:

```ts
title: brandConfig.name ? `CV System - ${brandConfig.name}` : 'CV System',
```

---

## Part 8: User-facing strings mentioning "Geisli"

`src/components/import/import-dropzone.tsx` line 26:

```ts
supported: 'Stöds: .json (Cinode eller Geisli-format)'  // sv
supported: 'Supported: .json (Cinode or Geisli format)'  // en
```

**Action:** Update to use the new format name or make the label generic:

```ts
supported: 'Stöds: .json (Cinode eller CV System-format)'
supported: 'Supported: .json (Cinode or CV System format)'
```

Or even simpler: `'Supported: .json files'` — the format details are in the import logic.

---

## Implementation order

1. Add `src/lib/brand-config.ts` with Geisli values (existing behaviour preserved).
2. Rename CSS variables globally (`--geisli-*` → `--brand-*` in all components) — use IDE global replace.
3. Rename `GeisliCVFile` → `CVFile`, `GeisliCVMetadata` → `CVMetadata` — use TypeScript rename refactor.
4. Add format migration shim in `detect.ts`; update `export.ts` to write `'cv-system'`.
5. Move logo assets to `/public/brands/geisli/`; update path in `print-layout-paginated.tsx` to use `brandConfig`.
6. Move `Design:explaination.ini` → `brands/geisli/brand-guide.ini`.
7. Update `layout.tsx` title.
8. Update import-dropzone user-facing string.
9. Run `grep -r "geisli" src/` — should return zero hits. All remaining `geisli` strings in `/public/themes/cv/print-geisli.css` and `/brands/geisli/` are correct.

## Verification

```bash
# Should return zero hits in src/ after de-branding:
grep -ri "geisli" src/

# Should still pass:
pnpm test
pnpm tsc

# Existing localStorage data with "geisli-cv" format should load correctly
# (test manually by saving data, doing the rename, and reloading)
```
