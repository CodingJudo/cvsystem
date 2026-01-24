'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DomainCV, Locale, BilingualText, Role } from '@/domain/model/cv';
import { CVProvider, useCVState, useCVActions } from '@/lib/store/cv-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SkillsEditor } from './skill-editor';

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

function RoleCard({ role, locale }: { role: Role; locale: Locale }) {
  const dateRange = [
    formatDate(role.start),
    role.isCurrent ? 'Present' : formatDate(role.end),
  ].filter(Boolean).join(' – ');

  const description = getBilingualText(role.description, locale);

  return (
    <div className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold">{role.title || 'Untitled Role'}</h4>
        {role.company && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{role.company}</p>
        )}
        {dateRange && (
          <p className="text-xs text-zinc-500">{dateRange}</p>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line line-clamp-4">
          {description}
        </p>
      )}
    </div>
  );
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
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {displayCv.name.first} {displayCv.name.last}
          </h1>
          {title && (
            <p className="mt-1 text-xl text-zinc-600 dark:text-zinc-400">{title}</p>
          )}
          {displayCv.updatedAt && (
            <p className="mt-2 text-sm text-zinc-500">
              Last updated: {formatDate(displayCv.updatedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Unsaved changes indicator */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
              <Button variant="outline" size="sm" onClick={resetToOriginal}>
                Reset
              </Button>
            </div>
          )}

          {/* Language Toggle */}
          <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <TabsList>
              {displayCv.locales.includes('sv') && (
                <TabsTrigger value="sv">🇸🇪 SV</TabsTrigger>
              )}
              {displayCv.locales.includes('en') && (
                <TabsTrigger value="en">🇬🇧 EN</TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {/* Export Actions */}
          <Button variant="outline" asChild>
            <Link href="/cv/canvas">
              {locale === 'sv' ? 'Exportera bild' : 'Export Image'}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cv/preview">
              {locale === 'sv' ? 'Skriv ut' : 'Print'}
            </Link>
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200">
              Extraction Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'sv' ? 'Sammanfattning' : 'Summary'}</CardTitle>
          <CardDescription>
            {locale === 'sv' ? 'Professionell profil' : 'Professional profile'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">
              {summary}
            </p>
          ) : (
            <p className="text-zinc-500 italic">No summary available</p>
          )}
        </CardContent>
      </Card>

      {/* Skills Editor */}
      {isInitialized ? (
        <SkillsEditor locale={locale} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'sv' ? 'Kompetenser' : 'Skills'}</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Roles / Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'sv' ? 'Uppdrag & Erfarenhet' : 'Roles & Experience'}</CardTitle>
          <CardDescription>
            {displayCv.roles.length} {locale === 'sv' ? 'uppdrag' : 'roles'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayCv.roles.length > 0 ? (
            <div className="space-y-6">
              {displayCv.roles.map((role, index) => (
                <div key={role.id}>
                  <RoleCard role={role} locale={locale} />
                  {index < displayCv.roles.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 italic">No roles extracted</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="flex justify-center gap-8 text-sm text-zinc-500">
        <span>ID: {displayCv.id}</span>
        <span>Locales: {displayCv.locales.join(', ')}</span>
        <span>Skills: {displayCv.skills.length}</span>
        <span>Roles: {displayCv.roles.length}</span>
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
