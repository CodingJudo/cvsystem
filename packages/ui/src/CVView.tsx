'use client';

import { useState, useEffect } from 'react';
import { getBilingualText, formatDate } from '@cvsystem/core';
import type { DomainCV, Locale } from '@cvsystem/core';
import type { CVStorageAdapter } from '@cvsystem/core';
import { createCVFile } from '@cvsystem/core';
import { CVProvider, useCVState, useCVActions, useCVImportExport } from './store/cv-store';
import { OntologyProvider } from './store/ontology-store';
import { useBrandConfig } from './contexts/brand-config-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { SkillsEditor } from './editors/skill-editor';
import { RolesEditor } from './editors/role-editor';
import { HobbyProjectsEditor } from './editors/hobby-project-editor';
import { TrainingsEditor } from './editors/training-editor';
import { EducationEditor } from './editors/education-editor';
import { CommitmentsEditor } from './editors/commitment-editor';
import { OntologyEditor } from './editors/ontology-editor';
import { RenderSpecEditor } from './editors/render-spec-editor';
import { TitleEditor } from './editors/title-editor';
import { SummaryEditor } from './editors/summary-editor';
import { PhotoSelector } from './editors/photo-selector';
import { ContactsEditor } from './editors/contacts-editor';
import { FeaturedProjectsEditor } from './editors/featured-projects-editor';
import { CoverPageGroupsEditor } from './editors/cover-page-groups-editor';
import { ImportDialog } from './components/import';
import { type ImportResult } from '@cvsystem/core';

export interface CVViewProps {
  cv: DomainCV;
  warnings: string[];
  /** Storage adapter for save operations */
  storageAdapter: CVStorageAdapter;
  /** Optional: load a demo/fixture CV (e.g. from a server action or local fixtures file) */
  onLoadFixtures?: () => Promise<{ success: true; cv: DomainCV } | { success: false; error: string }>;
  /** Optional: navigate to print preview */
  onNavigateToPreview?: () => void;
}

