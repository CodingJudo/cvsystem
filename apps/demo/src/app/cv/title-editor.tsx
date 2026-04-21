"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/domain/model/cv";
import { useCVActions, useCVState } from "@/lib/store/cv-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBilingualText } from "@/lib/format";

export function TitleEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { updateTitle } = useCVActions();
  const [isEditing, setIsEditing] = useState(false);

  const titleText = useMemo(() => {
    return cv ? getBilingualText(cv.title, locale) : "";
  }, [cv, locale]);

  const handleChange = (value: string) => {
    if (!cv) return;
    updateTitle({
      ...cv.title,
      [locale]: value,
    });
  };

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-[var(--brand-secondary)]">
            {locale === "sv" ? "Titel" : "Title"}
          </CardTitle>
          <CardDescription>
            {locale === "sv"
              ? "Professionell titel eller roll"
              : "Professional title or role"}
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
          <Textarea
            value={titleText}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={
              locale === "sv"
                ? "T.ex. Frontend & Tech Lead"
                : "E.g. Frontend & Tech Lead"
            }
            rows={2}
            className="text-sm"
          />
        ) : titleText ? (
          <p className="text-xl text-[var(--brand-primary)]">{titleText}</p>
        ) : (
          <p className="text-gray-400 italic">
            {locale === "sv" ? "Ingen titel tillgänglig" : "No title available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
