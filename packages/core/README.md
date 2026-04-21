# @cvsystem/core

Pure TypeScript package — the heart of cvsystem. No browser APIs, no React, no framework coupling.

## Install

```bash
pnpm add @cvsystem/core
```

## Contents

| Module | What it provides |
|---|---|
| Domain model | `DomainCV`, `Skill`, `Role`, `Training`, `Education`, `Commitment`, `RenderSpec` |
| Zod schemas | Runtime validation at I/O boundaries (`cvSchema`, `cvFileSchema`) |
| File formats | Import/export — Cinode JSON → `DomainCV`, `DomainCV` → `CVFile` |
| Storage interface | `StorageAdapter`, `CVStorageAdapter`, `MemoryAdapter` |
| Brand config | `BrandConfig`, `ThemeLayoutConfig`, `DEFAULT_BRAND_CONFIG` |
| Pagination engine | `paginateCv`, `buildSectionsFromCv` |
| RenderSpec | `applyRenderSpec`, `resolveRoleSkills` |
| Ontology | MIND tech ontology lookup |
| Utilities | `getBilingualText`, `formatDate`, `cvReducer`, `competenceService` |

## Domain model

```ts
import type { DomainCV, Skill, Role, RenderSpec, Locale } from '@cvsystem/core';

interface DomainCV {
  id: string;
  locales: Locale[];          // ['sv', 'en']
  name: { first: string; last: string };
  title: BilingualText;       // { sv: '...', en: '...' }
  summary: BilingualText;
  skills: Skill[];
  roles: Role[];
  trainings: Training[];
  educations: Education[];
  commitments: Commitment[];
  renderSpecs?: RenderSpec[];
  activeRenderSpecId?: string | null;
}
```

## Creating a CV

```ts
import { createMinimalCvFromSeed } from '@cvsystem/core';

const cv = createMinimalCvFromSeed({ firstName: 'Jane', lastName: 'Doe' });
```

## Validating at I/O boundaries

```ts
import { cvFileSchema } from '@cvsystem/core';

const result = cvFileSchema.safeParse(rawJson);
if (!result.success) console.error(result.error.issues);
const file = result.data; // CVFile — validated
```

## Importing from Cinode JSON

```ts
import { importFromJson, detectFormat } from '@cvsystem/core';

const format = detectFormat(rawJson);      // 'cinode-sv' | 'cinode-en' | 'cv-system'
const result = await importFromJson(rawJson, { extractors: [...] });
// result.cv — DomainCV
```

## File format

```ts
import { createCVFile, serializeToJson } from '@cvsystem/core';

const file = createCVFile(cv, { metadata: { source: 'manual' } });
// { format: 'cv-system', version: '2.0', cv, metadata }

const json = serializeToJson(file); // stable JSON string
```

## Storage adapter interface

```ts
import type { StorageAdapter } from '@cvsystem/core';

class MyAdapter implements StorageAdapter {
  readonly id = 'my-adapter';
  async save(cv: DomainCV, options: SaveOptions): Promise<void> { ... }
  async load(): Promise<CVFile | null> { ... }
}
```

See [`docs/storage-adapters.md`](../../docs/storage-adapters.md) for a full implementation guide.

## RenderSpec (audience views)

```ts
import { applyRenderSpec } from '@cvsystem/core';

// Filter and transform a CV for a specific audience
const rendered = applyRenderSpec(cv, spec, 'en');
// rendered.roles — hidden roles excluded, skills grouped by groupAs
```

## Brand config

```ts
import type { BrandConfig } from '@cvsystem/core';
import { DEFAULT_BRAND_CONFIG } from '@cvsystem/core';

const myBrand: BrandConfig = {
  ...DEFAULT_BRAND_CONFIG,
  name: 'Acme',
  defaultPrintThemeId: 'print-acme',
  logoPath: '/brands/acme/logo.svg',
  footerLogoPath: null,
  themeLayoutConfigs: {
    'print-acme': {
      footers: [{ id: 'footer', heightPx: 80, templateId: 'page-footer', repeatOn: 'allPages' }],
      marginTopPx: 76,
      marginBottomPx: 80,
      blockStartsNewPage: ['education'],
      showHeaderOnCover: false,
      showFooterOnCover: false,
    },
  },
};
```

See [`docs/brands.md`](../../docs/brands.md) for a full brand package guide.

## Schema versioning

`CVFile.version` follows `MAJOR.MINOR`:

| Version | Change |
|---|---|
| `1.0` | Initial `geisli-cv` format |
| `2.0` | Renamed format to `cv-system`; added `renderSpecs`, `ontologyRef`, `groupAs` |

`migrateFile(raw)` upgrades old files to the current schema automatically on import. Consumers must not assume a specific version on load — always run through `migrateFile` or use `cvFileSchema.parse`.
