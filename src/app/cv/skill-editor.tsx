'use client';

import { useState } from 'react';
import type { Skill } from '@/domain/model/cv';
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

  const handleSave = () => {
    onEdit(editedSkill);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSkill(skill);
    setIsEditing(false);
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

  return (
    <div className="group inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
      <span className="font-medium">{skill.name}</span>
      {levelIndicator && (
        <span className="text-xs text-zinc-500" title={`Level ${skill.level}/5`}>
          {levelIndicator}
        </span>
      )}
      {skill.years && skill.years > 0 && (
        <span className="text-xs text-zinc-500">{skill.years}y</span>
      )}
      <div className="ml-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setIsEditing(true)}
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-300 hover:text-zinc-700 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
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
          className="rounded p-0.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-400"
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

  const handleAddSkill = (skill: Omit<Skill, 'id'>) => {
    addSkill(skill);
    setIsAdding(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{locale === 'sv' ? 'Kompetenser' : 'Skills'}</CardTitle>
            <CardDescription>
              {skills.length} {locale === 'sv' ? 'kompetenser' : 'skills'}
              {searchQuery && ` (${filteredSkills.length} shown)`}
            </CardDescription>
          </div>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
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
          <div className="rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900">
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
          <p className="text-zinc-500 italic">
            {searchQuery
              ? locale === 'sv'
                ? 'Inga matchande kompetenser'
                : 'No matching skills'
              : locale === 'sv'
              ? 'Inga kompetenser'
              : 'No skills'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
