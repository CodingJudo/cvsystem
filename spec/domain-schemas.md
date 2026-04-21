# Domain Schemas — Zod Validation Plan (Phase A1)

## Goal

Add runtime-validated Zod schemas for the `DomainCV` model and the file format envelope. These schemas become the single source of truth for data shape, shared across the base system and any fork (including the Firebase repo).

## Why

- **Silent failure today.** `isValidGeisliFile()` in `detect.ts` checks a handful of fields (`format`, `version`, `metadata.savedAt`, `cv.id`, `cv.skills` array exists). Anything deeper — a role with a missing `description`, a skill with a string where a number should be — passes silently.
- **Firebase merge needs a contract.** When a Firestore adapter hydrates a `DomainCV`, there's no validation. A corrupt document would propagate into the UI.
- **Schema versioning.** The file format has `version: '1.0'` but no migration mechanism. Adding `schemaVersion` and a migration registry gives us a safe path for future model changes (skill-tree in Phase B).
- **Zod is already a dependency** (`zod@4.2.1` in `package.json`), unused.

## Plan

### 1. Create `src/domain/model/cv.schema.ts`

One schema per interface in `cv.ts`. Each schema is named `<Type>Schema` (e.g., `BilingualTextSchema`, `SkillSchema`, `DomainCVSchema`).

**Types to cover (in dependency order):**

| Interface | Key validations |
|-----------|----------------|
| `BilingualText` | `{ sv: z.string().nullable(), en: z.string().nullable() }` |
| `Contacts` | All nullable strings |
| `Locale` | `z.enum(['sv', 'en'])` |
| `Skill` | `id` required; `name` required; `level`, `years`, `calculatedYears`, `overriddenYears` optional nullable numbers |
| `RoleSkill` | `id`, `name` required; `level`, `category` optional nullable; `visible` optional boolean |
| `Role` | `id` required; `title`, `company` nullable; `description: BilingualTextSchema`; `skills: z.array(RoleSkillSchema)`; `visible: z.boolean()` |
| `HobbyProject` | Same shape as Role with `url` and `isCurrent` |
| `Training` | `trainingType: z.union([z.literal(0), z.literal(1), z.literal(2)])`; `hideDescription` optional |
| `Education` | `schoolName` required; `hideDescription` optional |
| `Commitment` | `commitmentType: z.enum([...])` |
| `FeaturedProject` | `roleId` nullable; `visible` boolean |
| `CoverPageGroups` | Three string arrays |
| `PrintBreakBefore` | Optional string arrays keyed by block type |
| `DomainCV` | Composes all of the above |

**Approach:** Derive schemas alongside existing TS interfaces. Do NOT replace `DomainCV` with `z.infer<typeof DomainCVSchema>` yet — keep both in lockstep. This avoids churning every file that imports `DomainCV`. Collapse to inferred-only in a later phase once all consumers are validated.

Add a test file `cv.schema.test.ts` that:
- Validates a known-good DomainCV fixture passes.
- Validates that stripping required fields causes a parse failure.
- Validates that the inferred type matches the hand-written `DomainCV` (compile-time check via `satisfies`).

### 2. Create `src/lib/file-formats/cv-file.schema.ts`

Schema for the file envelope (currently `GeisliCVFile`, will become `CVFile` after de-branding):

```ts
const CVFileSchema = z.object({
  format: z.string(),  // Accept any string, then check against known formats
  version: z.string(),
  schemaVersion: z.number().int().min(1).optional().default(1),
  metadata: CVMetadataSchema,
  cv: DomainCVSchema,
  rawCinode: RawCinodeDataSchema.optional().nullable(),
});
```

**Schema versioning:**
- Add `schemaVersion: number` to the file format. Defaults to `1` when not present (backward compat).
- Add a `CURRENT_SCHEMA_VERSION = 1` constant.
- Add a `migrateFile(file: unknown): CVFile` function that:
  1. Parses with a loose schema to extract `schemaVersion`.
  2. Runs migration functions in order (e.g., `v1ToV2`, `v2ToV3`) until current.
  3. Validates the result with `CVFileSchema.parse()`.
  4. Returns the validated file.
- Phase B will bump `schemaVersion` to 2 when adding `skillTree` and `renderSpecs`.

### 3. Enforce validation at I/O boundaries

| Boundary | File | Current validation | Change |
|----------|------|-------------------|--------|
| Geisli file import | `src/lib/file-formats/import.ts` (`importGeisliFile`) | `isValidGeisliFile()` type guard | Replace with `migrateFile()` → `CVFileSchema.parse()` |
| Cinode extract output | `src/domain/cinode/extract.ts` (return of `extractCv`) | None | Add `DomainCVSchema.parse(cv)` before returning `ExtractionResult` |
| localStorage hydration | `src/lib/store/cv-store.tsx` (line ~970) | `parsed.format === 'geisli-cv' && parsed.cv` | Replace with `migrateFile(parsed)` |
| `readCvFromStorage()` | `src/lib/store/cv-store.tsx` (line ~1042) | Same as above | Same |
| Export (write path) | `src/lib/file-formats/export.ts` | None (we trust our own output) | Optional: `CVFileSchema.parse()` in dev mode only for early bug detection |

### 4. Error handling at boundaries

When `parse()` fails:
- **Import:** Surface as an `ImportResult` error. Show the user "File validation failed: [first zod issue]".
- **localStorage hydration:** Log a console warning, fall back to `initialCv` (minimal). Do not crash.
- **Cinode extract:** This is a programmer error (our extract produced bad data). Throw — this should never happen in production and must be caught in tests.

### 5. Files to create/modify

| Action | File |
|--------|------|
| Create | `src/domain/model/cv.schema.ts` |
| Create | `src/domain/model/cv.schema.test.ts` |
| Create | `src/lib/file-formats/cv-file.schema.ts` |
| Modify | `src/lib/file-formats/types.ts` — add `schemaVersion` field |
| Modify | `src/lib/file-formats/import.ts` — use schema validation |
| Modify | `src/lib/file-formats/detect.ts` — simplify `isValidGeisliFile` to delegate to schema |
| Modify | `src/lib/file-formats/export.ts` — stamp `schemaVersion` on output |
| Modify | `src/lib/store/cv-store.tsx` — use `migrateFile` for hydration |
| Modify | `src/domain/cinode/extract.ts` — validate output |

### 6. Migration registry shape

```ts
// src/lib/file-formats/migrations.ts
type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  // 1 → 2: Phase B adds skillTree and renderSpecs
  // 2: (data) => ({ ...data, cv: { ...data.cv, skillTree: [], renderSpecs: [] } }),
};

export function migrateToLatest(data: unknown): unknown {
  // ... apply migrations in order from current schemaVersion to CURRENT_SCHEMA_VERSION
}
```

### 7. What NOT to do

- Do not replace `DomainCV` interface with `z.infer` yet. That's a separate phase.
- Do not add validation in the middle of the reducer or between hooks. Only at I/O boundaries.
- Do not add Cinode input validation (we can't control Cinode's output shape). Only validate our extract *output*.
