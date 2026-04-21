/**
 * File Import Utilities — pure core
 *
 * All functions here operate on already-parsed JSON (unknown / ImportFileInfo[]).
 * Browser-specific code (File, FileReader, localStorage, fetch) lives in browser.ts.
 */

import type { DomainCV } from '@/domain/model/cv';
import type {
  ImportResult,
  ImportFileInfo,
  CVFile,
  CVMetadata,
  RawCinodeData,
} from './types';
import {
  detectFormat,
  categorizeFilesByLocale,
  detectCinodeLocale,
} from './detect';
import { migrateFile } from './cv-file.schema';
import { extractCv } from '@/domain/cinode/extract';
import { normalizeAfterImport } from '@/lib/competence';
import type { RoleSkill } from '@/domain/model/cv';

/**
 * Import a cv-system file from already-parsed JSON
 */
function importCVFile(data: unknown): ImportResult {
  let file: CVFile;
  try {
    // migrateFile validates the full structure via Zod and runs any pending migrations.
    // Cast is safe: detectFormat() confirmed format === 'cv-system' before this is called.
    // TODO(A3): remove cast once CVFile is replaced by z.infer<typeof CVFileSchema>.
    file = migrateFile(data) as CVFile;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid CV file format';
    return {
      success: false,
      warnings: [],
      errors: [message],
      detectedFormat: 'cv-system',
    };
  }
  const normalized = normalizeAfterImport(file.cv);
  const preserveSkillVisibilityAndOrder = <T extends { id: string; skills: RoleSkill[]; skillOrder?: string[] }>(
    normalizedItems: T[],
    originalItems: T[],
  ): T[] => {
    return normalizedItems.map((item) => {
      const originalItem = originalItems.find((x) => x.id === item.id);
      if (!originalItem) return item;
      const originalSkillMapById = new Map(originalItem.skills.map((s) => [s.id, s]));
      const originalSkillMapByName = new Map(
        originalItem.skills.map((s) => [s.name.toLowerCase().trim(), s]),
      );
      return {
        ...item,
        skillOrder: originalItem.skillOrder,
        skills: item.skills.map((skill) => {
          let originalSkill = originalSkillMapById.get(skill.id);
          if (!originalSkill) {
            originalSkill = originalSkillMapByName.get(skill.name.toLowerCase().trim());
          }
          const preservedVisible = originalSkill?.visible !== undefined
            ? originalSkill.visible
            : (skill.visible !== undefined ? skill.visible : true);
          return {
            ...skill,
            visible: preservedVisible,
          };
        }),
      };
    });
  };
  const rolesWithPreservedVisibility = preserveSkillVisibilityAndOrder(
    normalized.roles,
    file.cv.roles,
  );
  const hobbyWithPreservedVisibility = preserveSkillVisibilityAndOrder(
    normalized.hobbyProjects ?? [],
    file.cv.hobbyProjects ?? [],
  );

  const cv: DomainCV = {
    ...normalized,
    roles: rolesWithPreservedVisibility,
    hobbyProjects: hobbyWithPreservedVisibility,
    educations: file.cv.educations ?? normalized.educations ?? [],
    trainings: file.cv.trainings ?? normalized.trainings ?? [],
  };

  return {
    success: true,
    cv,
    metadata: file.metadata,
    rawCinode: file.rawCinode,
    warnings: [],
    errors: [],
    detectedFormat: 'cv-system',
  };
}

/**
 * Import from Cinode JSON file(s)
 * Supports single file (one locale) or two files (bilingual)
 */
