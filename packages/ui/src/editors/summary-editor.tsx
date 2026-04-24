"use client";

import { useMemo, useState } from "react";
import type { Locale } from '@cvsystem/core';
import { useCVActions, useCVState } from '../store/cv-store';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { BasicMarkdownText } from '../components/BasicMarkdownText';
import { getBilingualText } from '@cvsystem/core';

export function SummaryEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { updateSummary } = useCVActions();
  const [isEditing, setIsEditing] = useState(false);

  const summaryText = useMemo(() => {
    return cv ? getBilingualText(cv.summary, locale) : "";
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
          <CardTitle className="text-[var(--brand-secondary)]">
            {locale === "sv" ? "Sammanfattning" : "Summary"}
          </CardTitle>
          <CardDescription>
            {locale === "sv" ? "Professionell profil" : "Professional profile"}
          </CardDescription>
        </div>

        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
            disabled={!cv}
          >
            {isEditing
              ? locale === "sv"
                ? "Klar"
                : "Done"
              : locale === "sv"
                ? "Redigera"
                : "Edit"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <>
            <Textarea
              value={summaryText}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={
                locale === "sv"
                  ? "Skriv en kort profil..."
                  : "Write a short profile..."
              }
              rows={12}
              className="text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              {locale === "sv"
                ? "Du kan använda **fetstil** och - för listor."
                : "You can use **bold** and - for lists."}
            </p>
          </>
        ) : summaryText ? (
          <div className="text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_li]:my-0.5">
            <BasicMarkdownText text={summaryText} className="m-0" />
          </div>
        ) : (
          <p className="text-gray-400 italic">
            {locale === "sv"
              ? "Ingen sammanfattning tillgänglig"
              : "No summary available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
