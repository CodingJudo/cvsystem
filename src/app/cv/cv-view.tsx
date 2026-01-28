'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { DomainCV, Locale, BilingualText } from '@/domain/model/cv';
import { CVProvider, useCVState, useCVActions, useCVImportExport } from '@/lib/store/cv-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SkillsEditor } from './skill-editor';
import { RolesEditor } from './role-editor';
import { TrainingsEditor } from './training-editor';
import { EducationEditor } from './education-editor';
import { CommitmentsEditor } from './commitment-editor';
import { SummaryEditor } from './summary-editor';
import { PhotoSelector } from './photo-selector';
import { ImportDialog } from '@/components/import';
import { downloadCvAsJson, type ImportResult } from '@/lib/file-formats';

interface CVViewProps {
  cv: DomainCV;
  warnings: string[];
}

function getBilingualText(text: BilingualText, locale: Locale): string {
  const value = text[locale];
  if (value) return value;
  // Fallback to other locale
  const fallback = locale === 'sv' ? text.en : text.sv;
  return fallback ?? '';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function CVContent({ warnings, initialCv }: { warnings: string[]; initialCv: DomainCV }) {
  const { cv, hasChanges, isInitialized } = useCVState();
  const { resetToOriginal } = useCVActions();
  const { importCv, metadata, rawCinode, hasData } = useCVImportExport();
  const [locale, setLocale] = useState<Locale>(initialCv.locales[0] ?? 'sv');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Use initial CV until state is loaded, with defaults for new fields
  const rawCv = cv ?? initialCv;
  const displayCv = {
    ...rawCv,
    trainings: rawCv.trainings ?? [],
    educations: rawCv.educations ?? [],
    commitments: rawCv.commitments ?? [],
  };

  const handleImportComplete = (result: ImportResult) => {
    if (result.success && result.cv) {
      importCv(result.cv, result.metadata, result.rawCinode);
    }
    setShowImportDialog(false);
  };

  const handleSave = () => {
    if (!cv) return;
    downloadCvAsJson(cv, {
      metadata: metadata ? { ...metadata, savedAt: new Date().toISOString() } : undefined,
      rawCinode: rawCinode,
    });
  };

  const summary = getBilingualText(displayCv.summary, locale);
  const title = getBilingualText(displayCv.title, locale);

  return (
    <div className="min-h-screen bg-[var(--geisli-complement)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 bg-[var(--geisli-secondary)] text-white shadow-lg">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo.svg" 
              alt="Geisli" 
              width={40} 
              height={40}
              className="rounded"
            />
            <span className="font-semibold text-lg">CV System</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <TabsList className="bg-white/10">
                {displayCv.locales.includes('sv') && (
                  <TabsTrigger value="sv" className="data-[state=active]:bg-[var(--geisli-primary)]">SV</TabsTrigger>
                )}
                {displayCv.locales.includes('en') && (
                  <TabsTrigger value="en" className="data-[state=active]:bg-[var(--geisli-primary)]">EN</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {/* Import/Save Actions */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowImportDialog(true)}
              className="border-[var(--geisli-secondary)] bg-white text-[var(--geisli-secondary)] hover:bg-gray-100"
            >
              {locale === 'sv' ? 'Importera' : 'Import'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={!cv}
              className="border-[var(--geisli-secondary)] bg-white text-[var(--geisli-secondary)] hover:bg-gray-100"
            >
              💾 {locale === 'sv' ? 'Spara' : 'Save'}
            </Button>

            {/* Export Actions */}
            <Button variant="outline" size="sm" asChild className="border-[var(--geisli-secondary)] bg-white text-[var(--geisli-secondary)] hover:bg-gray-100">
              <Link href="/cv/canvas">
                {locale === 'sv' ? 'Bild' : 'Image'}
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-[var(--geisli-accent)] hover:bg-[var(--geisli-accent)]/90">
              <Link href="/cv/preview">
                {locale === 'sv' ? 'Skriv ut' : 'Print'}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Profile Header */}
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--geisli-secondary)]">
                  {displayCv.name.first} {displayCv.name.last}
                </h1>
                {title && (
                  <p className="mt-1 text-xl text-[var(--geisli-primary)]">{title}</p>
                )}
                {displayCv.updatedAt && (
                  <p className="mt-2 text-sm text-gray-500">
                    {locale === 'sv' ? 'Senast uppdaterad' : 'Last updated'}: {formatDate(displayCv.updatedAt)}
                  </p>
                )}
              </div>

              {/* Profile photo selector */}
              <div className="flex flex-col items-end gap-2">
                {displayCv.photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayCv.photoDataUrl}
                    alt={`${displayCv.name.first ?? ''} ${displayCv.name.last ?? ''}`.trim() || 'Profile photo'}
                    className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                    {locale === 'sv' ? 'Ingen bild' : 'No photo'}
                  </div>
                )}
                <PhotoSelector locale={locale} />
              </div>

              {/* Unsaved changes indicator */}
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--geisli-accent)] font-medium">
                    {locale === 'sv' ? 'Osparade ändringar' : 'Unsaved changes'}
                  </span>
                  <Button variant="outline" size="sm" onClick={resetToOriginal} className="border-[var(--geisli-accent)] text-[var(--geisli-accent)]">
                    {locale === 'sv' ? 'Återställ' : 'Reset'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Card className="border-[var(--geisli-accent)] bg-orange-50">
            <CardHeader>
              <CardTitle className="text-[var(--geisli-accent)]">
                {locale === 'sv' ? 'Varningar' : 'Warnings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc text-sm text-orange-700">
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {isInitialized ? (
          <SummaryEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--geisli-secondary)]">
                {locale === 'sv' ? 'Sammanfattning' : 'Summary'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
            <CardContent>
              {summary ? (
                <p className="whitespace-pre-line text-gray-700">{summary}</p>
              ) : (
                <p className="text-gray-400 italic">
                  {locale === 'sv' ? 'Ingen sammanfattning tillgänglig' : 'No summary available'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Roles / Work Experience Editor - MOVED BEFORE SKILLS */}
        {isInitialized ? (
          <RolesEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--geisli-secondary)]">
                {locale === 'sv' ? 'Uppdrag & Erfarenhet' : 'Roles & Experience'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Skills Editor - MOVED AFTER WORK EXPERIENCE */}
        {isInitialized ? (
          <SkillsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--geisli-secondary)]">
                {locale === 'sv' ? 'Kompetenser' : 'Skills'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Education Editor */}
        {isInitialized && <EducationEditor locale={locale} />}

        {/* Trainings Editor (Courses & Certifications) */}
        {isInitialized && <TrainingsEditor locale={locale} />}

        {/* Commitments Editor (Presentations & Publications) */}
        {isInitialized && <CommitmentsEditor locale={locale} />}

        {/* Stats Footer */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-gray-500 py-4">
          <span>ID: {displayCv.id}</span>
          <span>{locale === 'sv' ? 'Roller' : 'Roles'}: {displayCv.roles.length}</span>
          <span>{locale === 'sv' ? 'Kompetenser' : 'Skills'}: {displayCv.skills.length}</span>
          <span>{locale === 'sv' ? 'Utbildningar' : 'Education'}: {displayCv.educations.length}</span>
          <span>{locale === 'sv' ? 'Kurser' : 'Trainings'}: {displayCv.trainings.length}</span>
        </div>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
        hasExistingData={hasData}
        currentCv={cv}
        locale={locale}
      />
    </div>
  );
}

export function CVView({ cv, warnings }: CVViewProps) {
  return (
    <CVProvider initialCv={cv}>
      <CVContent warnings={warnings} initialCv={cv} />
    </CVProvider>
  );
}
