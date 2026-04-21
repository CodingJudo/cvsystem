/**
 * Zod schema for the CV file envelope (CVFile).
 *
 * Provides runtime validation and the migration registry for schema versioning.
 * Phase B will bump CURRENT_SCHEMA_VERSION to 2 when adding skillTree/renderSpecs.
 */

import { z } from 'zod';
import { DomainCVSchema } from '../domain/model/cv.schema';

export const CURRENT_SCHEMA_VERSION = 2;

export const CVMetadataSchema = z.object({
  savedAt: z.string(),
  importSource: z.enum(['cinode', 'manual']).nullable(),
  importedAt: z.string().nullable(),
  originalCinodeId: z.string().nullable(),
  locales: z.array(z.enum(['sv', 'en'])),
});

export const RawCinodeDataSchema = z.object({
  sv: z.unknown(),
  en: z.unknown(),
});

export const CVFileSchema = z.object({
  format: z.string(),
  version: z.string(),
  /** Defaults to 1 when absent — backward compatible with files written before versioning. */
  schemaVersion: z.number().optional().default(CURRENT_SCHEMA_VERSION),
  metadata: CVMetadataSchema,
  cv: DomainCVSchema,
  rawCinode: RawCinodeDataSchema.optional().nullable(),
});

// ---------------------------------------------------------------------------
// Migration registry
// ---------------------------------------------------------------------------

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by target version. Entry `migrations[2]` migrates data from v1 → v2.
 */
const migrations: Record<number, MigrationFn> = {
  // v1 → v2: add renderSpecs and activeRenderSpecId to cv; add ontologyRef/groupAs to skills
  // All new fields are optional so existing data loads without changes.
  2: (data) => {
    const cv = data.cv as Record<string, unknown> | undefined;
    if (!cv) return data;
    return {
      ...data,
      cv: {
        ...cv,
        renderSpecs: cv.renderSpecs ?? [],
        activeRenderSpecId: cv.activeRenderSpecId ?? null,
        skills: Array.isArray(cv.skills)
          ? (cv.skills as Record<string, unknown>[]).map((s) => ({
              ...s,
              ontologyRef: s.ontologyRef ?? null,
              groupAs: s.groupAs ?? null,
            }))
          : cv.skills,
      },
    };
  },
};

/**
 * Validate and migrate a raw parsed file to the current schema version.
 *
 * - Reads `schemaVersion` from the raw data (defaults to 1 if absent).
 * - Applies migration functions in order up to CURRENT_SCHEMA_VERSION.
 * - Validates the result with CVFileSchema.parse() — throws ZodError on failure.
 *
 * Callers decide how to handle the thrown error:
 * - Import boundary: catch → return ImportResult error
 * - localStorage: catch → console.warn + fall back to initialCv
 * - Cinode extract: let it throw (programmer error, caught in tests)
 */
export function migrateFile(data: unknown): z.infer<typeof CVFileSchema> {
  if (typeof data !== 'object' || data === null) {
    throw new Error('File validation failed: expected an object');
  }

  let current = data as Record<string, unknown>;
  const fromVersion = typeof current.schemaVersion === 'number' ? current.schemaVersion : 1;

  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const fn = migrations[v];
    if (fn) current = fn(current);
  }

  return CVFileSchema.parse(current);
}
