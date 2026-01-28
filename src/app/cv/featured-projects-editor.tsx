'use client';

import { useMemo, useState } from 'react';
import type { BilingualText, FeaturedProject, Locale } from '@/domain/model/cv';
import { useCVActions, useCVState, useRoles } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function getBilingualText(text: BilingualText, locale: Locale): string {
  const value = text[locale];
  if (value) return value;
  const fallback = locale === 'sv' ? text.en : text.sv;
  return fallback ?? '';
}

export function FeaturedProjectsEditor({ locale }: { locale: Locale }) {
  const { cv } = useCVState();
  const { roles } = useRoles();
  const { addFeaturedProject, updateFeaturedProject, deleteFeaturedProject } = useCVActions();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const projects = cv?.featuredProjects ?? [];

  const availableRoles = useMemo(() => {
    const used = new Set(projects.map((p) => p.roleId).filter(Boolean) as string[]);
    return roles.filter((r) => r.visible).filter((r) => !used.has(r.id));
  }, [roles, projects]);

  const addFromRole = () => {
    if (!cv) return;
    const role = roles.find((r) => r.id === selectedRoleId);
    if (!role) return;

    addFeaturedProject({
      roleId: role.id,
      company: role.company,
      roleTitle: role.title,
      description: { sv: null, en: null },
      visible: true,
    });
    setSelectedRoleId('');
  };

  const t = {
    title: locale === 'sv' ? 'Utvalda projekt' : 'Featured projects',
    description: locale === 'sv'
      ? 'Välj ut några uppdrag att lyfta på en framtida framsida'
      : 'Pick a few projects to highlight on a future cover page',
    edit: locale === 'sv' ? 'Redigera' : 'Edit',
    done: locale === 'sv' ? 'Klar' : 'Done',
    add: locale === 'sv' ? 'Lägg till från erfarenhet' : 'Add from experience',
    empty: locale === 'sv' ? 'Inga utvalda projekt ännu.' : 'No featured projects yet.',
    chooseRole: locale === 'sv' ? 'Välj roll…' : 'Choose role…',
    highlightText: locale === 'sv' ? 'Highlight-text' : 'Highlight text',
    remove: locale === 'sv' ? 'Ta bort' : 'Remove',
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

      <CardContent className="space-y-4">
        {isEditing && (
          <div className="flex items-center gap-2">
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1"
            >
              <option value="">{t.chooseRole}</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r.company ?? '—') + ' — ' + (r.title ?? '—')}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={addFromRole} disabled={!selectedRoleId}>
              {t.add}
            </Button>
          </div>
        )}

        {projects.length === 0 ? (
          <p className="text-gray-400 italic">{t.empty}</p>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <FeaturedProjectCard
                key={p.id}
                project={p}
                locale={locale}
                isEditing={isEditing}
                onChangeCompany={(value) => {
                  if (!cv) return;
                  updateFeaturedProject(p.id, { company: value.trim() ? value : null });
                }}
                onChangeRoleTitle={(value) => {
                  if (!cv) return;
                  updateFeaturedProject(p.id, { roleTitle: value.trim() ? value : null });
                }}
                onChangeDescription={(value) => {
                  if (!cv) return;
                  updateFeaturedProject(p.id, {
                    description: {
                      ...p.description,
                      [locale]: value,
                    },
                  });
                }}
                onToggleVisible={() => updateFeaturedProject(p.id, { visible: !p.visible })}
                onRemove={() => deleteFeaturedProject(p.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeaturedProjectCard(props: {
  project: FeaturedProject;
  locale: Locale;
  isEditing: boolean;
  onChangeCompany: (value: string) => void;
  onChangeRoleTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  const { project, locale, isEditing, onChangeCompany, onChangeRoleTitle, onChangeDescription, onToggleVisible, onRemove } = props;
  const description = getBilingualText(project.description, locale);

  return (
    <div className={`rounded-lg border p-4 ${project.visible ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {isEditing ? (
            <div className="grid gap-2">
              <Input
                value={project.company ?? ''}
                onChange={(e) => onChangeCompany(e.target.value)}
                placeholder={locale === 'sv' ? 'Företag/uppdragsgivare' : 'Company/client'}
                className="h-8 text-sm"
              />
              <Input
                value={project.roleTitle ?? ''}
                onChange={(e) => onChangeRoleTitle(e.target.value)}
                placeholder={locale === 'sv' ? 'Roll/titel' : 'Role/title'}
                className="h-8 text-sm"
              />
            </div>
          ) : (
            <>
              <div className="font-semibold text-[var(--geisli-secondary)]">{project.company ?? '—'}</div>
              <div className="text-sm text-gray-600">{project.roleTitle ?? '—'}</div>
            </>
          )}
        </div>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleVisible}
              className={`text-lg transition-colors ${project.visible ? 'text-[var(--geisli-primary)]' : 'text-gray-400'}`}
              title={project.visible ? 'Visible' : 'Hidden'}
            >
              {project.visible ? '👁' : '👁‍🗨'}
            </button>
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:bg-red-50">
              {locale === 'sv' ? 'Ta bort' : 'Remove'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {isEditing ? (
          <div className="grid gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {locale === 'sv' ? 'Highlight-text' : 'Highlight text'}
            </label>
            <Textarea
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              rows={5}
              className="text-sm"
              placeholder={locale === 'sv' ? 'Kort sammanfattning av projektet…' : 'Short project highlight…'}
            />
          </div>
        ) : description ? (
          <p className="text-sm text-gray-700 whitespace-pre-line">{description}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {locale === 'sv' ? 'Ingen highlight-text ännu.' : 'No highlight text yet.'}
          </p>
        )}
      </div>
    </div>
  );
}

