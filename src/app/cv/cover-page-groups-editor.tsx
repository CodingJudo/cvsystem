'use client';

import { useMemo, useState } from 'react';
import type { CoverPageGroups, Locale } from '@/domain/model/cv';
import { useCVActions, useCVState } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMPTY: CoverPageGroups = { roles: [], expertKnowledge: [], languages: [] };

function normalizeList(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = v.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function CoverPageGroupsEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { updateCoverPageGroups } = useCVActions();
  const [isEditing, setIsEditing] = useState(false);

  const groups = useMemo(() => cv?.coverPageGroups ?? EMPTY, [cv]);

  const update = (next: CoverPageGroups) => {
    if (!cv) return;
    updateCoverPageGroups({
      roles: normalizeList(next.roles),
      expertKnowledge: normalizeList(next.expertKnowledge),
      languages: normalizeList(next.languages),
    });
  };

  const t = {
    title: locale === 'sv' ? 'Framsida – extra grupper' : 'Cover page – extra groups',
    description: locale === 'sv'
      ? 'Redigera listor som kan lyftas på framsidan'
      : 'Edit lists that can be highlighted on the cover page',
    edit: locale === 'sv' ? 'Redigera' : 'Edit',
    done: locale === 'sv' ? 'Klar' : 'Done',
    roles: locale === 'sv' ? 'Roller' : 'Roles',
    expert: locale === 'sv' ? 'Expertkunskaper' : 'Expert knowledge',
    languages: locale === 'sv' ? 'Språk' : 'Languages',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
    empty: locale === 'sv' ? 'Inget tillagt ännu.' : 'Nothing added yet.',
  };

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div>
          <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            className="text-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/10"
            disabled={!cv}
          >
            {isEditing ? t.done : t.edit}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        <StringListEditor
          title={t.roles}
          values={groups.roles}
          isEditing={isEditing}
          placeholder={locale === 'sv' ? 't.ex. Tech Lead' : 'e.g. Tech Lead'}
          onChange={(values) => update({ ...groups, roles: values })}
        />

        <StringListEditor
          title={t.expert}
          values={groups.expertKnowledge}
          isEditing={isEditing}
          placeholder={locale === 'sv' ? 't.ex. React' : 'e.g. React'}
          onChange={(values) => update({ ...groups, expertKnowledge: values })}
        />

        <StringListEditor
          title={t.languages}
          values={groups.languages}
          isEditing={isEditing}
          placeholder={locale === 'sv' ? 't.ex. Svenska' : 'e.g. Swedish'}
          onChange={(values) => update({ ...groups, languages: values })}
        />

        {!isEditing && groups.roles.length === 0 && groups.expertKnowledge.length === 0 && groups.languages.length === 0 ? (
          <p className="text-gray-400 italic">{t.empty}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StringListEditor(props: {
  title: string;
  values: string[];
  isEditing: boolean;
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const { title, values, isEditing, placeholder, onChange } = props;
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft('');
  };

  const updateAt = (idx: number, value: string) => {
    const next = values.slice();
    next[idx] = value;
    onChange(next);
  };

  const removeAt = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-[var(--geisli-secondary)]">{title}</div>

      {values.length > 0 ? (
        <div className="space-y-2">
          {values.map((v, idx) => (
            <div key={`${title}-${idx}`} className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input value={v} onChange={(e) => updateAt(idx, e.target.value)} className="h-8 text-sm" />
                  <Button variant="ghost" size="sm" onClick={() => removeAt(idx)} className="text-red-600 hover:bg-red-50">
                    ×
                  </Button>
                </>
              ) : (
                <div className="text-sm text-gray-700">{v}</div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button size="sm" onClick={add} disabled={!draft.trim()}>
            +
          </Button>
        </div>
      ) : null}
    </div>
  );
}

