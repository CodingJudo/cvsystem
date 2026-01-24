'use client';

import { useState } from 'react';
import type { Skill } from '@/domain/model/cv';
import { getEffectiveYears, hasOverride } from '@/domain/model/cv';
import { useSkills } from '@/lib/store/cv-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SkillBadgeEditableProps {
  skill: Skill;
  onEdit: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
}

function SkillBadgeEditable({ skill, onEdit, onDelete }: SkillBadgeEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSkill, setEditedSkill] = useState(skill);

  const levelIndicator = skill.level
    ? '●'.repeat(skill.level) + '○'.repeat(5 - skill.level)
    : null;

  const effectiveYears = getEffectiveYears(skill);
  const isOverridden = hasOverride(skill);

  const handleSave = () => {
    // If the user changed the years, set it as an override
    const originalEffective = getEffectiveYears(skill);
    const newYears = editedSkill.years;
    
    if (newYears !== originalEffective && newYears !== null) {
      // User explicitly set a different value - mark as override
      onEdit({
        ...editedSkill,
        overriddenYears: newYears,
      });
    } else {
      onEdit(editedSkill);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSkill(skill);
    setIsEditing(false);
  };

  const handleClearOverride = () => {
    onEdit({
      ...skill,
      overriddenYears: null,
    });
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm dark:bg-zinc-900">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor={`skill-name-${skill.id}`} className="text-xs">
              Name
            </Label>
            <Input
              id={`skill-name-${skill.id}`}
              value={editedSkill.name}
              onChange={(e) =>
                setEditedSkill({ ...editedSkill, name: e.target.value })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="w-20">
            <Label htmlFor={`skill-level-${skill.id}`} className="text-xs">
              Level (1-5)
            </Label>
            <Input
              id={`skill-level-${skill.id}`}
              type="number"
              min={1}
              max={5}
              value={editedSkill.level ?? ''}
              onChange={(e) =>
                setEditedSkill({
                  ...editedSkill,
                  level: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="w-20">
            <Label htmlFor={`skill-years-${skill.id}`} className="text-xs">
              Years
            </Label>
            <Input
              id={`skill-years-${skill.id}`}
              type="number"
              min={0}
              value={editedSkill.years ?? ''}
              onChange={(e) =>
                setEditedSkill({
                  ...editedSkill,
                  years: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Use different colors for overridden skills
  const badgeClasses = isOverridden
    ? "group inline-flex items-center gap-2 rounded-full bg-[var(--geisli-accent)]/10 px-3 py-1 text-sm transition-colors hover:bg-[var(--geisli-accent)]/20 border border-[var(--geisli-accent)]/30"
    : "group inline-flex items-center gap-2 rounded-full bg-[var(--geisli-primary)]/10 px-3 py-1 text-sm transition-colors hover:bg-[var(--geisli-primary)]/20 border border-[var(--geisli-primary)]/20";

  return (
    <div className={badgeClasses}>
      <span className="font-medium text-[var(--geisli-secondary)]">
        {skill.name}
        {isOverridden && <span className="ml-0.5 text-[var(--geisli-accent)]">*</span>}
      </span>
      {levelIndicator && (
        <span className={`text-xs ${isOverridden ? 'text-[var(--geisli-accent)]' : 'text-[var(--geisli-primary)]'}`} title={`Level ${skill.level}/5`}>
          {levelIndicator}
        </span>
      )}
      {effectiveYears !== null && effectiveYears > 0 && (
        <span className={`text-xs ${isOverridden ? 'text-[var(--geisli-accent)]' : 'text-gray-500'}`}>
          {effectiveYears}y
        </span>
      )}
      <div className="ml-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isOverridden && (
          <button
            onClick={handleClearOverride}
            className="rounded p-0.5 text-[var(--geisli-accent)] hover:bg-[var(--geisli-accent)]/20"
            title="Clear manual override"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="rounded p-0.5 text-gray-500 hover:bg-[var(--geisli-primary)]/20 hover:text-[var(--geisli-primary)]"
          title="Edit skill"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
        <button
          onClick={() => onDelete(skill.id)}
          className="rounded p-0.5 text-gray-500 hover:bg-red-100 hover:text-red-600"
          title="Delete skill"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface AddSkillFormProps {
  onAdd: (skill: Omit<Skill, 'id'>) => void;
  onCancel: () => void;
}

function AddSkillForm({ onAdd, onCancel }: AddSkillFormProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<number | null>(null);
  const [years, setYears] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      level,
      years,
    });

    setName('');
    setLevel(null);
    setYears(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <Label htmlFor="new-skill-name" className="text-xs">
          Skill Name
        </Label>
        <Input
          id="new-skill-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., React, Python, Leadership"
          className="h-9"
          autoFocus
        />
      </div>
      <div className="w-24">
        <Label htmlFor="new-skill-level" className="text-xs">
          Level (1-5)
        </Label>
        <Input
          id="new-skill-level"
          type="number"
          min={1}
          max={5}
          value={level ?? ''}
          onChange={(e) =>
            setLevel(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="h-9"
        />
      </div>
      <div className="w-24">
        <Label htmlFor="new-skill-years" className="text-xs">
          Years
        </Label>
        <Input
          id="new-skill-years"
          type="number"
          min={0}
          value={years ?? ''}
          onChange={(e) =>
            setYears(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="h-9"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim()}>
          Add
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface SkillsEditorProps {
  locale: 'sv' | 'en';
}

export function SkillsEditor({ locale }: SkillsEditorProps) {
  const { skills, updateSkill, addSkill, deleteSkill } = useSkills();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = searchQuery
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : skills;

  // Count overridden skills
  const overriddenCount = skills.filter(s => hasOverride(s)).length;

  const handleAddSkill = (skill: Omit<Skill, 'id'>) => {
    addSkill(skill);
    setIsAdding(false);
  };

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-[var(--geisli-secondary)]">
              {locale === 'sv' ? 'Kompetenser' : 'Skills'}
            </CardTitle>
            <CardDescription>
              {skills.length} {locale === 'sv' ? 'kompetenser' : 'skills'}
              {searchQuery && ` (${filteredSkills.length} ${locale === 'sv' ? 'visas' : 'shown'})`}
            </CardDescription>
          </div>
          {!isAdding && (
            <Button 
              size="sm" 
              onClick={() => setIsAdding(true)}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
            >
              + {locale === 'sv' ? 'Lägg till' : 'Add Skill'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <Input
          placeholder={locale === 'sv' ? 'Sök kompetenser...' : 'Search skills...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        {/* Add form */}
        {isAdding && (
          <div className="rounded-lg border border-[var(--geisli-primary)]/20 bg-[var(--geisli-primary)]/5 p-4">
            <AddSkillForm onAdd={handleAddSkill} onCancel={() => setIsAdding(false)} />
          </div>
        )}

        {/* Skills grid */}
        {filteredSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredSkills.map((skill) => (
              <SkillBadgeEditable
                key={skill.id}
                skill={skill}
                onEdit={updateSkill}
                onDelete={deleteSkill}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">
            {searchQuery
              ? locale === 'sv'
                ? 'Inga matchande kompetenser'
                : 'No matching skills'
              : locale === 'sv'
              ? 'Inga kompetenser'
              : 'No skills'}
          </p>
        )}

        {/* Legend */}
        {overriddenCount > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[var(--geisli-primary)]/20 border border-[var(--geisli-primary)]/30"></span>
                <span>{locale === 'sv' ? 'Automatisk erfarenhet' : 'Auto-calculated experience'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[var(--geisli-accent)]/20 border border-[var(--geisli-accent)]/30"></span>
                <span>
                  <span className="text-[var(--geisli-accent)]">*</span> = {locale === 'sv' ? 'manuellt justerad' : 'manually adjusted'} ({overriddenCount})
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
