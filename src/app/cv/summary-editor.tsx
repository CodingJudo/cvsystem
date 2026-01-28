'use client';

import { useMemo, useState } from 'react';
import type { BilingualText, Locale } from '@/domain/model/cv';
import { useCVActions, useCVState } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function getBilingualText(text: BilingualText, locale: Locale): string {
  const value = text[locale];
  if (value) return value;
  const fallback = locale === 'sv' ? text.en : text.sv;
  return fallback ?? '';
}

export function SummaryEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { updateSummary } = useCVActions();
  const [isEditing, setIsEditing] = useState(false);

  const summaryText = useMemo(() => {
    return cv ? getBilingualText(cv.summary, locale) : '';
  }, [cv, locale]);

  const handleChange = (value: string) => {
    if (!cv) return;
    updateSummary({
      ...cv.summary,
      [locale]: value,
    });
  };

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-[var(--geisli-secondary)]">
            {locale === 'sv' ? 'Sammanfattning' : 'Summary'}
          </CardTitle>
          <CardDescription>
            {locale === 'sv' ? 'Professionell profil' : 'Professional profile'}
          </CardDescription>
        </div>

        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="text-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/10"
            disabled={!cv}
          >
            {isEditing ? (locale === 'sv' ? 'Klar' : 'Done') : (locale === 'sv' ? 'Redigera' : 'Edit')}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <Textarea
            value={summaryText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={locale === 'sv' ? 'Skriv en kort profil...' : 'Write a short profile...'}
            rows={6}
            className="text-sm"
          />
        ) : summaryText ? (
          <p className="whitespace-pre-line text-gray-700">{summaryText}</p>
        ) : (
          <p className="text-gray-400 italic">
            {locale === 'sv' ? 'Ingen sammanfattning tillgänglig' : 'No summary available'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

