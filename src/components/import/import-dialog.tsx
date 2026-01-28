'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportDropzone } from './import-dropzone';
import { ConflictResolver } from './conflict-resolver';
import type { ImportResult } from '@/lib/file-formats';
import type { DomainCV } from '@/domain/model/cv';
import { detectConflicts, type ConflictAnalysis } from '@/lib/conflict';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
  hasExistingData?: boolean;
  currentCv?: DomainCV | null;
  locale?: 'sv' | 'en';
}

export function ImportDialog({ 
  isOpen, 
  onClose, 
  onImportComplete,
  hasExistingData = false,
  currentCv = null,
  locale = 'en',
}: ImportDialogProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null);

  if (!isOpen) return null;

  const handleImport = (result: ImportResult) => {
    setImportResult(result);
    
    if (result.success && hasExistingData && currentCv && result.cv) {
      // Detect conflicts between current and incoming
      const analysis = detectConflicts(currentCv, result.cv);
      
      if (analysis.hasConflicts) {
        // Show conflict resolver
        setConflictAnalysis(analysis);
        setShowConflictResolver(true);
      } else {
        // No conflicts, show simple replace confirmation
        setShowConfirmReplace(true);
      }
    } else if (result.success) {
      // No existing data, proceed directly
      onImportComplete(result);
      handleClose();
    }
    // If not successful, result will show errors in the UI
  };

  const handleConflictResolved = (mergedCv: DomainCV) => {
    if (importResult) {
      // Create a new result with the merged CV
      const mergedResult: ImportResult = {
        ...importResult,
        cv: mergedCv,
        warnings: [...importResult.warnings, 'Conflicts resolved and merged'],
      };
      onImportComplete(mergedResult);
      handleClose();
    }
  };

  const handleConfirmReplace = () => {
    if (importResult) {
      onImportComplete(importResult);
      handleClose();
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setShowConfirmReplace(false);
    setShowConflictResolver(false);
    setConflictAnalysis(null);
    onClose();
  };

  const t = {
    title: locale === 'sv' ? 'Importera CV-data' : 'Import CV Data',
    description: locale === 'sv' 
      ? 'Importera från Cinode eller en sparad fil' 
      : 'Import from Cinode or a saved file',
    replaceWarning: locale === 'sv'
      ? 'Du har redan data i systemet. Att importera kommer att ersätta alla befintliga data.'
      : 'You have existing data. Importing will replace all current data.',
    noConflicts: locale === 'sv'
      ? 'Inga konflikter upptäcktes. Den nya datan kommer att ersätta befintlig data.'
      : 'No conflicts detected. The new data will replace existing data.',
    replaceConfirm: locale === 'sv' ? 'Ersätt data' : 'Replace data',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    success: locale === 'sv' ? 'Import lyckades!' : 'Import successful!',
    errors: locale === 'sv' ? 'Fel vid import' : 'Import errors',
    warnings: locale === 'sv' ? 'Varningar' : 'Warnings',
    format: locale === 'sv' ? 'Detekterat format' : 'Detected format',
    resolveConflicts: locale === 'sv' ? 'Lös konflikter' : 'Resolve conflicts',
  };

  // Show conflict resolver if we have conflicts
  if (showConflictResolver && conflictAnalysis && currentCv && importResult?.cv) {
    return (
      <ConflictResolver
        isOpen={true}
        onClose={handleClose}
        onResolved={handleConflictResolved}
        currentCv={currentCv}
        incomingCv={importResult.cv}
        analysis={conflictAnalysis}
        locale={locale}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Confirmation dialog for replacing existing data */}
          {showConfirmReplace && importResult?.success ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✓ {t.noConflicts}</p>
              </div>

              {/* Show import summary */}
              {importResult.cv && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-medium text-[var(--geisli-secondary)]">
                    {importResult.cv.name.first} {importResult.cv.name.last}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t.format}: <span className="font-mono">{importResult.detectedFormat}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    {importResult.cv.skills.length} skills, {importResult.cv.roles.length} roles
                  </p>
                </div>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800 mb-1">{t.warnings}</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {importResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose}>
                  {t.cancel}
                </Button>
                <Button 
                  onClick={handleConfirmReplace}
                  className="bg-[var(--geisli-accent)] hover:bg-[var(--geisli-accent)]/90"
                >
                  {t.replaceConfirm}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Import dropzone */}
              <ImportDropzone 
                onImport={handleImport} 
                onCancel={handleClose}
                disabled={showConfirmReplace}
                locale={locale}
              />

              {/* Show errors if import failed */}
              {importResult && !importResult.success && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-800 mb-2">{t.errors}</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  {importResult.detectedFormat !== 'unknown' && (
                    <p className="text-sm text-red-600 mt-2">
                      {t.format}: {importResult.detectedFormat}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