function CVContent({
  warnings,
  initialCv,
  storageAdapter,
  onLoadFixtures,
  onNavigateToPreview,
}: {
  warnings: string[];
  initialCv: DomainCV;
  storageAdapter: CVStorageAdapter;
  onLoadFixtures?: CVViewProps['onLoadFixtures'];
  onNavigateToPreview?: () => void;
}) {
  const { cv, hasChanges, isInitialized } = useCVState();
  const { resetToOriginal, clearAndUseMinimalCv } = useCVActions();
  const { importCv, metadata, rawCinode, hasData } = useCVImportExport();
  const brandConfig = useBrandConfig();
  const [locale, setLocale] = useState<Locale>(initialCv.locales[0] ?? 'sv');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [fixturesError, setFixturesError] = useState<string | null>(null);

  useEffect(() => {
    if (!clearedMessage) return;
    const t = setTimeout(() => setClearedMessage(null), 4000);
    return () => clearTimeout(t);
  }, [clearedMessage]);

  const handleClearCv = () => {
    const msg = locale === 'sv'
      ? 'Kasta all CV-data och börja från en tom CV? Detta kan inte ångras.'
      : 'Discard all CV data and start from a blank CV? This cannot be undone.';
    if (!window.confirm(msg)) return;
    clearAndUseMinimalCv(initialCv);
    setClearedMessage(locale === 'sv' ? 'CV rensad. Tom CV visas nu.' : 'CV cleared. Blank CV shown.');
  };

  const handleLoadFromFixtures = async () => {
    if (!onLoadFixtures) return;
    setFixturesError(null);
    setFixturesLoading(true);
    try {
      const result = await onLoadFixtures();
      if (result.success) {
        importCv(result.cv);
        setClearedMessage(locale === 'sv' ? 'CV laddad från fixtures.' : 'CV loaded from fixtures.');
      } else {
        setFixturesError(result.error);
      }
    } finally {
      setFixturesLoading(false);
    }
  };

  // Use initial CV until state is loaded, with defaults for new fields
  const rawCv = cv ?? initialCv;
  const displayCv = {
    ...rawCv,
    hobbyProjects: rawCv.hobbyProjects ?? [],
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

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!cv || isSaving) return;
    setIsSaving(true);
    try {
      const file = createCVFile(cv, {
        metadata: metadata ? { ...metadata, savedAt: new Date().toISOString() } : undefined,
        rawCinode: rawCinode ?? undefined,
      });
      await storageAdapter.save(file);
    } finally {
      setIsSaving(false);
    }
  };

  const summary = getBilingualText(displayCv.summary, locale);
  const title = getBilingualText(displayCv.title, locale);

  return (
    <div className="min-h-screen bg-[var(--brand-complement)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 bg-[var(--brand-secondary)] text-white shadow-lg">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt={brandConfig.name}
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
                  <TabsTrigger value="sv" className="data-[state=active]:bg-[var(--brand-primary)]">SV</TabsTrigger>
                )}
                {displayCv.locales.includes('en') && (
                  <TabsTrigger value="en" className="data-[state=active]:bg-[var(--brand-primary)]">EN</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {/* Import/Save Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="border-[var(--brand-secondary)] bg-white text-[var(--brand-secondary)] hover:bg-gray-100"
            >
              {locale === 'sv' ? 'Importera fil' : 'Import file'}
            </Button>
            {onLoadFixtures && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadFromFixtures}
                disabled={fixturesLoading}
                className="border-[var(--brand-secondary)] bg-white text-[var(--brand-secondary)] hover:bg-gray-100"
                title={locale === 'sv' ? 'Ladda CV från fixtures/cinode (cv-sv.json, cv-en.json)' : 'Load CV from fixtures (cv-sv.json, cv-en.json)'}
              >
                {fixturesLoading ? (locale === 'sv' ? 'Laddar…' : 'Loading…') : (locale === 'sv' ? 'Ladda från fixtures' : 'Load from fixtures')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCv}
              className="border-[var(--brand-secondary)] bg-white text-[var(--brand-secondary)] hover:bg-gray-100"
              title={locale === 'sv' ? 'Rensa all CV-data och visa tom CV' : 'Clear all CV data and show blank CV'}
            >
              {locale === 'sv' ? 'Rensa CV' : 'Clear CV'}
            </Button>
            {clearedMessage && (
              <span className="text-sm text-white/90 animate-in fade-in" role="status">
                {clearedMessage}
              </span>
            )}
            {fixturesError && (
              <span className="text-sm text-amber-200" role="alert">
                {fixturesError}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!cv || isSaving}
              className="border-[var(--brand-secondary)] bg-white text-[var(--brand-secondary)] hover:bg-gray-100"
            >
              💾 {isSaving
                ? (locale === 'sv' ? 'Sparar…' : 'Saving…')
                : (locale === 'sv' ? 'Spara' : 'Save')}
            </Button>

            {/* Export Actions */}
            {onNavigateToPreview && (
              <Button
                size="sm"
                onClick={onNavigateToPreview}
                className="bg-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/90"
              >
                {locale === 'sv' ? 'Skriv ut' : 'Print'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Profile Header */}
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">
                  {displayCv.name.first} {displayCv.name.last}
                </h1>
                {title && (
                  <p className="mt-1 text-xl text-[var(--brand-primary)]">{title}</p>
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
                  <span className="text-sm text-[var(--brand-accent)] font-medium">
                    {locale === 'sv' ? 'Osparade ändringar' : 'Unsaved changes'}
                  </span>
                  <Button variant="outline" size="sm" onClick={resetToOriginal} className="border-[var(--brand-accent)] text-[var(--brand-accent)]">
                    {locale === 'sv' ? 'Återställ' : 'Reset'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Card className="border-[var(--brand-accent)] bg-orange-50">
            <CardHeader>
              <CardTitle className="text-[var(--brand-accent)]">
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

        {/* Contacts */}
        {isInitialized ? (
          <ContactsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Kontakt' : 'Contact'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Cover page groups (roles, expert knowledge, languages) */}
        {isInitialized ? (
          <CoverPageGroupsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Framsida – extra grupper' : 'Cover page – extra groups'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Featured Projects */}
        {isInitialized ? (
          <FeaturedProjectsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Utvalda projekt' : 'Featured projects'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Title */}
        {isInitialized ? (
          <TitleEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Titel' : 'Title'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Summary */}
        {isInitialized ? (
          <SummaryEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
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

        {/* Roles / Work Experience Editor */}
        {isInitialized ? (
          <RolesEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Uppdrag & Erfarenhet' : 'Roles & Experience'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Hobby Projects */}
        {isInitialized ? (
          <HobbyProjectsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
                {locale === 'sv' ? 'Hobbyprojekt' : 'Hobby projects'}
              </CardTitle>
              <CardDescription>{locale === 'sv' ? 'Laddar...' : 'Loading...'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Skills Editor */}
        {isInitialized ? (
          <SkillsEditor locale={locale} />
        ) : (
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-[var(--brand-secondary)]">
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

        {/* Render Spec Editor (audience-specific CV views) */}
        {isInitialized && <RenderSpecEditor locale={locale} />}

        {/* Ontology Editor (Custom ontology layer on top of MIND) */}
        {isInitialized && <OntologyEditor locale={locale} />}

        {/* Stats Footer */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-gray-500 py-4">
          <span>ID: {displayCv.id}</span>
          <span>{locale === 'sv' ? 'Roller' : 'Roles'}: {displayCv.roles.length}</span>
          <span>{locale === 'sv' ? 'Hobbyprojekt' : 'Hobby projects'}: {(displayCv.hobbyProjects ?? []).length}</span>
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

export function CVView({ cv, warnings, storageAdapter, onLoadFixtures, onNavigateToPreview }: CVViewProps) {
  return (
    <OntologyProvider>
      <CVProvider initialCv={cv}>
        <CVContent
          warnings={warnings}
          initialCv={cv}
          storageAdapter={storageAdapter}
          onLoadFixtures={onLoadFixtures}
          onNavigateToPreview={onNavigateToPreview}
        />
      </CVProvider>
    </OntologyProvider>
  );
}
