# Theming

CV themes are plain CSS files that scope all selectors under a theme class (e.g. `.printTheme--acme`). The engine applies that class to the print container automatically based on the active theme id.

## How themes are discovered

1. CSS files in `apps/demo/public/themes/cv/*.css` are scanned at build time by `scripts/generate-print-theme-manifest.mjs`.
2. Brand-owned CSS files live in `brands/<name>/themes/*.css` and are copied to `public/themes/cv/` by `scripts/copy-brand-themes.mjs` (runs as `predev`/`prebuild`).
3. The generated `src/lib/print-themes.ts` lists every discovered theme with its `id`, `label`, `href`, and `className`.

To register a new theme: drop a CSS file into `brands/<name>/themes/` and run `pnpm dev` (or `predev` manually). No code changes needed.

## CSS class conventions

The print container receives two classes: `print-output--paginated` and the theme class (e.g. `printTheme--acme`). Scope all selectors under the theme class.

### Key CSS variables

| Variable | Purpose |
|---|---|
| `--cv-page-bg` | Page background |
| `--cv-text` | Primary text color |
| `--cv-muted` | Secondary / muted text |
| `--cv-muted-2` | Tertiary text |
| `--cv-border` | Light border |
| `--cv-border-strong` | Heavy border |

Declare these on `.printTheme--<id>` and they propagate everywhere.

### Block classes

| Selector | Content |
|---|---|
| `.block--cover` | Cover page (first page) |
| `.block--experience` | Work experience |
| `.block--education` | Education |
| `.block--courses-certification` | Courses & certifications |
| `.block--commitments` | Presentations & publications |
| `.block--competence` | Skills (Kompetenser) |

Each block has `.block-header` (section title area) and optional `.block-footer`.

### Cover page slots

The cover page is split into six stable slots:

| Slot class | Content |
|---|---|
| `.cover-slot-photo` | Profile photo |
| `.cover-slot-contacts` | Email, phone, address, website |
| `.cover-slot-roles` | Role labels (from cover page groups) |
| `.cover-slot-expertKnowledge` | Expert knowledge list |
| `.cover-slot-languages` | Languages list |
| `.cover-slot-featuredProjects` | Featured projects |

Reorder slots with CSS `order`:

```css
.printTheme--acme .cover-slot-photo    { order: 1; }
.printTheme--acme .cover-slot-contacts { order: 2; }
```

### Page break markers

When a block is configured to start on a new page, the engine sets `data-start-on-new-page="true"` on the block wrapper and applies `break-before: page` in `@media print` via a `::before` pseudo-element. Themes can override:

```css
@media print {
  .printTheme--acme .block[data-start-on-new-page="true"]::before {
    /* custom break behavior */
  }
}
```

## BrandConfig — layout integration

A brand declares per-theme layout values in `BrandConfig.themeLayoutConfigs`. The print engine reads these at runtime instead of hardcoding theme ids.

```ts
import type { BrandConfig } from '@cvsystem/core';

const brandConfig: BrandConfig = {
  name: 'Acme',
  defaultPrintThemeId: 'print-acme',
  logoPath: '/brands/acme/logo.svg',
  footerLogoPath: null,
  themeLayoutConfigs: {
    'print-acme': {
      headers: [],
      footers: [
        { id: 'body-footer', heightPx: 80, templateId: 'page-footer', repeatOn: 'allPages' },
      ],
      marginTopPx: 76,      // must match .cv-page padding-top
      marginBottomPx: 80,   // must match footer heightPx
      blockStartsNewPage: ['education', 'competence'],
      showHeaderOnCover: false,
      showFooterOnCover: false,
    },
  },
};
```

### ThemeLayoutConfig fields

| Field | Type | Default | Description |
|---|---|---|---|
| `headers` | `ThemeHeaderFooterDef[]` | `[]` | Header definitions (empty = no header) |
| `footers` | `ThemeHeaderFooterDef[]` | `[]` | Footer definitions |
| `marginTopPx` | `number` | base page margin | Must match `.cv-page` `padding-top` in CSS |
| `marginBottomPx` | `number` | base page margin | Must match footer `heightPx` |
| `blockStartsNewPage` | `string[]` | `[]` | Block types that always start on a new page |
| `showHeaderOnCover` | `boolean` | `true` | Whether to render a header on the cover page |
| `showFooterOnCover` | `boolean` | `true` | Whether to render a footer on the cover page |

### ThemeHeaderFooterDef fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable id referenced by sections (e.g. `'body-footer'`) |
| `heightPx` | `number` | Reserved height; paginator deducts this from available content height |
| `templateId` | `string` | Key used by the React renderer to pick the correct component |
| `repeatOn` | `'allPages' \| 'firstPageOnly' \| 'exceptFirstPage'` | Which pages show this element |

## Geisli reference theme

`brands/geisli/themes/print-geisli.css` is the canonical worked example. It demonstrates:

- Two-column layout (dark sidebar cover + single-column body pages)
- CSS variable token system with spacing scale
- Footer configuration (150px full-width bar, `exceptFirstPage`)
- `showHeaderOnCover: false` / `showFooterOnCover: false` so the cover has no chrome
- `blockStartsNewPage: ['education', 'competence']` — Education and Competence each start a fresh page

See [`brands/geisli/src/index.ts`](../brands/geisli/src/index.ts) for the matching `BrandConfig`.
