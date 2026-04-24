/**
 * File Format Browser Utilities
 *
 * Browser-specific surface: File, FileReader, Blob, URL, document, localStorage, fetch.
 * This file is NOT part of the core boundary. Import from here only in browser contexts
 * (components, hooks, store). Core files must never import from this module.
 */

import type { DomainCV } from '@cvsystem/core';
import type {
  ImportResult,
  ImportFileInfo,
  FileValidationError,
  ImportHistoryEntry,
  CVMetadata,
  RawCinodeData,
} from '@cvsystem/core';
import { IMPORT_HISTORY_KEY } from '@cvsystem/core';
import { importFromFileInfos, importFromJson } from '@cvsystem/core';
import { serializeToJson, generateFilename } from '@cvsystem/core';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.json'];

export function validateFile(file: File): FileValidationError | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      file: file.name,
      error: `Invalid file type "${extension}". Only .json files are supported.`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      file: file.name,
      error: `File is too large (${sizeMB}MB). Maximum size is 10MB.`,
    };
  }
  if (file.size === 0) {
    return { file: file.name, error: 'File is empty.' };
  }
  return null;
}

export function validateFiles(files: File[]): FileValidationError[] {
  return files.flatMap(f => {
    const err = validateFile(f);
    return err ? [err] : [];
  });
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

export async function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = reader.result as string;
        if (!text.trim()) {
          reject(new Error(`File "${file.name}" is empty or contains only whitespace.`));
          return;
        }
        resolve(JSON.parse(text));
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error(`Invalid JSON syntax in "${file.name}". Please check the file format.`));
        } else {
          reject(new Error(`Failed to parse "${file.name}": ${error}`));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file "${file.name}". The file may be corrupted or inaccessible.`));
    };

    reader.readAsText(file);
  });
}

export async function readFilesAsJson(files: File[]): Promise<ImportFileInfo[]> {
  const results: ImportFileInfo[] = [];
  for (const file of files) {
    const content = await readFileAsJson(file);
    results.push({ name: file.name, size: file.size, content, locale: null });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Import from browser File objects
// ---------------------------------------------------------------------------

export async function importFiles(files: File[]): Promise<ImportResult> {
  if (files.length === 0) {
    return {
      success: false,
      warnings: [],
      errors: ['No files provided. Please select at least one JSON file.'],
      detectedFormat: 'unknown',
    };
  }

  const validationErrors = validateFiles(files);
  if (validationErrors.length > 0) {
    return {
      success: false,
      warnings: [],
      errors: validationErrors.map(e => `${e.file}: ${e.error}`),
      detectedFormat: 'unknown',
    };
  }

  try {
    const fileInfos = await readFilesAsJson(files);
    const result = importFromFileInfos(fileInfos);

    if (result.success) {
      saveImportHistory({
        timestamp: new Date().toISOString(),
        format: result.detectedFormat,
        source: 'file',
        files: files.map(f => f.name),
        cvName: result.cv ? `${result.cv.name.first} ${result.cv.name.last}` : undefined,
      });
    }

    return result;
  } catch (error) {
    return {
      success: false,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error during import'],
      detectedFormat: 'unknown',
    };
  }
}

// ---------------------------------------------------------------------------
// Demo CV loader (fetch)
// ---------------------------------------------------------------------------

export async function loadDemoCV(): Promise<ImportResult> {
  try {
    const [svResponse, enResponse] = await Promise.all([
      fetch('/fixtures/cinode/cv-sv.json'),
      fetch('/fixtures/cinode/cv-en.json'),
    ]);

    if (!svResponse.ok || !enResponse.ok) {
      return {
        success: false,
        warnings: [],
        errors: ['Failed to load demo CV files. Please try again.'],
        detectedFormat: 'unknown',
      };
    }

    const [svData, enData] = await Promise.all([
      svResponse.json() as Promise<unknown>,
      enResponse.json() as Promise<unknown>,
    ]);

    const result = importFromJson(svData, enData);

    if (result.success) {
      result.warnings.push('Demo CV loaded successfully');
      saveImportHistory({
        timestamp: new Date().toISOString(),
        format: 'cinode',
        source: 'demo',
        files: ['cv-sv.json', 'cv-en.json'],
        cvName: result.cv ? `${result.cv.name.first} ${result.cv.name.last}` : undefined,
      });
    }

    return result;
  } catch (error) {
    return {
      success: false,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Failed to load demo CV'],
      detectedFormat: 'unknown',
    };
  }
}

// ---------------------------------------------------------------------------
// Import history (localStorage)
// ---------------------------------------------------------------------------

export function saveImportHistory(entry: ImportHistoryEntry): void {
  try {
    const history = getImportHistory();
    const updated = [entry, ...history.slice(0, 9)];
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getImportHistory(): ImportHistoryEntry[] {
  try {
    const stored = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored) as ImportHistoryEntry[];
    }
  } catch {
    // Ignore errors
  }
  return [];
}

export function getLastImport(): ImportHistoryEntry | null {
  const history = getImportHistory();
  return history.length > 0 ? history[0] : null;
}

export function clearImportHistory(): void {
  try {
    localStorage.removeItem(IMPORT_HISTORY_KEY);
  } catch {
    // Ignore errors
  }
}

// ---------------------------------------------------------------------------
// Download / clipboard (Blob, document, navigator)
// ---------------------------------------------------------------------------

export function downloadCvAsJson(
  cv: DomainCV,
  options: {
    filename?: string;
    metadata?: Partial<CVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): void {
  const json = serializeToJson(cv, {
    metadata: options.metadata,
    rawCinode: options.rawCinode,
    pretty: true,
  });

  const filename = options.filename ?? generateFilename(cv);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export async function copyCvToClipboard(
  cv: DomainCV,
  options: {
    metadata?: Partial<CVMetadata>;
    rawCinode?: RawCinodeData | null;
  } = {}
): Promise<boolean> {
  try {
    const json = serializeToJson(cv, {
      metadata: options.metadata,
      rawCinode: options.rawCinode,
      pretty: true,
    });
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
