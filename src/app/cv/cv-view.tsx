'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { DomainCV, Locale, BilingualText } from '@/domain/model/cv';
import { CVProvider, useCVState, useCVActions } from '@/lib/store/cv-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SkillsEditor } from './skill-editor';
import { RolesEditor } from './role-editor';

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
  const [locale, setLocale] = useState<Locale>(initialCv.locales[0] ?? 'sv');

  // Use initial CV until state is loaded
  const displayCv = cv ?? initialCv;

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

            {/* Export Actions */}
            <Button variant="outline" size="sm" asChild className="border-white/30 text-white hover:bg-white/10">
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
        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-[var(--geisli-secondary)]">
              {locale === 'sv' ? 'Sammanfattning' : 'Summary'}
            </CardTitle>
            <CardDescription>
              {locale === 'sv' ? 'Professionell profil' : 'Professional profile'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <p className="whitespace-pre-line text-gray-700">
                {summary}
              </p>
            ) : (
              <p className="text-gray-400 italic">
                {locale === 'sv' ? 'Ingen sammanfattning tillgänglig' : 'No summary available'}
              </p>
            )}
          </CardContent>
        </Card>

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

        {/* Stats Footer */}
        <div className="flex justify-center gap-8 text-sm text-gray-500 py-4">
          <span>ID: {displayCv.id}</span>
          <span>{locale === 'sv' ? 'Språk' : 'Locales'}: {displayCv.locales.join(', ')}</span>
          <span>{locale === 'sv' ? 'Kompetenser' : 'Skills'}: {displayCv.skills.length}</span>
          <span>{locale === 'sv' ? 'Uppdrag' : 'Roles'}: {displayCv.roles.length}</span>
        </div>
      </div>
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
