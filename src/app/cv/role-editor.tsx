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

// Main roles editor
interface RolesEditorProps {
  locale: Locale;
}

export function RolesEditor({ locale }: RolesEditorProps) {
  const { roles } = useRoles();
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const visibleCount = roles.filter((r) => r.visible).length;
  const hiddenCount = roles.length - visibleCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--geisli-secondary)]">
          {locale === 'sv' ? 'Arbetslivserfarenhet' : 'Work Experience'}
        </h3>
        <span className="text-sm text-gray-500">
          {visibleCount} {locale === 'sv' ? 'synliga' : 'visible'}
          {hiddenCount > 0 && (
            <span className="text-[var(--geisli-accent)]">
              {`, ${hiddenCount} ${locale === 'sv' ? 'dolda' : 'hidden'}`}
            </span>
          )}
        </span>
      </div>

      {roles.length === 0 ? (
        <p className="text-gray-400 italic">
          {locale === 'sv' ? 'Ingen arbetslivserfarenhet hittad.' : 'No work experience found.'}
        </p>
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
