'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { ImportResult, FileValidationError } from '@/lib/file-formats';
import { importFiles, validateFiles, loadDemoCV } from '@/lib/file-formats';

interface ImportDropzoneProps {
  onImport: (result: ImportResult) => void;
  onCancel?: () => void;
  disabled?: boolean;
  locale?: 'sv' | 'en';
}

export function ImportDropzone({ onImport, onCancel, disabled, locale = 'en' }: ImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    dropFiles: locale === 'sv' ? 'Släpp filer här' : 'Drop files here',
    orClick: locale === 'sv' ? 'eller klicka för att bläddra' : 'or click to browse',
    supported: locale === 'sv' ? 'Stöds: .json (Cinode eller Geisli-format)' : 'Supported: .json (Cinode or Geisli format)',
    cinodeInfo: locale === 'sv' ? 'För Cinode-import kan du släppa:' : 'For Cinode import, you can drop:',
    singleFile: locale === 'sv' ? 'En fil (ett språk)' : 'Single file (one language)',
    twoFiles: locale === 'sv' ? 'Två filer (svenska + engelska för tvåspråkigt CV)' : 'Two files (Swedish + English for bilingual CV)',
    selectedFiles: locale === 'sv' ? 'Valda filer' : 'Selected files',
    clear: locale === 'sv' ? 'Rensa' : 'Clear',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    import: locale === 'sv' ? 'Importera' : 'Import',
    importing: locale === 'sv' ? 'Importerar...' : 'Importing...',
    loadDemo: locale === 'sv' ? 'Ladda demo-CV' : 'Load Demo CV',
    loadingDemo: locale === 'sv' ? 'Laddar demo...' : 'Loading demo...',
    or: locale === 'sv' ? 'eller' : 'or',
    validationErrors: locale === 'sv' ? 'Valideringsfel' : 'Validation errors',
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    // Filter to JSON files only
    const jsonFiles = files.filter(
      f => f.type === 'application/json' || f.name.endsWith('.json')
    );

    if (jsonFiles.length === 0) {
      setValidationErrors([{ file: 'Selection', error: 'No valid JSON files found.' }]);
      return;
    }

    // Validate files
    const errors = validateFiles(jsonFiles);
    setValidationErrors(errors);
    
    // Still set files even if there are errors (user might fix them)
    setSelectedFiles(jsonFiles);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  }, [disabled, handleFilesSelected]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0 || validationErrors.length > 0) return;

    setIsLoading(true);
    setLoadingMessage(t.importing);
    try {
      const result = await importFiles(selectedFiles);
      onImport(result);
    } catch (error) {
      onImport({
        success: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Import failed'],
        detectedFormat: 'unknown',
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setLoadingMessage(t.loadingDemo);
    try {
      const result = await loadDemoCV();
      onImport(result);
    } catch (error) {
      onImport({
        success: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Failed to load demo'],
        detectedFormat: 'unknown',
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Loading overlay */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 p-4 bg-[var(--geisli-primary)]/10 rounded-lg">
          <div className="w-5 h-5 border-2 border-[var(--geisli-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--geisli-primary)] font-medium">{loadingMessage}</span>
        </div>
      )}

      {/* Dropzone area */}
      {!isLoading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging 
              ? 'border-[var(--geisli-primary)] bg-[var(--geisli-primary)]/5' 
              : 'border-gray-300 hover:border-[var(--geisli-primary)]/50 hover:bg-gray-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <p className="text-lg font-medium text-[var(--geisli-secondary)]">
              {t.dropFiles}
            </p>
            <p className="text-sm text-gray-500">
              {t.orClick}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {t.supported}
            </p>
          </div>
        </div>
      )}

      {/* Info text */}
      {!isLoading && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>{t.cinodeInfo}</p>
          <ul className="list-disc list-inside text-gray-500 ml-2">
            <li>{t.singleFile}</li>
            <li>{t.twoFiles}</li>
          </ul>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-800 mb-1">{t.validationErrors}</p>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {validationErrors.map((e, i) => (
              <li key={i}>{e.file}: {e.error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && !isLoading && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-[var(--geisli-secondary)]">
              {t.selectedFiles} ({selectedFiles.length})
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); handleClearFiles(); }}
              className="text-gray-500 hover:text-gray-700"
            >
              {t.clear}
            </Button>
          </div>
          <ul className="space-y-1">
            {selectedFiles.map((file, i) => {
              const hasError = validationErrors.some(e => e.file === file.name);
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={hasError ? 'text-red-600' : 'text-green-600'}>
                    {hasError ? '✗' : '✓'}
                  </span>
                  <span className={hasError ? 'text-red-600' : ''}>{file.name}</span>
                  <span className="text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-between pt-2">
        <Button
          variant="outline"
          onClick={handleLoadDemo}
          disabled={isLoading || disabled}
          className="text-[var(--geisli-primary)] border-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/10"
        >
          {t.loadDemo}
        </Button>
        
        <div className="flex gap-3">
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              {t.cancel}
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || validationErrors.length > 0 || isLoading || disabled}
            className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
          >
            {t.import}
          </Button>
        </div>
      </div>
    </div>
  );
}