function importCinodeFiles(files: ImportFileInfo[]): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Categorize files by locale
  const categorized = categorizeFilesByLocale(files);

  // We need at least one valid Cinode file
  const hasSv = categorized.sv !== null;
  const hasEn = categorized.en !== null;

  if (!hasSv && !hasEn) {
    // Maybe it's a single file without clear locale
    if (files.length === 1) {
      const singleFile = files[0];
      const result = extractCv(singleFile.content, singleFile.content);

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      const metadata: CVMetadata = {
        savedAt: new Date().toISOString(),
        importSource: 'cinode',
        importedAt: new Date().toISOString(),
        originalCinodeId: result.cv.id,
        locales: result.cv.locales,
      };

      return {
        success: true,
        cv: normalizeAfterImport(result.cv),
        metadata,
        rawCinode: result.raw as RawCinodeData,
        warnings,
        errors,
        detectedFormat: 'cinode',
      };
    }

    return {
      success: false,
      warnings,
      errors: ['Could not detect locale from any Cinode file. Please ensure files have valid language settings.'],
      detectedFormat: 'cinode',
    };
  }

  // Use the available files, fall back to the other locale if one is missing
  const svData = categorized.sv?.content ?? categorized.en?.content;
  const enData = categorized.en?.content ?? categorized.sv?.content;

  const result = extractCv(svData, enData);

  if (result.warnings.length > 0) {
    warnings.push(...result.warnings);
  }

  const metadata: CVMetadata = {
    savedAt: new Date().toISOString(),
    importSource: 'cinode',
    importedAt: new Date().toISOString(),
    originalCinodeId: result.cv.id,
    locales: result.cv.locales,
  };

  if (hasSv && hasEn) {
    warnings.push(`Imported bilingual CV (Swedish: ${categorized.sv?.name}, English: ${categorized.en?.name})`);
  } else if (hasSv) {
    warnings.push(`Imported Swedish CV only (${categorized.sv?.name})`);
  } else if (hasEn) {
    warnings.push(`Imported English CV only (${categorized.en?.name})`);
  }

  if (categorized.unknown.length > 0) {
    const unknownNames = categorized.unknown.map(f => f.name).join(', ');
    warnings.push(`Ignored files with unknown locale: ${unknownNames}`);
  }

  return {
    success: true,
    cv: normalizeAfterImport(result.cv),
    metadata,
    rawCinode: result.raw as RawCinodeData,
    warnings,
    errors,
    detectedFormat: 'cinode',
  };
}

/**
 * Import from already-parsed ImportFileInfo objects.
 * Pure function — no browser APIs. Called by browser.ts after reading File objects.
 */
export function importFromFileInfos(fileInfos: ImportFileInfo[]): ImportResult {
  if (fileInfos.length === 0) {
    return {
      success: false,
      warnings: [],
      errors: ['No files provided.'],
      detectedFormat: 'unknown',
    };
  }

  const firstFormat = detectFormat(fileInfos[0].content);

  if (firstFormat === 'cv-system') {
    if (fileInfos.length > 1) {
      return {
        success: false,
        warnings: [],
        errors: ['Only one CV file can be imported at a time'],
        detectedFormat: 'cv-system',
      };
    }
    return importCVFile(fileInfos[0].content);
  }

  const allCinode = fileInfos.every(f => detectFormat(f.content) === 'cinode');

  if (!allCinode) {
    return {
      success: false,
      warnings: [],
      errors: ['Mixed file formats detected. Please import either a single CV file or one/two Cinode JSON files.'],
      detectedFormat: 'unknown',
    };
  }

  if (fileInfos.length > 2) {
    return {
      success: false,
      warnings: [],
      errors: ['Too many Cinode files. Please provide 1 file (single locale) or 2 files (Swedish + English).'],
      detectedFormat: 'cinode',
    };
  }

  return importCinodeFiles(fileInfos);
}

/**
 * Import from raw JSON data (already parsed).
 * Useful for importing from fixtures or programmatic sources.
 */
export function importFromJson(data: unknown, secondaryData?: unknown): ImportResult {
  const format = detectFormat(data);

  if (format === 'cv-system') {
    return importCVFile(data);
  }

  if (format === 'cinode') {
    const files: ImportFileInfo[] = [
      { name: 'primary.json', size: 0, content: data, locale: detectCinodeLocale(data) },
    ];

    if (secondaryData) {
      files.push({
        name: 'secondary.json',
        size: 0,
        content: secondaryData,
        locale: detectCinodeLocale(secondaryData),
      });
    }

    return importCinodeFiles(files);
  }

  return {
    success: false,
    warnings: [],
    errors: ['Unknown file format. The file does not appear to be a valid CV or Cinode file.'],
    detectedFormat: 'unknown',
  };
}
