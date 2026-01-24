'use client';

import { useState } from 'react';
import type { DomainCV, Locale, BilingualText, Skill, Role } from '@/domain/model/cv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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

function SkillBadge({ skill }: { skill: Skill }) {
  const levelIndicator = skill.level ? '●'.repeat(skill.level) + '○'.repeat(5 - skill.level) : null;
  
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800">
      <span className="font-medium">{skill.name}</span>
      {levelIndicator && (
        <span className="text-xs text-zinc-500" title={`Level ${skill.level}/5`}>
          {levelIndicator}
        </span>
      )}
      {skill.years && skill.years > 0 && (
        <span className="text-xs text-zinc-500">
          {skill.years}y
        </span>
      )}
    </div>
  );
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

export function CVView({ cv, warnings }: CVViewProps) {
  const [locale, setLocale] = useState<Locale>(cv.locales[0] ?? 'sv');

  const summary = getBilingualText(cv.summary, locale);
  const title = getBilingualText(cv.title, locale);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {cv.name.first} {cv.name.last}
          </h1>
          {title && (
            <p className="mt-1 text-xl text-zinc-600 dark:text-zinc-400">{title}</p>
          )}
          {cv.updatedAt && (
            <p className="mt-2 text-sm text-zinc-500">
              Last updated: {formatDate(cv.updatedAt)}
            </p>
          )}
        </div>

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

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'sv' ? 'Kompetenser' : 'Skills'}</CardTitle>
          <CardDescription>
            {cv.skills.length} {locale === 'sv' ? 'kompetenser' : 'skills'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cv.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cv.skills.map((skill) => (
                <SkillBadge key={skill.id} skill={skill} />
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 italic">No skills extracted</p>
          )}
        </CardContent>
      </Card>

      {/* Roles / Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'sv' ? 'Uppdrag & Erfarenhet' : 'Roles & Experience'}</CardTitle>
          <CardDescription>
            {cv.roles.length} {locale === 'sv' ? 'uppdrag' : 'roles'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cv.roles.length > 0 ? (
            <div className="space-y-6">
              {cv.roles.map((role, index) => (
                <div key={role.id}>
                  <RoleCard role={role} locale={locale} />
                  {index < cv.roles.length - 1 && <Separator className="mt-6" />}
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
        <span>ID: {cv.id}</span>
        <span>Locales: {cv.locales.join(', ')}</span>
        <span>Skills: {cv.skills.length}</span>
        <span>Roles: {cv.roles.length}</span>
      </div>
    </div>
  );
}
