'use client';

import { useEffect, useMemo, useState, startTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DomainCV, Locale, RenderSpec } from '@/domain/model/cv';
import { buildSectionsFromCv } from '@/lib/build-sections-from-cv';
import { attachHeaderFooterToSections } from '@/lib/print-theme-config';
import { PaginatedPrintLayout } from '../print-layout-paginated';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { readCvFromStorage } from '@/lib/store/cv-store';
import { LocalStorageAdapter } from '@/lib/storage';
import { brandConfig } from '@/lib/brand-config';
import {
  getDefaultPrintTheme,
  getPrintThemeById,
  readPersistedPrintThemeId,
  ThemeSelector,
} from './theme-selector';

interface PreviewClientProps {
  cv: DomainCV;
}

export function PreviewClient({ cv: serverCv }: PreviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storageCv, setStorageCv] = useState<DomainCV | null>(null);

  const cv = useMemo(() => storageCv ?? serverCv, [storageCv, serverCv]);

  useEffect(() => {
    readCvFromStorage().then((fromStorage) => {
      if (fromStorage) setStorageCv(fromStorage);
    }).catch(() => { /* Ignore */ });
  }, []);

  const [locale, setLocale] = useState<Locale>(cv.locales[0] ?? 'sv');
  /* Use default for initial render so server and client match (avoids hydration mismatch). */
  const [themeId, setThemeId] = useState<string>(brandConfig.defaultPrintThemeId);
  /* Active RenderSpec: initialised from cv.activeRenderSpecId; null = full CV (no filtering). */
  const [activeSpecId, setActiveSpecId] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      setActiveSpecId(cv.activeRenderSpecId ?? null);
    });
  }, [cv.activeRenderSpecId]);

  /**
   * Persist the active spec selection back to the CV in storage so the editor
   * and the next preview load open with the same spec selected.
   */
  const handleSpecChange = useCallback((newSpecId: string | null) => {
    setActiveSpecId(newSpecId);
    const adapter = new LocalStorageAdapter();
    adapter.load().then((file) => {
      if (!file) return;
      return adapter.save({
        ...file,
        cv: { ...file.cv, activeRenderSpecId: newSpecId },
      });
    }).catch(() => { /* Ignore persistence errors */ });
  }, []);

  const activeSpec = useMemo(
    (): RenderSpec | null =>
      (cv.renderSpecs ?? []).find((s) => s.id === activeSpecId) ?? null,
    [cv.renderSpecs, activeSpecId],
  );

  useEffect(() => {
    startTransition(() => {
      const fromUrl = searchParams?.get('theme');
      if (getPrintThemeById(fromUrl)) {
        setThemeId(fromUrl!);
        return;
      }
      const persisted = readPersistedPrintThemeId();
      if (getPrintThemeById(persisted)) {
        setThemeId(persisted!);
      }
    });
  }, [searchParams]);

  const selectedTheme = useMemo(() => {
    const fromUrl = searchParams?.get('theme');
    return getPrintThemeById(fromUrl) ?? getPrintThemeById(themeId) ?? getDefaultPrintTheme();
  }, [searchParams, themeId]);

  const showDebug = searchParams?.get('debug') === '1';
  const debugLayout = useMemo(() => {
    if (!showDebug) return null;
    const { sections: raw, blockIndex: index } = buildSectionsFromCv(cv);
    const sections = attachHeaderFooterToSections(raw, selectedTheme.id);
    return {
      sections: sections.map((s) => ({
        id: s.id,
        type: s.type,
        order: s.order,
        blockCount: s.contentBlocks.length,
        header: s.header?.defId,
        footer: s.footer?.defId,
      })),
      blockIndexKeys: Object.keys(index),
    };
  }, [showDebug, cv, selectedTheme.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    // Get the print layout HTML
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    // Create a complete HTML document
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${cv.name.first} ${cv.name.last}</title>
  <link rel="stylesheet" href="${selectedTheme.href}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: var(--cv-page-bg, #ffffff);
      color: var(--cv-text, #1a1a1a);
      font-size: 11pt;
      line-height: 1.5;
    }
    .cv-header {
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: 2pt solid var(--cv-border-strong, #333);
      padding-bottom: 16pt;
    }
    .cv-name {
      font-size: 24pt;
      font-weight: bold;
      margin: 0 0 8pt 0;
      letter-spacing: 0.5pt;
    }
    .cv-title {
      font-size: 14pt;
      color: var(--cv-muted, #444);
      margin: 0;
      font-style: italic;
    }
    .cv-section {
      margin-bottom: 20pt;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: var(--cv-text, #333);
      margin: 0 0 10pt 0;
      border-bottom: 1pt solid var(--cv-border, #ccc);
      padding-bottom: 4pt;
      text-transform: uppercase;
      letter-spacing: 1pt;
    }
    .summary-text {
      margin: 0;
      text-align: justify;
    }
    .skills-container {
      display: flex;
      flex-direction: column;
      gap: 6pt;
    }
    .skill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4pt;
    }
    .skill-level-label {
      font-weight: bold;
      min-width: 100pt;
      color: var(--cv-muted, #555);
    }
    .skill-list { flex: 1; }
    .skill-level, .skill-years {
      color: var(--cv-muted-2, #666);
      font-size: 9pt;
    }
    .roles-container {
      display: flex;
      flex-direction: column;
      gap: 16pt;
    }
    .print-role { break-inside: avoid; }
    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4pt;
    }
    .role-title-company {
      display: flex;
      flex-direction: column;
    }
    .role-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 0;
    }
    .role-company {
      font-size: 11pt;
      color: var(--cv-muted, #444);
    }
    .role-date {
      font-size: 10pt;
      color: var(--cv-muted-2, #666);
      white-space: nowrap;
    }
    .role-description {
      margin: 6pt 0 0 0;
      text-align: justify;
      font-size: 10pt;
      color: var(--cv-text, #333);
    }
    .cv-footer {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 1pt solid var(--cv-border, #ccc);
      text-align: center;
      font-size: 9pt;
      color: var(--cv-muted-2, #888);
    }
    .cv-cover-main {
      break-after: page;
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      break-after: page;
    }
    .cover-photo-img {
      width: 64pt;
      height: 64pt;
      object-fit: cover;
      border-radius: 10pt;
      border: 1pt solid var(--cv-border, #ccc);
    }
    .cover-contacts-list, .cover-list { margin: 0; padding-left: 1.25rem; }
    .cover-contacts-list li, .cover-list li { margin: 0.25rem 0; }
    .cover-projects-list { margin: 0; padding-left: 0; list-style: none; }
    .cover-project-item { margin: 0.5rem 0; }
    .cover-project-title { font-weight: 600; }
    .cover-project-desc { margin: 0.25rem 0 0 0; font-size: 10pt; color: var(--cv-muted, #555); }
    @media print {
      body { padding: 0; max-width: none; }
      .cv-section { break-inside: avoid; }
      .print-role { break-inside: avoid; }
    }
  </style>
</head>
<body class="${selectedTheme.className}">
<div id="print-container" class="${selectedTheme.className}">
${printContainer.innerHTML}
</div>
</body>
</html>`;

    // Create download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-${cv.name.first?.toLowerCase()}-${cv.name.last?.toLowerCase()}-${locale}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/cv')}>
              ← Back to Editor
            </Button>
            <h1 className="text-lg font-semibold">Print Preview</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <TabsList>
                {cv.locales.includes('sv') && (
                  <TabsTrigger value="sv">🇸🇪 SV</TabsTrigger>
                )}
                {cv.locales.includes('en') && (
                  <TabsTrigger value="en">🇬🇧 EN</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <ThemeSelector value={selectedTheme.id} onThemeChange={setThemeId} />

            {/* RenderSpec selector — only shown when at least one spec is saved */}
            {(cv.renderSpecs ?? []).length > 0 && (
              <select
                value={activeSpecId ?? ''}
                onChange={(e) => handleSpecChange(e.target.value || null)}
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                title="Select audience spec"
              >
                <option value="">Full CV</option>
                {(cv.renderSpecs ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <Button variant="outline" onClick={handleDownloadHtml}>
              Download HTML
            </Button>
            <Button onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="py-8 print:py-0">
        <link rel="stylesheet" href={selectedTheme.href} />
        <div
          id="print-container"
          className={`print-output print-output--paginated ${selectedTheme.className} shadow-lg mx-auto print:shadow-none print:mx-0`}
          style={{ width: '210mm', minWidth: '210mm' }}
        >
          <PaginatedPrintLayout
            cv={cv}
            locale={locale}
            themeId={selectedTheme.id}
            themeClassName={selectedTheme.className}
            spec={activeSpec}
          />
        </div>
      </div>

      {/* Debug panel: ?debug=1 – sections and blockIndex (Phase 0 verification) */}
      {showDebug && debugLayout && (
        <div className="print:hidden max-w-4xl mx-auto px-4 pb-8 border-t pt-4 mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Debug: buildSectionsFromCv + attachHeaderFooter
          </h2>
          <div className="bg-muted/50 rounded-md p-4 font-mono text-xs overflow-auto">
            <div className="mb-3">
              <strong>Sections ({debugLayout.sections.length})</strong>
              <pre className="mt-1 whitespace-pre-wrap">
                {JSON.stringify(debugLayout.sections, null, 2)}
              </pre>
            </div>
            <div>
              <strong>blockIndex ({debugLayout.blockIndexKeys.length} blocks)</strong>
              <pre className="mt-1 whitespace-pre-wrap break-all">
                {debugLayout.blockIndexKeys.join(', ')}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
