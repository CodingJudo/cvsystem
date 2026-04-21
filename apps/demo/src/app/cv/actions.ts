'use server';

import type { DomainCV } from '@/domain/model/cv';
import { loadCvFromFixtures } from '@/domain/cinode/loader';

export type LoadFixturesResult =
  | { success: true; cv: DomainCV; warnings: string[] }
  | { success: false; error: string };

/**
 * Load CV from fixture files (fixtures/cinode/cv-sv.json, cv-en.json).
 * Called when the user clicks "Import from fixtures" so they can load sample data on demand.
 */
export async function loadCvFromFixturesAction(): Promise<LoadFixturesResult> {
  const result = await loadCvFromFixtures();
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return {
    success: true,
    cv: result.data.cv,
    warnings: result.data.warnings,
  };
}
