/**
 * File Import Utilities
 * 
 * Handles importing CV data from Geisli or Cinode JSON files.
 */

import type { DomainCV } from '@/domain/model/cv';
import type { 
  ImportResult, 
  ImportFileInfo, 
  GeisliCVFile,
  GeisliCVMetadata,
  RawCinodeData,
  ImportHistoryEntry,
} from './types';
import { IMPORT_HISTORY_KEY } from './types';
import { 
  detectFormat, 
  isValidGeisliFile, 
  categorizeFilesByLocale,
  detectCinodeLocale 
} from './detect';
import { extractCv } from '@/domain/cinode/extract';

// Validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.json'];
const ALLOWED_MIME_TYPES = ['application/json'];

/**
 * Validation errors
 */
export interface FileValidationError {
  file: string;
  error: string;
}

/**
 * Validate a file before reading
 */
export function validateFile(file: File): FileValidationError | null {
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      file: file.name,
      error: `Invalid file type "${extension}". Only .json files are supported.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      file: file.name,
      error: `File is too large (${sizeMB}MB). Maximum size is 10MB.`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      file: file.name,
      error: 'File is empty.',
    };
  }

  return null;
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): FileValidationError[] {
  const errors: FileValidationError[] = [];
  
  for (const file of files) {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    }
  }
  
  return errors;
}

/**
 * Read a File object as JSON
 */
export async function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const text = reader.result as string;
        
        // Check for common JSON issues
        if (!text.trim()) {
          reject(new Error(`File "${file.name}" is empty or contains only whitespace.`));
          return;
        }
        
        const content = JSON.parse(text);
        resolve(content);
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

/**
 * Read multiple files as JSON and create ImportFileInfo objects
 */
export async function readFilesAsJson(files: File[]): Promise<ImportFileInfo[]> {
  const results: ImportFileInfo[] = [];
  
  for (const file of files) {
    const content = await readFileAsJson(file);
    results.push({
      name: file.name,
      size: file.size,
      content,
      locale: null,
    });
  }
  
  return results;
}

/**
 * Import a Geisli CV file
 */
function importGeisliFile(data: unknown): ImportResult {
  if (!isValidGeisliFile(data)) {
    return {
      success: false,
      warnings: [],
      errors: ['Invalid Geisli CV file format'],
      detectedFormat: 'geisli-cv',
    };
  }

  const file = data as GeisliCVFile;
  
  return {
    success: true,
    cv: file.cv,
    metadata: file.metadata,
    rawCinode: file.rawCinode,
    warnings: [],
    errors: [],
    detectedFormat: 'geisli-cv',
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
      // Use it as both
      const singleFile = files[0];
      const result = extractCv(singleFile.content, singleFile.content);
      
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }
      
      const metadata: GeisliCVMetadata = {
        savedAt: new Date().toISOString(),
        importSource: 'cinode',
        importedAt: new Date().toISOString(),
        originalCinodeId: result.cv.id,
        locales: result.cv.locales,
      };

      return {
        success: true,
        cv: result.cv,
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

  // Extract CV from Cinode data
  const result = extractCv(svData, enData);

  if (result.warnings.length > 0) {
    warnings.push(...result.warnings);
  }

  // Build metadata
  const metadata: GeisliCVMetadata = {
    savedAt: new Date().toISOString(),
    importSource: 'cinode',
    importedAt: new Date().toISOString(),
    originalCinodeId: result.cv.id,
    locales: result.cv.locales,
  };

  // Note which locales were imported
  if (hasSv && hasEn) {
    warnings.push(`Imported bilingual CV (Swedish: ${categorized.sv?.name}, English: ${categorized.en?.name})`);
  } else if (hasSv) {
    warnings.push(`Imported Swedish CV only (${categorized.sv?.name})`);
  } else if (hasEn) {
    warnings.push(`Imported English CV only (${categorized.en?.name})`);
  }

  // Handle unknown files
  if (categorized.unknown.length > 0) {
    const unknownNames = categorized.unknown.map(f => f.name).join(', ');
    warnings.push(`Ignored files with unknown locale: ${unknownNames}`);
  }

  return {
    success: true,
    cv: result.cv,
    metadata,
    rawCinode: result.raw as RawCinodeData,
    warnings,
    errors,
    detectedFormat: 'cinode',
  };
}

/**
 * Main import function - handles both Geisli and Cinode formats
 */
export async function importFiles(files: File[]): Promise<ImportResult> {
  if (files.length === 0) {
    return {
      success: false,
      warnings: [],
      errors: ['No files provided. Please select at least one JSON file.'],
      detectedFormat: 'unknown',
    };
  }

  // Validate files before reading
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
    // Read all files
    const fileInfos = await readFilesAsJson(files);

    // Check the first file's format
    const firstFormat = detectFormat(fileInfos[0].content);

    // If it's a Geisli file, we only accept one file
    if (firstFormat === 'geisli-cv') {
      if (files.length > 1) {
        return {
          success: false,
          warnings: [],
          errors: ['Only one Geisli CV file can be imported at a time'],
          detectedFormat: 'geisli-cv',
        };
      }
      const result = importGeisliFile(fileInfos[0].content);
      
      // Track successful imports
      if (result.success) {
        saveImportHistory({
          timestamp: new Date().toISOString(),
          format: 'geisli-cv',
          source: 'file',
          files: [files[0].name],
          cvName: result.cv ? `${result.cv.name.first} ${result.cv.name.last}` : undefined,
        });
      }
      
      return result;
    }

    // Check if all files are Cinode format
    const allCinode = fileInfos.every(f => detectFormat(f.content) === 'cinode');
    
    if (!allCinode) {
      // Mixed formats
      return {
        success: false,
        warnings: [],
        errors: ['Mixed file formats detected. Please import either a single Geisli CV file or one/two Cinode JSON files.'],
        detectedFormat: 'unknown',
      };
    }

    // Import as Cinode (supports 1 or 2 files)
    if (files.length > 2) {
      return {
        success: false,
        warnings: [],
        errors: ['Too many Cinode files. Please provide 1 file (single locale) or 2 files (Swedish + English).'],
        detectedFormat: 'cinode',
      };
    }

    const result = importCinodeFiles(fileInfos);
    
    // Track successful imports
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

/**
 * Import from raw JSON data (already parsed)
 * Useful for importing from fixtures or programmatic sources
 */
export function importFromJson(data: unknown, secondaryData?: unknown): ImportResult {
  const format = detectFormat(data);

  if (format === 'geisli-cv') {
    return importGeisliFile(data);
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
    errors: ['Unknown file format. The file does not appear to be a valid Cinode or Geisli CV file.'],
    detectedFormat: 'unknown',
  };
}

/**
 * Load demo CV from fixtures
 * Fetches the Swedish and English Cinode fixtures and imports them
 */
export async function loadDemoCV(): Promise<ImportResult> {
  try {
    // Fetch both fixture files
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
      svResponse.json(),
      enResponse.json(),
    ]);

    // Import using the existing function
    const result = importFromJson(svData, enData);
    
    if (result.success) {
      result.warnings.push('Demo CV loaded successfully');
      
      // Track in history
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

/**
 * Save an import to history
 */
export function saveImportHistory(entry: ImportHistoryEntry): void {
  try {
    const history = getImportHistory();
    // Keep only last 10 imports
    const updated = [entry, ...history.slice(0, 9)];
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get import history
 */
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

/**
 * Get the last import entry
 */
export function getLastImport(): ImportHistoryEntry | null {
  const history = getImportHistory();
  return history.length > 0 ? history[0] : null;
}

/**
 * Clear import history
 */
export function clearImportHistory(): void {
  try {
    localStorage.removeItem(IMPORT_HISTORY_KEY);
  } catch {
    // Ignore errors
  }
}
