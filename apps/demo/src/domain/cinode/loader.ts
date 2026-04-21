/**
 * CV Data Loader
 *
 * Server-side function to load and extract CV data from fixture files.
 * This is designed to work with Next.js server components.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { extractCv, type ExtractionResult } from './extract';

export type LoaderResult = 
  | { success: true; data: ExtractionResult }
  | { success: false; error: string };

/**
 * Load CV data from fixture files
 *
 * @returns ExtractionResult with CV data or error message
 */
export async function loadCvFromFixtures(): Promise<LoaderResult> {
  const fixturesDir = path.join(process.cwd(), 'fixtures/cinode');
  const svPath = path.join(fixturesDir, 'cv-sv.json');
  const enPath = path.join(fixturesDir, 'cv-en.json');

  // Check if fixtures exist
  if (!existsSync(svPath)) {
    return {
      success: false,
      error: `Swedish CV fixture not found at ${svPath}. Please add your Cinode CV export.`,
    };
  }

  if (!existsSync(enPath)) {
    return {
      success: false,
      error: `English CV fixture not found at ${enPath}. Please add your Cinode CV export.`,
    };
  }

  try {
    const [svContent, enContent] = await Promise.all([
      readFile(svPath, 'utf-8'),
      readFile(enPath, 'utf-8'),
    ]);

    const rawSv = JSON.parse(svContent);
    const rawEn = JSON.parse(enContent);

    const result = extractCv(rawSv, rawEn);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to load CV fixtures: ${message}`,
    };
  }
}
