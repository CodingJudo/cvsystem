# Brand Packages

A brand package provides visual identity and layout configuration for a cvsystem deployment. The `@geisli/brand` package in `brands/geisli/` is the canonical reference implementation.

## What a brand package contains

| Thing | Purpose |
|---|---|
| `BrandConfig` | Display name, default theme, logo paths, per-theme layout config |
| Theme CSS | Print stylesheet scoped under the brand's theme class |
| Assets | Logos, fonts, or other static files served from `public/brands/<name>/` |

## Package structure

```
brands/
  acme/
    src/
      index.ts          # exports brandConfig
    themes/
      print-acme.css    # theme CSS (copied to public/themes/cv/ at build time)
    assets/
      logo.svg          # served from public/brands/acme/
    package.json        # name: "@acme/brand", private: true
    tsconfig.json
```

## Step-by-step: creating a brand package

### 1. Create the package

```bash
mkdir -p brands/acme/src brands/acme/themes brands/acme/assets
```

**`brands/acme/package.json`**

```json
{
  "name": "@acme/brand",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@cvsystem/core": "workspace:*"
  }
}
```

**`brands/acme/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": {
      "@cvsystem/core": ["../../packages/core/src/index.ts"]
    }
  },
  "include": ["src/**/*.ts"]
}
```

### 2. Declare BrandConfig

**`brands/acme/src/index.ts`**

```ts
import type { BrandConfig } from '@cvsystem/core';
import { DEFAULT_BRAND_CONFIG } from '@cvsystem/core';

/** 20 mm at 96 dpi — matches .cv-page padding-top */
const MARGIN_20MM_PX = Math.round((20 / 25.4) * 96);

export const brandConfig: BrandConfig = {
  ...DEFAULT_BRAND_CONFIG,
  name: 'Acme',
  defaultPrintThemeId: 'print-acme',
  logoPath: '/brands/acme/logo.svg',    // served from public/brands/acme/
  footerLogoPath: null,
  themeLayoutConfigs: {
    'print-acme': {
      headers: [],
      footers: [
        {
          id: 'body-footer',
          heightPx: 80,               // must match CSS .cv-page-footer height
          templateId: 'page-footer',
          repeatOn: 'allPages',
        },
      ],
      marginTopPx: MARGIN_20MM_PX,    // must match CSS .cv-page padding-top
      marginBottomPx: 80,             // must match footer heightPx
      blockStartsNewPage: ['education', 'competence'],
      showHeaderOnCover: false,
      showFooterOnCover: false,
    },
  },
};

export type { BrandConfig };
export { DEFAULT_BRAND_CONFIG };
```

### 3. Write the theme CSS

**`brands/acme/themes/print-acme.css`**

```css
/* All selectors scoped to the theme class. */
.printTheme--acme {
  /* Color tokens */
  --cv-page-bg: #ffffff;
  --cv-text: #111827;
  --cv-muted: #4b5563;
  --cv-muted-2: #6b7280;
  --cv-border: #e5e7eb;
  --cv-border-strong: #000000;

  font-family: "Inter", sans-serif;
}

/* Cover page */
.printTheme--acme .cover-page {
  background: #1e293b;
  color: #f9fafb;
  padding: 2rem;
}

/* Body footer */
.printTheme--acme .cv-page-footer {
  height: 80px;
  background: #1e293b;
  display: flex;
  align-items: center;
  padding: 0 2rem;
}

@media print {
  /* Page break markers */
  .printTheme--acme .block[data-start-on-new-page="true"]::before {
    content: "";
    display: block;
    break-before: page;
  }
}
```

See [`docs/theming.md`](theming.md) for the full list of CSS conventions and CSS variables.

### 4. Add assets

Place logos under `brands/acme/assets/`. Then configure the app to serve them from `public/brands/acme/` — either copy them in a prebuild script or symlink them. The `logoPath` and `footerLogoPath` fields in `BrandConfig` must match the public URL (e.g. `/brands/acme/logo.svg`).

### 5. Wire the brand into the app

In the demo app, brand config is consumed via `apps/demo/src/lib/brand-config.ts`:

```ts
// apps/demo/src/lib/brand-config.ts
export { brandConfig } from '@acme/brand';
```

Add `@acme/brand` to `apps/demo/package.json` dependencies:

```json
"@acme/brand": "workspace:*"
```

Run `pnpm install`. The copy script picks up the theme CSS automatically on the next `pnpm dev`.

## Margin alignment (important)

`marginTopPx` and `marginBottomPx` in `ThemeLayoutConfig` must exactly match the CSS:

| Config field | Matching CSS |
|---|---|
| `marginTopPx` | `.cv-page { padding-top: <value>px }` |
| `marginBottomPx` | `.cv-page-footer { height: <value>px }` and footer `heightPx` |

If these drift, the paginator will either clip content or leave blank space at the bottom of pages.

## Reference: Geisli brand

`brands/geisli/` is the fully worked reference brand. It demonstrates:
- Two-column cover layout (dark sidebar + white main)
- 150 px full-width footer on body pages
- `showHeaderOnCover: false` / `showFooterOnCover: false`
- CSS variable token system with a spacing scale

Read [`brands/geisli/src/index.ts`](../brands/geisli/src/index.ts) and [`brands/geisli/themes/print-geisli.css`](../brands/geisli/themes/print-geisli.css) side by side with this guide.
