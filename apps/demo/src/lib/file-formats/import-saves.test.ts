/**
 * Test that each save file in saves/ can be imported successfully.
 * Run: pnpm test:run src/lib/file-formats/import-saves.test.ts
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { importFromJson } from './import';
import { detectFormat, isValidCVFile } from './detect';

const SAVES_DIR = join(process.cwd(), 'saves');

describe('Import save files from saves/', () => {
  const saveFiles = existsSync(SAVES_DIR)
    ? readdirSync(SAVES_DIR).filter((f) => f.endsWith('.json') && f.startsWith('john-shaw'))
    : [];

  if (saveFiles.length === 0) {
    it.skip('no save files in saves/ (optional)', () => {});
    return;
  }

  for (const filename of saveFiles) {
    describe(filename, () => {
      let raw: string;
      let parsed: unknown;

      it('reads and parses JSON', () => {
        const path = join(SAVES_DIR, filename);
        raw = readFileSync(path, 'utf-8');
        expect(raw.length).toBeGreaterThan(0);
        parsed = JSON.parse(raw) as unknown;
        expect(parsed).toBeDefined();
      });

      it('is detected as cv-system format', () => {
        expect(parsed).toBeDefined();
        const format = detectFormat(parsed);
        expect(format).toBe('cv-system');
      });

      it('passes isValidCVFile (required shape)', () => {
        expect(parsed).toBeDefined();
        expect(isValidCVFile(parsed)).toBe(true);
      });

      it('importFromJson succeeds and returns CV', () => {
        expect(parsed).toBeDefined();
        const result = importFromJson(parsed);
        expect(result.success, result.errors.join('; ')).toBe(true);
        expect(result.cv).toBeDefined();
        expect(result.cv?.name?.first).toBeDefined();
        expect(result.cv?.skills).toBeDefined();
        expect(Array.isArray(result.cv?.skills)).toBe(true);
        expect(result.cv?.roles).toBeDefined();
        expect(Array.isArray(result.cv?.roles)).toBe(true);
      });
    });
  }
});
