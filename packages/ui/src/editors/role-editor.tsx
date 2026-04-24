'use client';

import { useState } from 'react';
import type { Role, Locale } from '@cvsystem/core';
import { useRoles, useCVState, useCVActions } from '../store/cv-store';
import { isAlphabeticalOrder } from '../store/role-helpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { BasicMarkdownText } from '../components/BasicMarkdownText';
import { getBilingualText, formatDate } from '@cvsystem/core';
import { SkillsSection } from '../components/cv/SkillsSection';

// Single role editor card
interface RoleEditorCardProps {
  role: Role;
  locale: Locale;
  isEditing: boolean;
  onToggleEdit: () => void;
}

function RoleEditorCard({ role, locale, isEditing, onToggleEdit }: RoleEditorCardProps) {
  const { updateRole, toggleVisibility, removeRoleSkill, updateRoleSkillLevel, toggleRoleSkillVisibility, reorderRoleSkills, resetRoleSkillsToAlphabetical, addExistingSkillToRole, addRoleSkill } = useRoles();
  const { cv } = useCVState();
  const { toggleBreakBefore } = useCVActions();
  const [isExpanded, setIsExpanded] = useState(false);
  const breakBeforeThis = Boolean(cv?.printBreakBefore?.experience?.includes(role.id));

  const dateRange = [
    formatDate(role.start),
    role.isCurrent ? (locale === 'sv' ? 'Pågående' : 'Present') : formatDate(role.end),
  ].filter(Boolean).join(' – ');

  const description = getBilingualText(role.description, locale);
  const needsExpansion = description.length > 300;

  const handleDescriptionChange = (value: string) => {
    updateRole(role.id, {
      description: { ...role.description, [locale]: value },
    });
  };

  return (
    <Card className={`transition-opacity border-none shadow-lg bg-white ${!role.visible ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleVisibility(role.id)}
              className={`text-lg transition-colors ${role.visible ? 'text-[var(--brand-primary)]' : 'text-gray-400'}`}
              title={role.visible
                ? (locale === 'sv' ? 'Synlig i export' : 'Visible in export')
                : (locale === 'sv' ? 'Dold i export' : 'Hidden in export')
              }
            >
              {role.visible ? '👁' : '👁‍🗨'}
            </button>
            <div>
              <h4 className="font-semibold text-[var(--brand-secondary)]">
                {role.title || (locale === 'sv' ? 'Utan titel' : 'Untitled Role')}
              </h4>
              {role.company && (
                <p className="text-sm text-gray-600">
                  {role.company}
                  {role.location && <span className="text-gray-400"> • {role.location}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={breakBeforeThis}
                onChange={() => toggleBreakBefore('experience', role.id)}
                className="rounded border-gray-300"
              />
              <span>{locale === 'sv' ? 'Ny sida före denna' : 'Start new page before this'}</span>
            </label>
            {dateRange && (
              <span className="text-sm text-[var(--brand-primary)]">{dateRange}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
              className="text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
            >
              {isEditing
                ? (locale === 'sv' ? 'Klar' : 'Done')
                : (locale === 'sv' ? 'Redigera' : 'Edit')
              }
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <Textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={locale === 'sv' ? 'Beskrivning...' : 'Description...'}
              rows={12}
              className="text-sm"
            />
            {/* Date editing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  {locale === 'sv' ? 'Startdatum' : 'Start date'}
                </label>
                <Input
                  type="month"
                  value={(role.start ?? '').slice(0, 7)}
                  onChange={(e) => updateRole(role.id, { start: e.target.value || null })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  {locale === 'sv' ? 'Slutdatum' : 'End date'}
                </label>
                <Input
                  type="month"
                  value={(role.end ?? '').slice(0, 7)}
                  disabled={!!role.isCurrent}
                  onChange={(e) => updateRole(role.id, { end: e.target.value || null })}
                  className="text-sm"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!!role.isCurrent}
                onChange={(e) =>
                  updateRole(role.id, {
                    isCurrent: e.target.checked,
                    end: e.target.checked ? null : role.end,
                  })
                }
                className="rounded border-gray-300"
              />
              {locale === 'sv' ? 'Pågående anställning' : 'Currently working here'}
            </label>
          </>
        ) : (
          description && (
            <div>
              <div className={`text-sm text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_li]:my-0.5 ${!isExpanded && needsExpansion ? 'line-clamp-4' : ''}`}>
                <BasicMarkdownText text={description} className="m-0" />
              </div>
              {needsExpansion && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-sm text-[var(--brand-primary)] hover:underline"
                >
                  {isExpanded
                    ? (locale === 'sv' ? '▲ Visa mindre' : '▲ Show less')
                    : (locale === 'sv' ? '▼ Visa mer' : '▼ Show more')
                  }
                </button>
              )}
            </div>
          )
        )}

        <SkillsSection
          skills={role.skills}
          skillOrder={role.skillOrder}
          locale={locale}
          editable={isEditing}
          canResetOrder={isEditing && role.skills.length > 0 && !isAlphabeticalOrder(role)}
          graphContext={{ type: 'role', roleId: role.id }}
          onRemove={(skillId) => removeRoleSkill(role.id, skillId)}
          onToggleVisibility={(skillId) => toggleRoleSkillVisibility(role.id, skillId)}
          onLevelChange={(skillId, level) => updateRoleSkillLevel(role.id, skillId, level)}
          onReorder={(ids) => reorderRoleSkills(role.id, ids)}
          onResetOrder={() => resetRoleSkillsToAlphabetical(role.id)}
          onAddSkill={(skill) => addExistingSkillToRole(role.id, skill)}
        />
      </CardContent>
    </Card>
  );
}

// Add Role Form
interface AddRoleFormProps {
  locale: Locale;
  onCancel: () => void;
  onAdded: () => void;
}

function AddRoleForm({ locale, onCancel, onAdded }: AddRoleFormProps) {
  const { addRole } = useRoles();
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [descriptionSv, setDescriptionSv] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');

  const t = {
    title: locale === 'sv' ? 'Titel' : 'Title',
    company: locale === 'sv' ? 'Företag' : 'Company',
    location: locale === 'sv' ? 'Plats' : 'Location',
    startDate: locale === 'sv' ? 'Startdatum' : 'Start date',
    endDate: locale === 'sv' ? 'Slutdatum' : 'End date',
    currentRole: locale === 'sv' ? 'Pågående anställning' : 'Currently working here',
    descriptionSv: locale === 'sv' ? 'Beskrivning (svenska)' : 'Description (Swedish)',
    descriptionEn: locale === 'sv' ? 'Beskrivning (engelska)' : 'Description (English)',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    add: locale === 'sv' ? 'Lägg till' : 'Add',
    titlePlaceholder: locale === 'sv' ? 'T.ex. Senior utvecklare' : 'e.g. Senior Developer',
    companyPlaceholder: locale === 'sv' ? 'T.ex. Företag AB' : 'e.g. Company Inc',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addRole({
      title: title.trim(),
      company: company.trim() || null,
      location: location.trim() || null,
      start: startDate || null,
      end: isCurrent ? null : (endDate || null),
      isCurrent,
      description: {
        sv: descriptionSv.trim() || null,
        en: descriptionEn.trim() || null,
      },
      skills: [],
      visible: true,
    });

    onAdded();
  };

  return (
    <Card className="border-[var(--brand-primary)] border-2">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.title} *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.titlePlaceholder}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.company}</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t.companyPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.location}</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Stockholm, Sweden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.startDate}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.endDate}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isCurrent}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="h-4 w-4 text-[var(--brand-primary)]"
            />
            <label htmlFor="isCurrent" className="text-sm text-gray-700">
              {t.currentRole}
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionSv}</label>
            <Textarea
              value={descriptionSv}
              onChange={(e) => setDescriptionSv(e.target.value)}
              rows={6}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionEn}</label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t.add}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main roles editor
interface RolesEditorProps {
  locale: Locale;
}

export function RolesEditor({ locale }: RolesEditorProps) {
  const { roles } = useRoles();
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const visibleCount = roles.filter((r) => r.visible).length;
  const hiddenCount = roles.length - visibleCount;

  const sortedRoles = [...roles].sort((a, b) => {
    const dateA = a.start ? new Date(a.start).getTime() : 0;
    const dateB = b.start ? new Date(b.start).getTime() : 0;
    if (dateA === dateB) {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      const endA = a.end ? new Date(a.end).getTime() : 0;
      const endB = b.end ? new Date(b.end).getTime() : 0;
      return endB - endA;
    }
    return dateB - dateA;
  });

  const t = {
    title: locale === 'sv' ? 'Arbetslivserfarenhet' : 'Work Experience',
    addRole: locale === 'sv' ? '+ Lägg till roll' : '+ Add Role',
    visible: locale === 'sv' ? 'synliga' : 'visible',
    hidden: locale === 'sv' ? 'dolda' : 'hidden',
    noExperience: locale === 'sv' ? 'Ingen arbetslivserfarenhet hittad.' : 'No work experience found.',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--brand-secondary)]">
          {t.title}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {visibleCount} {t.visible}
            {hiddenCount > 0 && (
              <span className="text-[var(--brand-accent)]">
                {`, ${hiddenCount} ${t.hidden}`}
              </span>
            )}
          </span>
          {!showAddForm && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90"
            >
              {t.addRole}
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <AddRoleForm
          locale={locale}
          onCancel={() => setShowAddForm(false)}
          onAdded={() => setShowAddForm(false)}
        />
      )}

      {roles.length === 0 && !showAddForm ? (
        <p className="text-gray-400 italic">{t.noExperience}</p>
      ) : (
        <div className="space-y-4">
          {sortedRoles.map((role) => (
            <RoleEditorCard
              key={role.id}
              role={role}
              locale={locale}
              isEditing={editingRoleId === role.id}
              onToggleEdit={() => setEditingRoleId(editingRoleId === role.id ? null : role.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
