'use client';

import { useState } from 'react';
import type { Role, RoleSkill, Locale, BilingualText, Skill } from '@/domain/model/cv';
import { useRoles, useSkills } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Helper to get text for current locale with fallback
function getBilingualText(text: BilingualText, locale: Locale): string {
  const value = text[locale];
  if (value) return value;
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

// Role skill badge with remove button
interface RoleSkillBadgeProps {
  skill: RoleSkill;
  onRemove: () => void;
  editable?: boolean;
}

function RoleSkillBadge({ skill, onRemove, editable = true }: RoleSkillBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--geisli-primary)]/10 border border-[var(--geisli-primary)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--geisli-secondary)]">
      {skill.name}
      {skill.level && (
        <span className="text-[var(--geisli-primary)]">({skill.level})</span>
      )}
      {editable && (
        <button
          onClick={onRemove}
          className="ml-1 text-[var(--geisli-primary)] hover:text-red-600"
          title="Remove skill"
        >
          ×
        </button>
      )}
    </span>
  );
}

// Form to add a skill to a role
interface AddRoleSkillFormProps {
  roleId: string;
  existingSkillNames: string[];
  locale: Locale;
}

function AddRoleSkillForm({ roleId, existingSkillNames, locale }: AddRoleSkillFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState<number>(3);
  const { addRoleSkill, addExistingSkillToRole } = useRoles();
  const { skills: mainSkills } = useSkills();

  // Filter main skills not already in this role
  const availableSkills = mainSkills.filter(
    (s) => !existingSkillNames.some((name) => name.toLowerCase() === s.name.toLowerCase())
  );

  const handleAddNew = () => {
    if (!skillName.trim()) return;
    addRoleSkill(roleId, { name: skillName.trim(), level: skillLevel, category: 'Techniques' }, true);
    setSkillName('');
    setSkillLevel(3);
    setIsOpen(false);
  };

  const handleAddExisting = (skill: Skill) => {
    addExistingSkillToRole(roleId, skill);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + {locale === 'sv' ? 'Lägg till teknik' : 'Add technology'}
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border bg-white p-3 shadow-sm dark:bg-zinc-900">
      <div className="mb-2 text-sm font-medium">
        {locale === 'sv' ? 'Lägg till från befintliga' : 'Add from existing'}
      </div>
      
      {availableSkills.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {availableSkills.slice(0, 10).map((skill) => (
            <button
              key={skill.id}
              onClick={() => handleAddExisting(skill)}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              {skill.name}
            </button>
          ))}
          {availableSkills.length > 10 && (
            <span className="px-2 py-0.5 text-xs text-zinc-500">
              +{availableSkills.length - 10} {locale === 'sv' ? 'fler' : 'more'}
            </span>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs text-zinc-500">
          {locale === 'sv' ? 'Alla kompetenser redan tillagda' : 'All skills already added'}
        </p>
      )}

      <div className="mb-2 text-sm font-medium">
        {locale === 'sv' ? 'Eller skapa ny' : 'Or create new'}
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          placeholder={locale === 'sv' ? 'Tekniknamn' : 'Technology name'}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
        />
        <select
          value={skillLevel}
          onChange={(e) => setSkillLevel(Number(e.target.value))}
          className="rounded-md border px-2 py-1.5 text-sm"
        >
          <option value={1}>1 - {locale === 'sv' ? 'Nybörjare' : 'Beginner'}</option>
          <option value={2}>2 - {locale === 'sv' ? 'Grundläggande' : 'Basic'}</option>
          <option value={3}>3 - {locale === 'sv' ? 'Medel' : 'Intermediate'}</option>
          <option value={4}>4 - {locale === 'sv' ? 'Avancerad' : 'Advanced'}</option>
          <option value={5}>5 - {locale === 'sv' ? 'Expert' : 'Expert'}</option>
        </select>
        <Button size="sm" onClick={handleAddNew}>
          {locale === 'sv' ? 'Lägg till' : 'Add'}
        </Button>
      </div>

      <div className="mt-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          {locale === 'sv' ? 'Stäng' : 'Close'}
        </Button>
      </div>
    </div>
  );
}

// Single role editor card
interface RoleEditorCardProps {
  role: Role;
  locale: Locale;
  isEditing: boolean;
  onToggleEdit: () => void;
}

function RoleEditorCard({ role, locale, isEditing, onToggleEdit }: RoleEditorCardProps) {
  const { updateRole, toggleVisibility, removeRoleSkill } = useRoles();
  const [isExpanded, setIsExpanded] = useState(false);

  const dateRange = [
    formatDate(role.start),
    role.isCurrent ? (locale === 'sv' ? 'Pågående' : 'Present') : formatDate(role.end),
  ].filter(Boolean).join(' – ');

  const description = getBilingualText(role.description, locale);
  const needsExpansion = description.length > 300;

  const handleDescriptionChange = (value: string) => {
    updateRole(role.id, {
      description: {
        ...role.description,
        [locale]: value,
      },
    });
  };

  return (
    <Card className={`transition-opacity border-none shadow-lg bg-white ${!role.visible ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Visibility toggle */}
            <button
              onClick={() => toggleVisibility(role.id)}
              className={`text-lg transition-colors ${role.visible ? 'text-[var(--geisli-primary)]' : 'text-gray-400'}`}
              title={role.visible 
                ? (locale === 'sv' ? 'Synlig i export' : 'Visible in export')
                : (locale === 'sv' ? 'Dold i export' : 'Hidden in export')
              }
            >
              {role.visible ? '👁' : '👁‍🗨'}
            </button>
            
            <div>
              <h4 className="font-semibold text-[var(--geisli-secondary)]">
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
          
          <div className="flex items-center gap-2">
            {dateRange && (
              <span className="text-sm text-[var(--geisli-primary)]">{dateRange}</span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleEdit}
              className="text-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/10"
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
        {/* Description - MOVED BEFORE TECHNOLOGIES */}
        {isEditing ? (
          <Textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder={locale === 'sv' ? 'Beskrivning...' : 'Description...'}
            rows={6}
            className="text-sm"
          />
        ) : (
          description && (
            <div>
              <p className={`text-sm text-gray-700 whitespace-pre-line ${!isExpanded && needsExpansion ? 'line-clamp-4' : ''}`}>
                {description}
              </p>
              {needsExpansion && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-sm text-[var(--geisli-primary)] hover:underline"
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

        {/* Technologies - MOVED AFTER DESCRIPTION */}
        <div className="pt-2 border-t border-gray-100">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            {locale === 'sv' ? 'Tekniker' : 'Technologies'}
          </div>
          <div className="flex flex-wrap gap-1">
            {role.skills.length > 0 ? (
              role.skills.map((skill) => (
                <RoleSkillBadge
                  key={skill.id}
                  skill={skill}
                  onRemove={() => removeRoleSkill(role.id, skill.id)}
                  editable={isEditing}
                />
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">
                {locale === 'sv' ? 'Inga tekniker tillagda' : 'No technologies added'}
              </span>
            )}
          </div>
          
          {isEditing && (
            <div className="mt-2">
              <AddRoleSkillForm
                roleId={role.id}
                existingSkillNames={role.skills.map((s) => s.name)}
                locale={locale}
              />
            </div>
          )}
        </div>
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
    <Card className="border-[var(--geisli-primary)] border-2">
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
              className="h-4 w-4 text-[var(--geisli-primary)]"
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
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">{t.descriptionEn}</label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button 
              type="submit"
              disabled={!title.trim()}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
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
        <h3 className="text-lg font-semibold text-[var(--geisli-secondary)]">
          {t.title}
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {visibleCount} {t.visible}
            {hiddenCount > 0 && (
              <span className="text-[var(--geisli-accent)]">
                {`, ${hiddenCount} ${t.hidden}`}
              </span>
            )}
          </span>
          {!showAddForm && (
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
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
          {roles.map((role) => (
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
